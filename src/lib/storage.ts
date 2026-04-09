import type { AppData } from '../types'
import { SK, DEFAULT_DATA } from './defaults'
import { mergeData } from './merge'
import { supabase } from './supabase'

// ── SCORE: mide qué tan "llenos" están los datos ──────────────

export function dataScore(d: AppData): number {
  const tareas = d.tareas?.length ?? 0
  const pagosConFecha = d.pagos?.filter(p => p.fecha).length ?? 0
  const invConValor = d.inversiones?.filter(i => i.compra > 0 || i.actual > 0).length ?? 0
  const eventos = d.eventos?.length ?? 0
  return tareas + pagosConFecha + (invConValor * 10) + eventos
}

// ── SYNC STATUS ───────────────────────────────────────────────

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

// ── RETRY QUEUE ───────────────────────────────────────────────

let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryData: { key: string; value: string; ts: number } | null = null

async function flushRetry(): Promise<void> {
  if (!retryData || !supabase) return
  const { key, value, ts } = retryData
  try {
    await supabase.from('agenda_storage')
      .upsert({ key, value, updated_at: new Date(ts).toISOString() })
    retryData = null
    setSyncStatus('synced')
  } catch (_) {
    setSyncStatus('error')
  }
}

function scheduleRetry(ms = 5_000) {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = setTimeout(() => { flushRetry() }, ms)
}

// ── STORAGE HELPERS ──────────────────────────────────────────

const PREFER_LOCAL_MS = 10 * 60 * 1000

async function storageGet(key: string): Promise<string | null> {
  const local = localStorage.getItem(key)
  const localTs = parseInt(localStorage.getItem(`${key}_ts`) || '0', 10)

  if (supabase) {
    try {
      const { data } = await supabase
        .from('agenda_storage')
        .select('value, updated_at')
        .eq('key', key)
        .single()
      if (data?.value) {
        const supaTs = data.updated_at ? new Date(data.updated_at).getTime() : 0
        if (local && localTs >= supaTs) return local
        if (local && Date.now() - localTs < PREFER_LOCAL_MS) return local
        return data.value
      }
    } catch (_) {}
  }
  return local
}

async function storageSet(key: string, value: string): Promise<void> {
  const now = Date.now()
  localStorage.setItem(key, value)
  localStorage.setItem(`${key}_ts`, String(now))
  if (!supabase) return
  setSyncStatus('pending')
  try {
    await supabase.from('agenda_storage')
      .upsert({ key, value, updated_at: new Date(now).toISOString() })
    retryData = null
    setSyncStatus('synced')
  } catch (_) {
    retryData = { key, value, ts: now }
    setSyncStatus('error')
    scheduleRetry()
  }
}

export function localSave(key: string, value: string): void {
  localStorage.setItem(key, value)
  localStorage.setItem(`${key}_ts`, String(Date.now()))
}

// Legacy keys for one-time migration
const LEGACY_KEYS = [
  'agenda-cls-v11', 'agenda-cls-v10', 'agenda-cls-v9', 'agenda-cls-v8',
  'agenda-cls-v7', 'agenda-cls-v6', 'agenda-cls-stable',
  'todo-hoy-stable', 'todo-hoy-v9', 'todo-hoy-v8',
]

export async function loadData(): Promise<AppData> {
  try {
    const raw = await storageGet(SK)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.tareas)) {
        const result = mergeData(parsed)
        lastSavedScore = dataScore(result)
        saveData(result).catch(() => {})
        return result
      }
    }
  } catch (e) {
    console.warn('Error loading main storage:', e)
  }

  let best: AppData | null = null
  let bestScore = -1
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as AppData
        const score = dataScore(parsed as AppData)
        if (score > bestScore) { bestScore = score; best = parsed }
      }
    } catch (_) {}
  }

  const result = best ? mergeData(best) : { ...DEFAULT_DATA }
  lastSavedScore = dataScore(result)
  await saveData(result)
  return result
}

let lastSavedScore = 0

export async function saveData(data: AppData): Promise<void> {
  const score = dataScore(data)
  if (score < lastSavedScore * 0.5 && lastSavedScore > 10) {
    console.warn('saveData blocked: score dropped from', lastSavedScore, 'to', score)
    return
  }
  lastSavedScore = Math.max(lastSavedScore, score)
  try {
    await storageSet(SK, JSON.stringify(data))
  } catch (e) {
    console.error('Error saving data:', e)
  }
}

export function forceSync(data: AppData): void {
  lastSavedScore = dataScore(data)
}

// ── DATOS (Cuentas / Contactos / Accesos Remotos) ────────────────────────────

const DATOS_SK = 'datos-cls-v1'

export interface DatosSnapshot {
  cuentas: unknown[]
  contactos: unknown[]
  accesos: unknown[]
}

export async function loadDatos(): Promise<DatosSnapshot | null> {
  try {
    const raw = await storageGet(DATOS_SK)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as DatosSnapshot
    }
  } catch (_) {}
  return null
}

export async function saveDatos(datos: DatosSnapshot): Promise<void> {
  try {
    await storageSet(DATOS_SK, JSON.stringify(datos))
  } catch (e) {
    console.error('Error saving datos:', e)
  }
}

export function subscribeToChanges(
  onUpdate: (data: AppData) => void,
): () => void {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('agenda-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'agenda_storage', filter: `key=eq.${SK}` },
      (payload) => {
        try {
          const row = payload.new as { value: string }
          if (!row?.value) return
          const parsed = JSON.parse(row.value)
          if (parsed && Array.isArray(parsed.tareas)) onUpdate(mergeData(parsed))
        } catch (_) {}
      },
    )
    .subscribe()

  const sb = supabase
  const poll = setInterval(async () => {
    if (document.visibilityState === 'hidden') return
    try {
      const localTs = parseInt(localStorage.getItem(`${SK}_ts`) || '0', 10)
      const { data } = await sb
        .from('agenda_storage')
        .select('value, updated_at')
        .eq('key', SK)
        .single()
      if (!data?.value) return
      const remoteTs = data.updated_at ? new Date(data.updated_at).getTime() : 0
      if (remoteTs <= localTs) return
      const parsed = JSON.parse(data.value)
      if (parsed && Array.isArray(parsed.tareas)) onUpdate(mergeData(parsed))
    } catch (_) {}
  }, 10_000)

  return () => {
    channel.unsubscribe()
    clearInterval(poll)
  }
}
