import type { AppData, Tarea, Proyecto, Evento, Obligacion, Pago, Inversion } from '../types'
import { db, getUserId } from '../services/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isUuid = (id: string): boolean => UUID_RE.test(id)

export interface TableResult {
  table: string
  uploaded: number
  errors: number
  skipped: number
}

export interface ReconcileResult {
  uploaded: number
  errors: number
  byTable: TableResult[]
}

const idsOf = <T extends { id: string }>(arr: T[] | undefined): Set<string> =>
  new Set((arr ?? []).map(x => x.id))

async function uploadMissing<T extends { id: string }>(
  table: string,
  localItems: T[],
  remoteIds: Set<string>,
  upload: (item: T) => Promise<void>,
  requireUuid = true,
): Promise<TableResult> {
  let uploaded = 0, errors = 0, skipped = 0
  for (const item of localItems) {
    if (remoteIds.has(item.id)) continue
    if (requireUuid && !isUuid(item.id)) { skipped++; continue }
    try {
      await upload(item)
      uploaded++
    } catch (e) {
      errors++
      console.error(`reconcile ${table} failed`, item.id, e)
    }
  }
  return { table, uploaded, errors, skipped }
}

export async function reconcileLocalToRemote(local: AppData): Promise<ReconcileResult> {
  const userId = await getUserId()
  if (!userId) return { uploaded: 0, errors: 0, byTable: [] }

  const [rTasks, rProjects, rEvents, rObligations, rPayments, rInvestments] =
    await Promise.all([
      db.loadTasks(), db.loadProjects(), db.loadEvents(),
      db.loadObligations(), db.loadPayments(), db.loadInvestments(),
    ])

  const ops: Promise<TableResult>[] = [
    uploadMissing<Proyecto>('projects', local.proyectos ?? [], idsOf(rProjects),
      p => db.upsertProject(p, userId)),
    uploadMissing<Tarea>('tasks', local.tareas ?? [], idsOf(rTasks),
      t => db.upsertTask(t, userId)),
    uploadMissing<Evento>('events', local.eventos ?? [], idsOf(rEvents),
      e => db.upsertEvent(e, userId)),
    uploadMissing<Obligacion>('obligations', local.obligaciones ?? [], idsOf(rObligations),
      o => db.upsertObligation(o, userId)),
    uploadMissing<Pago>('payments', local.pagos ?? [], idsOf(rPayments),
      p => db.upsertPayment(p), false),
    uploadMissing<Inversion>('investments', local.inversiones ?? [], idsOf(rInvestments),
      i => db.upsertInvestment(i, userId)),
  ]

  const byTable = await Promise.all(ops)
  return byTable.reduce<ReconcileResult>(
    (acc, r) => ({
      uploaded: acc.uploaded + r.uploaded,
      errors: acc.errors + r.errors,
      byTable: [...acc.byTable, r],
    }),
    { uploaded: 0, errors: 0, byTable: [] },
  )
}
