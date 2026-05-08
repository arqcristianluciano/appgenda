import type { AppData, Tarea, Proyecto, Evento, Obligacion, Pago, Inversion } from '../types'
import { db, getUserId } from '../services/db'

interface ReconcileResult {
  uploaded: number
  errors: number
}

const idsOf = <T extends { id: string }>(arr: T[] | undefined): Set<string> =>
  new Set((arr ?? []).map(x => x.id))

async function uploadMissing<T extends { id: string }>(
  localItems: T[],
  remoteIds: Set<string>,
  upload: (item: T) => Promise<void>,
): Promise<{ uploaded: number; errors: number }> {
  let uploaded = 0
  let errors = 0
  for (const item of localItems) {
    if (remoteIds.has(item.id)) continue
    try {
      await upload(item)
      uploaded++
    } catch (e) {
      errors++
      console.error('reconcile upload failed', item.id, e)
    }
  }
  return { uploaded, errors }
}

export async function reconcileLocalToRemote(local: AppData): Promise<ReconcileResult> {
  const userId = await getUserId()
  if (!userId) return { uploaded: 0, errors: 0 }

  const [rTasks, rProjects, rEvents, rObligations, rPayments, rInvestments] =
    await Promise.all([
      db.loadTasks(), db.loadProjects(), db.loadEvents(),
      db.loadObligations(), db.loadPayments(), db.loadInvestments(),
    ])

  const ops: Promise<{ uploaded: number; errors: number }>[] = [
    uploadMissing<Proyecto>(local.proyectos ?? [], idsOf(rProjects),
      p => db.upsertProject(p, userId)),
    uploadMissing<Tarea>(local.tareas ?? [], idsOf(rTasks),
      t => db.upsertTask(t, userId)),
    uploadMissing<Evento>(local.eventos ?? [], idsOf(rEvents),
      e => db.upsertEvent(e, userId)),
    uploadMissing<Obligacion>(local.obligaciones ?? [], idsOf(rObligations),
      o => db.upsertObligation(o, userId)),
    uploadMissing<Pago>(local.pagos ?? [], idsOf(rPayments),
      p => db.upsertPayment(p)),
    uploadMissing<Inversion>(local.inversiones ?? [], idsOf(rInvestments),
      i => db.upsertInvestment(i, userId)),
  ]

  const results = await Promise.all(ops)
  return results.reduce<ReconcileResult>(
    (acc, r) => ({ uploaded: acc.uploaded + r.uploaded, errors: acc.errors + r.errors }),
    { uploaded: 0, errors: 0 },
  )
}
