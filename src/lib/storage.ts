import type { AppData } from '../types'
import { SK, DEFAULT_DATA } from './defaults'
import { mergeData } from './merge'
import { supabase } from './supabase'
import { db, getUserId } from '../services/db'
import { needsMigration, migrateOldData } from '../services/migration'
import { startRealtimeSync } from './realtimeSync'

export type SyncStatus = 'synced' | 'pending' | 'error'
type SyncListener = (s: SyncStatus) => void
const syncListeners = new Set<SyncListener>()
let currentSyncStatus: SyncStatus = 'synced'

function setSyncStatus(s: SyncStatus) {
  currentSyncStatus = s
  syncListeners.forEach(fn => fn(s))
}

export function getSyncStatus(): SyncStatus { return currentSyncStatus }
export function onSyncChange(fn: SyncListener): () => void {
  syncListeners.add(fn)
  return () => { syncListeners.delete(fn) }
}

export function localSave(key: string, value: string): void {
  localStorage.setItem(key, value)
  localStorage.setItem(`${key}_ts`, String(Date.now()))
}

export async function loadFromTables(): Promise<AppData | null> {
  const userId = await getUserId()
  if (!userId) return null

  if (await needsMigration(userId)) {
    await migrateOldData(userId)
  }

  const [tareas, proyectos, eventos, obligaciones, pagos, inversiones, calendarConfig] =
    await Promise.all([
      db.loadTasks(), db.loadProjects(), db.loadEvents(),
      db.loadObligations(), db.loadPayments(), db.loadInvestments(),
      db.loadCalendarConfig(),
    ])

  if (tareas.length === 0 && proyectos.length === 0 && eventos.length === 0) return null

  return {
    nextId: 0, nextPagoId: 0, nextInvId: 0,
    deletedTaskIds: [],
    proyectos, tareas, eventos, obligaciones, pagos, inversiones,
    calendarConfig,
  }
}

async function loadFromOldStorage(): Promise<AppData | null> {
  const local = localStorage.getItem(SK)
  if (supabase) {
    try {
      const { data } = await supabase
        .from('agenda_storage').select('value').eq('key', SK).single()
      if (data?.value) {
        const parsed = JSON.parse(data.value)
        if (parsed?.tareas) return mergeData(parsed)
      }
    } catch { /* fall through */ }
  }
  if (local) {
    try {
      const parsed = JSON.parse(local)
      if (parsed?.tareas) return mergeData(parsed)
    } catch { /* empty */ }
  }
  return null
}

export async function loadData(): Promise<AppData> {
  try {
    const fromTables = await loadFromTables()
    if (fromTables) {
      localSave(SK, JSON.stringify(fromTables))
      return fromTables
    }
  } catch (e) {
    console.warn('Error loading from tables:', e)
  }

  const fromOld = await loadFromOldStorage()
  if (fromOld) return fromOld

  return { ...DEFAULT_DATA }
}

export async function saveData(data: AppData): Promise<void> {
  localSave(SK, JSON.stringify(data))
  if (!supabase) return
  setSyncStatus('pending')
  try {
    await supabase.from('agenda_storage')
      .upsert({ key: SK, value: JSON.stringify(data), updated_at: new Date().toISOString() })
    setSyncStatus('synced')
  } catch {
    setSyncStatus('error')
  }
}

export function forceSync(data: AppData): void {
  localSave(SK, JSON.stringify(data))
}

const DATOS_SK = 'datos-cls-v1'

export interface DatosSnapshot {
  cuentas: unknown[]
  contactos: unknown[]
  accesos: unknown[]
}

export async function loadDatos(): Promise<DatosSnapshot | null> {
  try {
    const raw = localStorage.getItem(DATOS_SK)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as DatosSnapshot
    }
  } catch { /* empty */ }
  return null
}

export async function saveDatos(datos: DatosSnapshot): Promise<void> {
  try {
    localStorage.setItem(DATOS_SK, JSON.stringify(datos))
    if (supabase) {
      await supabase.from('agenda_storage')
        .upsert({ key: DATOS_SK, value: JSON.stringify(datos), updated_at: new Date().toISOString() })
    }
  } catch (e) {
    console.error('Error saving datos:', e)
  }
}

export function subscribeToChanges(
  onUpdate: (data: AppData) => void,
): () => void {
  const sub = startRealtimeSync(loadFromTables, onUpdate)
  return sub.unsubscribe
}
