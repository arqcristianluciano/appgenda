import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore'
import type { AppData } from '../types'
import { auth, db as fdb } from './firebase'

const TABLES = [
  'tasks', 'events', 'projects',
  'obligations', 'payments', 'investments',
  'bank_accounts', 'contacts', 'remote_accesses',
] as const

type Reload = () => void
type Loader = () => Promise<AppData | null>

function buildListeners(reload: Reload, uid: string): Unsubscribe[] {
  if (!fdb) return []
  const unsubs: Unsubscribe[] = []
  for (const t of TABLES) {
    const q = query(collection(fdb, t), where('ownerUid', '==', uid))
    unsubs.push(onSnapshot(q, reload, err => {
      console.warn(`realtime ${t}:`, err.message)
    }))
  }
  // calendar_configs is single doc per user — handled separately if needed
  return unsubs
}

export interface SyncSubscription {
  unsubscribe: () => void
  refreshNow: () => void
}

export interface SyncOptions {
  loader: Loader
  onUpdate: (data: AppData) => void
  onReconnect?: () => Promise<void> | void
}

export function startRealtimeSync(opts: SyncOptions): SyncSubscription {
  if (!fdb || !auth?.currentUser) {
    return { unsubscribe: () => {}, refreshNow: () => {} }
  }
  const { loader, onUpdate, onReconnect } = opts
  const uid = auth.currentUser.uid

  let debounce: ReturnType<typeof setTimeout> | null = null
  let unsubs: Unsubscribe[] = []
  let disposed = false

  const refresh = (): void => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      loader().then(d => { if (d && !disposed) onUpdate(d) }).catch(() => {})
    }, 250)
  }

  const reconnect = async (): Promise<void> => {
    if (disposed) return
    unsubs.forEach(u => { try { u() } catch { /* empty */ } })
    unsubs = buildListeners(refresh, uid)
    if (onReconnect) {
      try { await onReconnect() } catch { /* empty */ }
    }
    refresh()
  }

  const onVisible = (): void => {
    if (document.visibilityState === 'visible') void reconnect()
  }
  const onOnline = (): void => { void reconnect() }

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('focus', onVisible)

  void reconnect()

  return {
    refreshNow: refresh,
    unsubscribe: () => {
      disposed = true
      unsubs.forEach(u => { try { u() } catch { /* empty */ } })
      if (debounce) clearTimeout(debounce)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onVisible)
    },
  }
}
