import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AppData } from '../types'
import { supabase } from './supabase'

const TABLES = [
  'tasks', 'events', 'projects',
  'obligations', 'payments', 'investments',
  'bank_accounts', 'contacts', 'remote_accesses',
  'calendar_configs',
] as const

type Reload = () => void
type Loader = () => Promise<AppData | null>

function buildChannel(reload: Reload): RealtimeChannel | null {
  if (!supabase) return null
  let ch = supabase.channel(`agenda-sync-${Date.now()}`)
  for (const t of TABLES) {
    ch = ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: t },
      reload,
    )
  }
  return ch
}

export interface SyncSubscription {
  unsubscribe: () => void
  refreshNow: () => void
}

export function startRealtimeSync(
  loader: Loader,
  onUpdate: (data: AppData) => void,
): SyncSubscription {
  if (!supabase) return { unsubscribe: () => {}, refreshNow: () => {} }

  let debounce: ReturnType<typeof setTimeout> | null = null
  let channel: RealtimeChannel | null = null
  let disposed = false

  const refresh = (): void => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      loader().then(d => { if (d && !disposed) onUpdate(d) }).catch(() => {})
    }, 250)
  }

  const reconnect = (): void => {
    if (disposed) return
    if (channel) { try { channel.unsubscribe() } catch { /* empty */ } }
    channel = buildChannel(refresh)
    channel?.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setTimeout(reconnect, 2000)
      }
    })
    refresh()
  }

  const onVisible = (): void => {
    if (document.visibilityState === 'visible') reconnect()
  }
  const onOnline = (): void => reconnect()

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('focus', onVisible)

  reconnect()

  return {
    refreshNow: refresh,
    unsubscribe: () => {
      disposed = true
      if (channel) { try { channel.unsubscribe() } catch { /* empty */ } }
      if (debounce) clearTimeout(debounce)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onVisible)
    },
  }
}
