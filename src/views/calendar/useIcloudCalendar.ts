import { useState, useCallback } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import type { Evento, IcloudCalDAVConfig } from '../../types'
import { saveData } from '../../lib/storage'
import { loadIcloudEvents } from '../../services/icloudCalendar'
import { fetchCalendarEvents, discoverPrincipal, discoverCalendars } from '../../services/icloudCalDAV'

function getIcloudAuth(): IcloudCalDAVConfig | null {
  const storeAuth = useStore.getState().data.calendarConfig?.icloudAuth
  if (storeAuth?.appleId) return storeAuth
  try {
    const raw = localStorage.getItem('icloud_caldav_auth')
    if (raw) { const p = JSON.parse(raw); if (p?.appleId) return p }
  } catch { /* ignore */ }
  return null
}

export function useIcloudCalendar() {
  const { sources, addSource, removeSource, mergeExternalEvents, clearExternalEvents } = useCalendarStore()
  const { updateCalendarConfig } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    }
  }, [addSource, mergeExternalEvents, updateCalendarConfig])

  const refresh = async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      sources.filter(s => s.type === 'icloud').forEach(s => removeSource(s.id))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally { setBusy(false) }
  }

  const disconnect = async () => {
    updateCalendarConfig({ icloudAuth: null, icloudWebcal: null })
    ;['icloud_caldav_auth', 'icloud_cal_url', 'icloud_cal_color', 'icloud_cal_name'].forEach(k => localStorage.removeItem(k))
    await saveData(useStore.getState().data)
    sources.filter(c => c.type === 'icloud').forEach(c => removeSource(c.id))
    clearExternalEvents('icloud')
  }

  return { busy, error, load, refresh, disconnect }
}
