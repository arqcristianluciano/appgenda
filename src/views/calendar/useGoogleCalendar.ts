import { useState, useCallback, useRef } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, getAccountEmails,
  GoogleApiError,
} from '../../services/googleCalendar'

const SYNC_FRESH_MS = 5 * 60 * 1000

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
  const {
    sources, addSource, removeSource, appendExternalEvents, clearExternalEvents,
    markSynced, clearLastSync,
  } = useCalendarStore()
  const { updateCalendarConfig } = useStore()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(new Set<string>())
  // Fallo permanente de configuración (proyecto GCP borrado / API deshabilitada):
  // reconectar no sirve, así que se separa de needsAuth para mostrar otro mensaje.
  const [configError, setConfigError] = useState(new Map<string, string>())
  const loadedRef = useRef(new Set<string>())
  const failCountRef = useRef(new Map<string, number>())

  const gconfigured = isGoogleConfigured()

  const loadEvents = useCallback(async (email: string) => {
    const cals = await fetchCalendars(email)
    const { start, end } = dateRange()
    const allEvts: ReturnType<typeof toLocalEvento>[] = []
    for (const cal of cals) {
      const sourceId = `gcal_${email}_${cal.id}`
      addSource({ id: sourceId, name: cal.summary, type: 'google', color: cal.backgroundColor || '#4285F4', enabled: true, accountEmail: email })
      const evts = await fetchEvents(email, cal.id, start, end)
      allEvts.push(...evts.map(e => toLocalEvento(e, cal.backgroundColor || '#4285F4', sourceId)))
    }
    appendExternalEvents(allEvts)
    markSynced('google')
    loadedRef.current.add(email)
  }, [addSource, appendExternalEvents, markSynced])

  const isFresh = useCallback(() => {
    const ts = useCalendarStore.getState().lastSync.google
    return !!ts && Date.now() - ts < SYNC_FRESH_MS
  }, [])

  // Intenta cargar en silencio. El token (incluido el refresh server-side) y el
  // reintento ante 401 los maneja apiFetch; aquí solo decidimos cuándo pedir
  // re-auth y evitamos martillar la API en bucle cuando ya falló.
  const tryLoad = useCallback(async (email: string, opts?: { force?: boolean }) => {
    // Si los datos son frescos y ya cargamos esta cuenta en esta sesión, no re-sincronizar
    if (!opts?.force && isFresh() && loadedRef.current.has(email)) return
    // Loop guard: tras 2 fallos consecutivos no reintentamos en background.
    // Solo un reconnect manual (force) reactiva la carga automática.
    if (!opts?.force && (failCountRef.current.get(email) ?? 0) >= 2) return

    try {
      await loadEvents(email)
      failCountRef.current.delete(email)
      setNeedsAuth(prev => {
        if (!prev.has(email)) return prev
        const n = new Set(prev); n.delete(email); return n
      })
      setConfigError(prev => {
        if (!prev.has(email)) return prev
        const n = new Map(prev); n.delete(email); return n
      })
    } catch (err) {
      // Error permanente de configuración (proyecto borrado / API deshabilitada):
      // reconectar no lo arregla. Cortamos los reintentos y mostramos el cartel
      // de config en vez del de "reconectar".
      if (err instanceof GoogleApiError && err.permanent) {
        failCountRef.current.set(email, 2)
        setNeedsAuth(prev => {
          if (!prev.has(email)) return prev
          const n = new Set(prev); n.delete(email); return n
        })
        setConfigError(prev => new Map(prev).set(email, err.message))
        return
      }
      // Tras 2 fallos consecutivos pedimos re-auth: un error transitorio de red
      // no debe disparar el cartel de "reconectar".
      const fails = (failCountRef.current.get(email) ?? 0) + 1
      failCountRef.current.set(email, fails)
      if (fails >= 2) setNeedsAuth(prev => new Set([...prev, email]))
    }
  }, [loadEvents, isFresh])

  const flushAuth = useCallback(() => setNeedsAuth(new Set()), [])

  const markAuthenticated = useCallback((email: string) => {
    failCountRef.current.delete(email)
    setNeedsAuth(prev => { const n = new Set(prev); n.delete(email); return n })
    setConfigError(prev => {
      if (!prev.has(email)) return prev
      const n = new Map(prev); n.delete(email); return n
    })
  }, [])

  const connect = () => {
    if (!gconfigured || busy) return
    setBusy(true); setError('')
    startGoogleAuth()
      .then(({ email }) => {
        const cfg = useStore.getState().data.calendarConfig ?? {}
        updateCalendarConfig({
          googleEmails: (cfg.googleEmails ?? []).includes(email)
            ? cfg.googleEmails!
            : [...(cfg.googleEmails ?? []), email],
        })
        markAuthenticated(email)
        return loadEvents(email)
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false))
  }

  const reconnect = (email: string) => {
    if (!gconfigured || busy) return
    setBusy(true); setError('')
    startGoogleAuth()
      .then(() => {
        markAuthenticated(email)
        return loadEvents(email)
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
    clearLastSync('google')
    for (const e of getAccountEmails()) await tryLoad(e, { force: true })
  }

  return { busy, error, needsAuth, configError, gconfigured, loadedRef, tryLoad, flushAuth, connect, reconnect, disconnect }
}
