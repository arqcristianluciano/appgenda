import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { AppData } from '../types'
import { SK, DEFAULT_DATA } from './defaults'
import { mergeData } from './merge'
import { auth, db as fdb } from './firebase'
import { db, getUserId } from '../services/db'
import { startRealtimeSync } from './realtimeSync'
import { reconcileLocalToRemote } from './reconcile'

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

async function loadUserStorageDoc(key: string): Promise<string | null> {
  if (!fdb || !auth?.currentUser) return null
  try {
    const snap = await getDoc(doc(fdb, 'user_storage', auth.currentUser.uid))
    if (!snap.exists()) return null
    const data = snap.data() as Record<string, unknown>
    return typeof data[key] === 'string' ? (data[key] as string) : null
  } catch { return null }
}

async function saveUserStorageDoc(key: string, value: string): Promise<void> {
  if (!fdb || !auth?.currentUser) return
  await setDoc(doc(fdb, 'user_storage', auth.currentUser.uid), {
    [key]: value, updatedAt: new Date().toISOString(),
  }, { merge: true })
}

async function loadFromOldStorage(): Promise<AppData | null> {
  const local = localStorage.getItem(SK)
  try {
    const remote = await loadUserStorageDoc(SK)
    if (remote) {
      const parsed = JSON.parse(remote)
      if (parsed?.tareas) return mergeData(parsed)
    }
  } catch { /* fall through */ }
  if (local) {
    try {
      const parsed = JSON.parse(local)
      if (parsed?.tareas) return mergeData(parsed)
    } catch { /* empty */ }
  }
  return null
}

function readLocalSnapshot(): AppData | null {
  try {
    const raw = localStorage.getItem(SK)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.tareas ? mergeData(parsed) : null
  } catch { return null }
}

async function loadAndReconcile(): Promise<AppData | null> {
  const previousLocal = readLocalSnapshot()
  let fromTables = await loadFromTables()
  if (!fromTables) return null

  if (previousLocal) {
    const result = await reconcileLocalToRemote(previousLocal)
    if (result.uploaded > 0) {
      const refreshed = await loadFromTables()
      if (refreshed) fromTables = refreshed
      console.info(`reconcile: subidos ${result.uploaded} items locales pendientes`)
    }
  }
  localSave(SK, JSON.stringify(fromTables))
  return fromTables
}

export async function loadData(): Promise<AppData> {
  try {
    const data = await loadAndReconcile()
    if (data) return data
  } catch (e) {
    console.warn('Error loading from tables:', e)
  }

  const fromOld = await loadFromOldStorage()
  if (fromOld) return fromOld

  return { ...DEFAULT_DATA }
}

export async function saveData(data: AppData): Promise<void> {
  localSave(SK, JSON.stringify(data))
  if (!fdb || !auth?.currentUser) return
  setSyncStatus('pending')
  try {
    await saveUserStorageDoc(SK, JSON.stringify(data))
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
    await saveUserStorageDoc(DATOS_SK, JSON.stringify(datos))
  } catch (e) {
    console.error('Error saving datos:', e)
  }
}

export function subscribeToChanges(
  onUpdate: (data: AppData) => void,
): () => void {
  const sub = startRealtimeSync({
    loader: loadFromTables,
    onUpdate,
    onReconnect: async () => {
      const local = readLocalSnapshot()
      if (local) await reconcileLocalToRemote(local)
    },
  })
  return sub.unsubscribe
}
