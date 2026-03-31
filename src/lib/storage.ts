import type { AppData } from '../types'
import { SK, DEFAULT_DATA } from './defaults'
import { mergeData } from './merge'
import { supabase } from './supabase'

// ── STORAGE HELPERS ──────────────────────────────────────────

// Compara timestamps de localStorage y Supabase, devuelve el más reciente
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
  if (supabase) {
    await supabase
      .from('agenda_storage')
      .upsert({ key, value, updated_at: new Date(now).toISOString() })
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
  // 1. Try stable key first
  try {
    const raw = await storageGet(SK)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.tareas)) {
        return mergeData(parsed)
      }
    }
  } catch (e) {
    console.warn('Error loading main storage:', e)
  }

  // 2. Migrate from legacy keys (only on first load)
  let best: AppData | null = null
  let bestScore = -1

  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as AppData
        const score = (parsed.tareas?.length ?? 0) +
          (parsed.pagos?.filter(p => p.fecha).length ?? 0)
        if (score > bestScore) {
          bestScore = score
          best = parsed
        }
      }
    } catch (_) {}
  }

  const result = best ? mergeData(best) : { ...DEFAULT_DATA }
  await saveData(result)
  return result
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await storageSet(SK, JSON.stringify(data))
  } catch (e) {
    console.error('Error saving data:', e)
  }
}
