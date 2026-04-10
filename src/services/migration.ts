import { supabase } from '../lib/supabase'
import { db } from './db'
import type { AppData, CuentaBancaria, Contacto, AccesoRemoto } from '../types'

const MIGRATION_FLAG = 'appgenda_migrated_v1'

export async function needsMigration(userId: string): Promise<boolean> {
  if (localStorage.getItem(`${MIGRATION_FLAG}_${userId}`)) return false
  if (!supabase) return false
  const { count } = await supabase
    .from('tasks').select('id', { count: 'exact', head: true })
  return (count ?? 0) === 0
}

export async function migrateOldData(userId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const appData = await loadOldAppData()
    const datos = await loadOldDatos()
    if (!appData && !datos) { markMigrated(userId); return false }

    if (appData) {
      for (const p of appData.proyectos) {
        const id = p.id.startsWith('p') || p.id.length < 10 ? crypto.randomUUID() : p.id
        await db.upsertProject({ ...p, id }, userId)
        updateProjectRef(appData, p.id, id)
      }

      for (const t of appData.tareas) {
        const id = crypto.randomUUID()
        await db.upsertTask({ ...t, id, proj: t.proj || null }, userId)
      }

      for (const o of appData.obligaciones) {
        const oldId = o.id
        const id = crypto.randomUUID()
        await db.upsertObligation({ ...o, id }, userId)
        for (const p of appData.pagos.filter(p => p.oblId === oldId)) {
          await db.upsertPayment({ ...p, id: crypto.randomUUID(), oblId: id })
        }
      }

      for (const e of appData.eventos) {
        const id = e.id.length < 10 ? crypto.randomUUID() : e.id
        await db.upsertEvent({ ...e, id }, userId)
      }

      for (const i of appData.inversiones) {
        const id = crypto.randomUUID()
        await db.upsertInvestment({ ...i, id }, userId)
      }

      if (appData.calendarConfig) {
        await db.saveCalendarConfig(userId, appData.calendarConfig)
      }
    }

    if (datos) {
      for (const c of (datos.cuentas || []) as CuentaBancaria[]) {
        await db.upsertBankAccount({ ...c, id: crypto.randomUUID() }, userId)
      }
      for (const c of (datos.contactos || []) as Contacto[]) {
        await db.upsertContact({ ...c, id: crypto.randomUUID() }, userId)
      }
      for (const a of (datos.accesos || []) as AccesoRemoto[]) {
        await db.upsertAccess({ ...a, id: crypto.randomUUID() }, userId)
      }
    }

    markMigrated(userId)
    return true
  } catch (e) {
    console.error('Migration failed:', e)
    return false
  }
}

function markMigrated(userId: string) {
  localStorage.setItem(`${MIGRATION_FLAG}_${userId}`, Date.now().toString())
}

function updateProjectRef(data: AppData, oldId: string, newId: string) {
  if (oldId === newId) return
  data.tareas.forEach(t => { if (t.proj === oldId) t.proj = newId })
  data.eventos.forEach(e => { if (e.proj === oldId) e.proj = newId })
}

async function loadOldAppData(): Promise<AppData | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('agenda_storage').select('value').eq('key', 'agenda-cls-stable').single()
  if (!data?.value) return null
  try {
    const parsed = JSON.parse(data.value)
    return parsed?.tareas ? parsed : null
  } catch { return null }
}

async function loadOldDatos(): Promise<{ cuentas: unknown[]; contactos: unknown[]; accesos: unknown[] } | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('agenda_storage').select('value').eq('key', 'datos-cls-v1').single()
  if (!data?.value) return null
  try { return JSON.parse(data.value) } catch { return null }
}
