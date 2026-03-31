import { supabase } from './supabase'

export async function syncedGet(key: string): Promise<string | null> {
  if (supabase) {
    const { data } = await supabase
      .from('agenda_storage')
      .select('value')
      .eq('key', key)
      .single()
    if (data?.value != null) {
      localStorage.setItem(key, data.value)
      return data.value
    }
    // Auto-migrate: localStorage has it but Supabase doesn't
    const local = localStorage.getItem(key)
    if (local != null) {
      supabase
        .from('agenda_storage')
        .upsert({ key, value: local, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn(`[syncedStorage] migrate ${key}:`, error) })
      return local
    }
    return null
  }
  return localStorage.getItem(key)
}

export async function syncedSet(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value)
  if (supabase) {
    await supabase
      .from('agenda_storage')
      .upsert({ key, value, updated_at: new Date().toISOString() })
  }
}

export async function syncedRemove(key: string): Promise<void> {
  localStorage.removeItem(key)
  if (supabase) {
    await supabase
      .from('agenda_storage')
      .delete()
      .eq('key', key)
  }
}
