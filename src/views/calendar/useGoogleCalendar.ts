import { useState, useCallback, useRef, useEffect } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, getAccountEmails,
  GoogleApiError,
} from '../../services/googleCalendar'
import { fetchGoogleClientId, saveGoogleOAuthConfig } from '../../services/googleOAuthConfig'

const SYNC_FRESH_MS = 5 * 60 * 1000

// Persistimos los fallos permanentes de configuración (proyecto GCP borrado /
// API deshabilitada) para no volver a golpear el endpoint muerto en cada recarga
// y dejar de ensuciar la consola. Guardamos el timestamp para reintentar UNA vez
// pasado RETRY_AFTER_MS: así, si el proyecto se restaura, la app se recupera sola
// al reabrirla (sin reconectar) en lugar de quedar bloqueada para siempre.
const CONFIG_ERR_KEY = 'gcal_config_errors'
const RETRY_AFTER_MS = 60 * 60 * 1000  // 1h

interface ConfigErr { message: string; ts: number }

function loadConfigErrors(): Map<string, ConfigErr> {
  try {
    const raw = JSON.parse(localStorage.getItem(CONFIG_ERR_KEY) || '{}') as Record<string, unknown>
    return new Map(Object.entries(raw).map(([email, v]) => [
      email,
      // Tolera el formato viejo (solo string): ts=0 fuerza un reintento inmediato.
      typeof v === 'string' ? { message: v, ts: 0 } : v as ConfigErr,
    ]))
  } catch { return new Map() }
}

function persistConfigErrors(m: Map<string, ConfigErr>): void {
  try { localStorage.setItem(CONFIG_ERR_KEY, JSON.stringify(Object.fromEntries(m))) }
  catch { /* ignore */ }
}

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
  // Se hidrata desde localStorage para no reintentar el endpoint muerto al recargar.
  const [configError, setConfigError] = useState(loadConfigErrors)
  const loadedRef = useRef(new Set<string>())
  const failCountRef = useRef(new Map<string, number>())

  useEffect(() => { persistConfigErrors(configError) }, [configError])

  // El clientId vive en runtime (Firestore). Lo cargamos al montar y forzamos un
  // re-render para que gconfigured/startGoogleAuth usen el valor configurado.
  const [, setConfigTick] = useState(0)
  useEffect(() => { fetchGoogleClientId().finally(() => setConfigTick(t => t + 1)) }, [])

  const gconfigured = isGoogleConfigured()

  // Guarda client_id + client_secret (vía callable) y recalcula gconfigured.
  const saveConfig = useCallback(async (clientId: string, clientSecret: string) => {
    await saveGoogleOAuthConfig(clientId, clientSecret)
    setConfigTick(t => t + 1)
  }, [])

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
    // Fallo permanente de configuración ya conocido (persiste entre recargas):
    // no golpeamos el endpoint muerto. Pasado RETRY_AFTER_MS dejamos UN reintento
    // automático para auto-recuperarnos si ya se arregló el proyecto GCP.
    const ce = configError.get(email)
    if (!opts?.force && ce && Date.now() - ce.ts < RETRY_AFTER_MS) return
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
        setConfigError(prev => new Map(prev).set(email, { message: err.message, ts: Date.now() }))
        return
      }
      // Tras 2 fallos consecutivos pedimos re-auth: un error transitorio de red
      // no debe disparar el cartel de "reconectar".
      const fails = (failCountRef.current.get(email) ?? 0) + 1
      failCountRef.current.set(email, fails)
      if (fails >= 2) setNeedsAuth(prev => new Set([...prev, email]))
    }
  }, [loadEvents, isFresh, configError])

  // Reintento manual tras un error de config: fuerza una carga sin re-OAuth.
  // Si el proyecto GCP ya se restauró, recupera la cuenta de una; si sigue roto,
  // vuelve a marcarla como "No disponible".
  const retry = useCallback((email: string) => {
    if (busy) return
    setBusy(true)
    tryLoad(email, { force: true }).finally(() => setBusy(false))
  }, [busy, tryLoad])

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

  return { busy, error, needsAuth, configError, gconfigured, saveConfig, loadedRef, tryLoad, retry, flushAuth, connect, reconnect, disconnect }
}
