import { useCallback } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import { useCalendarSyncStore } from '../../store/useCalendarSyncStore'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, getAccountEmails,
  getValidToken, hasRefreshToken,
} from '../../services/googleCalendar'
import { saveTokenData } from '../../services/googleTokens'

const REAUTH_FAIL_THRESHOLD = 2

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
  const sync = useCalendarSyncStore()

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
    useCalendarSyncStore.getState().markGoogleLoaded(email)
    useCalendarSyncStore.getState().resetGoogleFail(email)
  }, [addSource, appendExternalEvents])

  const tryLoad = useCallback(async (email: string) => {
    if (hasRefreshToken(email)) {
      try {
        const token = await getValidToken(email)
        await loadEvents(email, token)
        return
      } catch { /* refresh falló */ }
    }
    const cloudToken = useStore.getState().data.calendarConfig?.googleTokens?.[email]
    if (cloudToken) {
      try {
        await loadEvents(email, cloudToken)
        saveTokenData(email, cloudToken, undefined, 1800)
        return
      } catch { /* expirado */ }
    }
    const fails = useCalendarSyncStore.getState().bumpGoogleFail(email)
    if (fails >= REAUTH_FAIL_THRESHOLD) {
      useCalendarSyncStore.getState().setGoogleNeedsAuth(prev => new Set([...prev, email]))
    }
  }, [loadEvents])

  const markAuthenticated = (email: string) => {
    useCalendarSyncStore.getState().setGoogleNeedsAuth(prev => {
      const n = new Set(prev); n.delete(email); return n
    })
    useCalendarSyncStore.getState().resetGoogleFail(email)
  }

  const connect = () => {
    if (!gconfigured || sync.googleBusy) return
    sync.setGoogleBusy(true); sync.setGoogleError('')
    startGoogleAuth()
      .then(({ email, accessToken }) => {
        const cfg = useStore.getState().data.calendarConfig ?? {}
        updateCalendarConfig({
          googleEmails: (cfg.googleEmails ?? []).includes(email)
            ? cfg.googleEmails!
            : [...(cfg.googleEmails ?? []), email],
        })
        markAuthenticated(email)
        return loadEvents(email, accessToken)
      })
      .catch(err => sync.setGoogleError(err instanceof Error ? err.message : String(err)))
      .finally(() => sync.setGoogleBusy(false))
  }

  const reconnect = (email: string) => {
    if (!gconfigured || sync.googleBusy) return
    sync.setGoogleBusy(true); sync.setGoogleError('')
    startGoogleAuth()
      .then(({ accessToken }) => {
        markAuthenticated(email)
        return loadEvents(email, accessToken)
      })
      .catch(err => sync.setGoogleError(err instanceof Error ? err.message : String(err)))
      .finally(() => sync.setGoogleBusy(false))
  }

  const disconnect = async (email: string) => {
    signOut(email)
    useCalendarSyncStore.getState().unmarkGoogleLoaded(email)
    sources.filter(s => s.accountEmail === email).forEach(s => removeSource(s.id))
    const cfg = useStore.getState().data.calendarConfig ?? {}
    const tokens = { ...(cfg.googleTokens ?? {}) }; delete tokens[email]
    const refreshTokens = { ...(cfg.googleRefreshTokens ?? {}) }; delete refreshTokens[email]
    const expiry = { ...(cfg.googleTokenExpiry ?? {}) }; delete expiry[email]
    updateCalendarConfig({
      googleEmails: (cfg.googleEmails ?? []).filter(e => e !== email),
      googleTokens: tokens, googleRefreshTokens: refreshTokens, googleTokenExpiry: expiry,
    })
    markAuthenticated(email)
    clearExternalEvents('google')
    for (const e of getAccountEmails()) await tryLoad(e)
  }

  return {
    busy: sync.googleBusy, error: sync.googleError, needsAuth: sync.googleNeedsAuth,
    gconfigured, loadedRef: { current: sync.googleLoaded },
    tryLoad, connect, reconnect, disconnect,
  }
}
