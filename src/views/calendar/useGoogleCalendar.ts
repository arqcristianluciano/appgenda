import { useState, useCallback, useRef } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, fetchUserInfo,
  getAccountEmails, getTokenForEmail, storeAccount,
} from '../../services/googleCalendar'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateRange() {
  const now = new Date()
  return {
    start: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: toISO(new Date(now.getFullYear(), now.getMonth() + 6, 0)),
  }
}

export function useGoogleCalendar() {
  const { sources, addSource, removeSource, appendExternalEvents, clearExternalEvents } = useCalendarStore()
  const { updateCalendarConfig } = useStore()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expiredEmails, setExpiredEmails] = useState(new Set<string>())
  const loadedRef = useRef(new Set<string>())
  const expiredRef = useRef(new Set<string>())

  const gconfigured = isGoogleConfigured()

  const loadEvents = useCallback(async (email: string, token: string) => {
    const cals = await fetchCalendars(token)
    const { start, end } = dateRange()
    const allEvts: ReturnType<typeof toLocalEvento>[] = []
    for (const cal of cals) {
      const sourceId = `gcal_${email}_${cal.id}`
      addSource({ id: sourceId, name: cal.summary, type: 'google', color: cal.backgroundColor || '#4285F4', enabled: true, accountEmail: email })
      const evts = await fetchEvents(token, cal.id, start, end)
      allEvts.push(...evts.map(e => toLocalEvento(e, cal.backgroundColor || '#4285F4', sourceId)))
    }
    appendExternalEvents(allEvts)
    loadedRef.current.add(email)
  }, [addSource, appendExternalEvents])

  const persistToken = useCallback((email: string, token: string) => {
    storeAccount(email, token)
    const cloudTokens = useStore.getState().data.calendarConfig?.googleTokens ?? {}
    if (cloudTokens[email] !== token) {
      updateCalendarConfig({ googleTokens: { ...cloudTokens, [email]: token } })
    }
  }, [updateCalendarConfig])

  const tryLoad = useCallback(async (email: string) => {
    const localToken = getTokenForEmail(email)
    const cloudToken = useStore.getState().data.calendarConfig?.googleTokens?.[email]
    for (const token of [localToken, cloudToken].filter(Boolean) as string[]) {
      try {
        await loadEvents(email, token)
        persistToken(email, token)
        return
      } catch { /* token inválido */ }
    }
    expiredRef.current.add(email)
  }, [loadEvents, persistToken])

  const flushExpired = useCallback(() => {
    if (expiredRef.current.size > 0) setExpiredEmails(new Set(expiredRef.current))
  }, [])

  const clearExpired = useCallback((email: string) => {
    expiredRef.current.delete(email)
    setExpiredEmails(new Set(expiredRef.current))
  }, [])

  const connect = () => {
    if (!gconfigured || busy) return
    setBusy(true); setError('')
    startGoogleAuth()
      .then(token => fetchUserInfo(token).then(({ email }) => {
        const cfg = useStore.getState().data.calendarConfig ?? {}
        updateCalendarConfig({
          googleEmails: (cfg.googleEmails ?? []).includes(email) ? cfg.googleEmails! : [...(cfg.googleEmails ?? []), email],
          googleTokens: { ...(cfg.googleTokens ?? {}), [email]: token },
        })
        storeAccount(email, token)
        clearExpired(email)
        return loadEvents(email, token).then(() => { loadedRef.current.add(email) })
      }))
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false))
  }

  const reconnect = (email: string) => {
    if (!gconfigured || busy) return
    setBusy(true); setError('')
    startGoogleAuth()
      .then(token => {
        const cfg = useStore.getState().data.calendarConfig ?? {}
        updateCalendarConfig({ googleTokens: { ...(cfg.googleTokens ?? {}), [email]: token } })
        storeAccount(email, token)
        clearExpired(email)
        return loadEvents(email, token).then(() => { loadedRef.current.add(email) })
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false))
  }

  const disconnect = async (email: string) => {
    signOut(email)
    loadedRef.current.delete(email)
    sources.filter(s => s.accountEmail === email).forEach(s => removeSource(s.id))
    const cfg = useStore.getState().data.calendarConfig ?? {}
    const tokens = { ...(cfg.googleTokens ?? {}) }; delete tokens[email]
    updateCalendarConfig({ googleEmails: (cfg.googleEmails ?? []).filter(e => e !== email), googleTokens: tokens })
    clearExternalEvents('google')
    for (const e of getAccountEmails()) await tryLoad(e)
  }

  return { busy, error, expiredEmails, gconfigured, loadedRef, tryLoad, flushExpired, connect, reconnect, disconnect }
}
