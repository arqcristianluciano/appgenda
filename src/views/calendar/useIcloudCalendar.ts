import { useState, useCallback } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import type { Evento, IcloudCalDAVConfig } from '../../types'
import { saveData } from '../../lib/storage'
import { loadIcloudEvents } from '../../services/icloudCalendar'
import { fetchCalendarEvents, discoverPrincipal, discoverCalendars } from '../../services/icloudCalDAV'

const AUTH_KEY = 'icloud_caldav_auth'
const SYNC_FRESH_MS = 5 * 60 * 1000

function getIcloudAuth(): IcloudCalDAVConfig | null {
  const storeAuth = useStore.getState().data.calendarConfig?.icloudAuth
  if (storeAuth?.appleId) return storeAuth
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) { const p = JSON.parse(raw); if (p?.appleId) return p }
  } catch { /* ignore */ }
  return null
}

function isAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes('Credenciales incorrectas') || err.message.includes('credenciales')
}

export function useIcloudCalendar() {
  const {
    sources, addSource, removeSource, mergeExternalEvents, clearExternalEvents,
    markSynced, clearLastSync,
  } = useCalendarStore()
  const { updateCalendarConfig } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsReauth, setNeedsReauth] = useState(false)

  const isFresh = useCallback(() => {
    const ts = useCalendarStore.getState().lastSync.icloud
    return !!ts && Date.now() - ts < SYNC_FRESH_MS
  }, [])

  const load = useCallback(async () => {
    setError('')
    const auth = getIcloudAuth()
    if (auth) {
      if (!useStore.getState().data.calendarConfig?.icloudAuth) {
        updateCalendarConfig({ icloudAuth: auth })
        await saveData(useStore.getState().data)
      }
      let cals = auth.calendars
      if (!cals?.length) {
        const principal = await discoverPrincipal(auth.appleId, auth.password)
        cals = await discoverCalendars(principal, auth.appleId, auth.password)
        updateCalendarConfig({ icloudAuth: { ...auth, calendars: cals } })
        await saveData(useStore.getState().data)
      }
      const allEvts: Evento[] = []
      for (const cal of cals) {
        const sourceId = `icloud_${encodeURIComponent(cal.url)}`
        addSource({ id: sourceId, name: cal.name, type: 'icloud', color: cal.color, enabled: true })
        allEvts.push(...await fetchCalendarEvents(cal, auth.appleId, auth.password))
      }
      mergeExternalEvents(allEvts, 'icloud')
      markSynced('icloud')
      setNeedsReauth(false)
      return
    }

    let webcal = useStore.getState().data.calendarConfig?.icloudWebcal
    if (!webcal) {
      const url = localStorage.getItem('icloud_cal_url')
      if (url) {
        webcal = { url, color: localStorage.getItem('icloud_cal_color') || '#A855F7', name: localStorage.getItem('icloud_cal_name') || 'iCloud' }
        updateCalendarConfig({ icloudWebcal: webcal })
        await saveData(useStore.getState().data)
      }
    }
    if (webcal) {
      addSource({ id: 'icloud_main', name: webcal.name, type: 'icloud', color: webcal.color, enabled: true })
      mergeExternalEvents(await loadIcloudEvents(webcal.url, webcal.color), 'icloud')
      markSynced('icloud')
    }
  }, [addSource, mergeExternalEvents, updateCalendarConfig, markSynced])

  // Carga silenciosa en background: no muestra spinner, no propaga errores de auth a la UI.
  // Si la última sync es fresca, no hace nada. Útil al montar la vista.
  const loadSilent = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force && isFresh()) return
    try { await load() } catch { /* silencioso — los eventos cacheados siguen visibles */ }
  }, [load, isFresh])

  const refresh = async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar'
      setError(msg)
      if (isAuthError(err)) setNeedsReauth(true)
    } finally { setBusy(false) }
  }

  const reconnect = async (newPassword: string) => {
    const auth = getIcloudAuth()
    if (!auth) return
    setBusy(true); setError('')
    try {
      const updated = { ...auth, password: newPassword }
      await discoverPrincipal(updated.appleId, newPassword)
      updateCalendarConfig({ icloudAuth: updated })
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      await saveData(useStore.getState().data)
      setNeedsReauth(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reconectar')
    } finally { setBusy(false) }
  }

  const disconnect = async () => {
    updateCalendarConfig({ icloudAuth: null, icloudWebcal: null })
    ;[AUTH_KEY, 'icloud_cal_url', 'icloud_cal_color', 'icloud_cal_name'].forEach(k => localStorage.removeItem(k))
    await saveData(useStore.getState().data)
    sources.filter(c => c.type === 'icloud').forEach(c => removeSource(c.id))
    clearExternalEvents('icloud')
    clearLastSync('icloud')
    setNeedsReauth(false)
  }

  return { busy, error, needsReauth, load, loadSilent, refresh, reconnect, disconnect }
}
