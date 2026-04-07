import { useState, useCallback, useRef } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, getAccountEmails,
  getValidToken, hasRefreshToken, silentTokenRequest,
} from '../../services/googleCalendar'
import { saveTokenData } from '../../services/googleTokens'

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
  const [needsAuth, setNeedsAuth] = useState(new Set<string>())
  const loadedRef = useRef(new Set<string>())

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

  // Intenta cargar — nunca muestra UI, usa todos los métodos silenciosos disponibles
  const tryLoad = useCallback(async (email: string) => {
    // 1. Refresh token en servidor (más confiable, dura indefinidamente)
    if (hasRefreshToken(email)) {
      try {
        const token = await getValidToken(email)
        await loadEvents(email, token)
        return
      } catch { /* refresh falló */ }
    }

    // 2. Access token en caché (puede seguir válido)
    const cloudToken = useStore.getState().data.calendarConfig?.googleTokens?.[email]
    if (cloudToken) {
      try {
        await loadEvents(email, cloudToken)
        saveTokenData(email, cloudToken, undefined, 1800)
        return
      } catch { /* expirado */ }
    }

    // 3. Renovación silenciosa via browser SDK (sin popup, sin UI)
    //    Funciona si el usuario está logueado en Google en el browser
    try {
      const token = await silentTokenRequest(email)
      saveTokenData(email, token, undefined, 3600)
      await loadEvents(email, token)
      return
    } catch { /* usuario no logueado o no autorizó → necesita re-auth */ }

    // 4. Último recurso: marcar para re-auth (raro si están logueados en Google)
    setNeedsAuth(prev => new Set([...prev, email]))
  }, [loadEvents])

  const flushAuth = useCallback(() => setNeedsAuth(new Set()), [])

  const markAuthenticated = useCallback((email: string) => {
    setNeedsAuth(prev => { const n = new Set(prev); n.delete(email); return n })
  }, [])

  const connect = () => {
    if (!gconfigured || busy) return
    setBusy(true); setError('')
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
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false))
  }

  const reconnect = (email: string) => {
    if (!gconfigured || busy) return
    setBusy(true); setError('')
    startGoogleAuth()
      .then(({ accessToken }) => {
        markAuthenticated(email)
        return loadEvents(email, accessToken)
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

  return { busy, error, needsAuth, gconfigured, loadedRef, tryLoad, flushAuth, connect, reconnect, disconnect }
}
