import { createClient } from '@supabase/supabase-js'
import type { AppData } from '../types'
import { SK, DEFAULT_DATA } from './defaults'
import { mergeData } from './merge'

// ============================================================
// SUPABASE — Configurar con tus credenciales
// Si no tienes Supabase, la app usa localStorage automáticamente
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// ── STORAGE HELPERS ──────────────────────────────────────────
async function storageGet(key: string): Promise<string | null> {
  if (supabase) {
    // Supabase storage (tabla: agenda_storage)
    const { data } = await supabase
      .from('agenda_storage')
      .select('value')
      .eq('key', key)
      .single()
    return data?.value ?? null
  }
  return localStorage.getItem(key)
}

async function storageSet(key: string, value: string): Promise<void> {
  if (supabase) {
    await supabase
      .from('agenda_storage')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    return
  }
  localStorage.setItem(key, value)
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
      if ((parsed.tareas ?? []).length > 0) {
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
