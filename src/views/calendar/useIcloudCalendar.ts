import { useCallback } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import { useCalendarSyncStore } from '../../store/useCalendarSyncStore'
import type { Evento, IcloudCalDAVConfig } from '../../types'
import { saveData } from '../../lib/storage'
import { loadIcloudEvents } from '../../services/icloudCalendar'
import { fetchCalendarEvents, discoverPrincipal, discoverCalendars } from '../../services/icloudCalDAV'

const AUTH_KEY = 'icloud_caldav_auth'
const REAUTH_FAIL_THRESHOLD = 2

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
  const { sources, addSource, removeSource, mergeExternalEvents, clearExternalEvents } = useCalendarStore()
  const { updateCalendarConfig } = useStore()
  const sync = useCalendarSyncStore()

  const loadAuth = async (auth: IcloudCalDAVConfig) => {
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
    useCalendarSyncStore.getState().setIcloudNeedsReauth(false)
    useCalendarSyncStore.getState().resetIcloudFail()
  }

  const loadWebcal = async () => {
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
    }
  }

  const load = useCallback(async () => {
    sync.setIcloudError('')
    const auth = getIcloudAuth()
    if (auth) return loadAuth(auth)
    await loadWebcal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = async () => {
    if (sync.icloudBusy) return
    sync.setIcloudBusy(true); sync.setIcloudError('')
    try {
      sources.filter(s => s.type === 'icloud').forEach(s => removeSource(s.id))
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar'
      sync.setIcloudError(msg)
      if (isAuthError(err)) {
        const fails = useCalendarSyncStore.getState().bumpIcloudFail()
        if (fails >= REAUTH_FAIL_THRESHOLD) sync.setIcloudNeedsReauth(true)
      } else {
        useCalendarSyncStore.getState().resetIcloudFail()
      }
    } finally { sync.setIcloudBusy(false) }
  }

  const reconnect = async (newPassword: string) => {
    const auth = getIcloudAuth()
    if (!auth) return
    sync.setIcloudBusy(true); sync.setIcloudError('')
    try {
      const updated = { ...auth, password: newPassword }
      await discoverPrincipal(updated.appleId, newPassword)
      updateCalendarConfig({ icloudAuth: updated })
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      await saveData(useStore.getState().data)
      sources.filter(s => s.type === 'icloud').forEach(s => removeSource(s.id))
      sync.setIcloudNeedsReauth(false)
      useCalendarSyncStore.getState().resetIcloudFail()
      await load()
    } catch (err) {
      sync.setIcloudError(err instanceof Error ? err.message : 'Error al reconectar')
    } finally { sync.setIcloudBusy(false) }
  }

  const disconnect = async () => {
    updateCalendarConfig({ icloudAuth: null, icloudWebcal: null })
    ;[AUTH_KEY, 'icloud_cal_url', 'icloud_cal_color', 'icloud_cal_name'].forEach(k => localStorage.removeItem(k))
    await saveData(useStore.getState().data)
    sources.filter(c => c.type === 'icloud').forEach(c => removeSource(c.id))
    clearExternalEvents('icloud')
    sync.setIcloudNeedsReauth(false)
    useCalendarSyncStore.getState().resetIcloudFail()
  }

  return {
    busy: sync.icloudBusy, error: sync.icloudError, needsReauth: sync.icloudNeedsReauth,
    load, refresh, reconnect, disconnect,
  }
}
