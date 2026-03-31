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
