import type { Evento } from '../types'
import {
  getAccountEmails, getStoredAccessToken, clearStoredToken,
  exchangeCode, getValidToken,
} from './googleTokens'
import { getCachedClientId } from './googleOAuthConfig'

// El clientId puede venir de la config en runtime (Firestore, configurable desde
// la app) o, como fallback, del build (VITE_GOOGLE_CLIENT_ID). Runtime tiene
// prioridad para que cambiar credenciales no requiera redeploy.
function resolveClientId(): string {
  return getCachedClientId() || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

export { getAccountEmails, getValidToken, hasRefreshToken, storeAccessToken } from './googleTokens'
export const TOKEN_REFRESH_MS = 45 * 60 * 1000

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'email',
  'profile',
].join(' ')

const API = 'https://www.googleapis.com/calendar/v3'

// Error de la API de Google con metadatos para que la UI distinga un fallo
// recuperable (sesión expirada → reconectar sirve) de uno permanente de
// configuración (proyecto GCP borrado / API deshabilitada → reconectar NO
// sirve, hay que arreglar las credenciales en Google Cloud).
export class GoogleApiError extends Error {
  readonly status: number
  readonly reason: string | undefined
  readonly permanent: boolean
  constructor(status: number, reason: string | undefined, message: string, permanent: boolean) {
    super(message)
    this.name = 'GoogleApiError'
    this.status = status
    this.reason = reason
    this.permanent = permanent
  }
}

// Un 403 de proyecto borrado o de API deshabilitada no se arregla reconectando:
// las credenciales OAuth pertenecen a un proyecto que ya no sirve. Lo separamos
// de insufficientPermissions/scope, que sí puede recuperarse con re-auth.
function isPermanentConfigError(status: number, reason: string | undefined, message: string): boolean {
  if (status !== 403) return false
  if (reason === 'accessNotConfigured') return true
  const m = message.toLowerCase()
  return m.includes('has been deleted')
    || m.includes('has not been used')
    || m.includes('is disabled')
    || m.includes('api is not enabled')
}

export function isGoogleConfigured(): boolean {
  return !!resolveClientId()
}

// Carga el script GIS si aún no está inyectado
export function loadGoogleScript(): Promise<void> {
  if (document.getElementById('gis-script')) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.id = 'gis-script'; s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => resolve(); s.onerror = reject
    document.head.appendChild(s)
  })
}

// Abre el popup UNA vez → obtiene code → exchange server-side → refresh token guardado
export function startGoogleAuth(): Promise<{ email: string; accessToken: string }> {
  const doAuth = () => new Promise<{ email: string; accessToken: string }>((resolve, reject) => {
    const client = google.accounts.oauth2.initCodeClient({
      client_id: resolveClientId(),
      scope: SCOPES,
      ux_mode: 'popup',
      prompt: 'consent',  // fuerza pantalla de consentimiento → siempre devuelve refresh_token
      callback: async (res) => {
        if (res.error) return reject(new Error(res.error))
        try { resolve(await exchangeCode(res.code)) }
        catch (e) { reject(e) }
      },
    })
    client.requestCode()
  })

  if (!window.google?.accounts?.oauth2) {
    return loadGoogleScript().then(doAuth)
  }
  return doAuth()
}

export function signOut(email?: string): void {
  const emails = email ? [email] : getAccountEmails()
  emails.forEach(e => {
    const token = getStoredAccessToken(e)
    if (token && window.google) google.accounts.oauth2.revoke(token, () => {})
    clearStoredToken(e)
  })
  if (!email) {
    try { localStorage.removeItem('gcal_accounts') } catch { /* ignore */ }
  }
}

// ── API Google Calendar ────────────────────────────────────────────────────

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const backoffMs = (attempt: number) => Math.min(500 * 2 ** attempt, 4000) + Math.random() * 250

// Helper central de la API: resuelve el access token a partir del email,
// adjunta el header Authorization, reintenta errores transitorios con backoff
// y —clave para el 401— fuerza UN refresh server-side y reintenta una vez si
// Google rechaza el token. Si tras el refresh sigue dando 401, lanza un error
// descriptivo para que la UI pida reconectar.
async function apiFetch<T>(path: string, email: string, init?: RequestInit): Promise<T> {
  let token = await getValidToken(email)
  let didRefresh = false
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(`${API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
      })
    } catch (err) {
      // Error de red — reintentar con backoff
      lastErr = err
      if (attempt === MAX_RETRIES) throw err
      await sleep(backoffMs(attempt))
      continue
    }
    if (res.status === 401) {
      if (!didRefresh) {
        didRefresh = true
        token = await getValidToken(email, { force: true })
        continue
      }
      // Recuperable: reconectar (re-auth) renueva la sesión.
      throw new GoogleApiError(401, 'authError', 'Google session expired', false)
    }
    if (res.ok) {
      if (res.status === 204) return {} as T
      return res.json()
    }
    if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
      await sleep(backoffMs(attempt))
      continue
    }
    // Error no recuperable: surfacing del motivo de Google (p. ej. 403
    // insufficientPermissions = falta scope; accessNotConfigured = API
    // deshabilitada) para no dejar el 4xx opaco en consola.
    const body = await res.json().catch(() => null) as
      { error?: { message?: string; errors?: { reason?: string }[] } } | null
    const reason = body?.error?.errors?.[0]?.reason
    const message = body?.error?.message ?? ''
    const detail = `Google API ${res.status}${reason ? ` ${reason}` : ''}${message ? `: ${message}` : ''}`
    console.warn('googleCalendar:', detail)
    throw new GoogleApiError(res.status, reason, detail, isPermanentConfigError(res.status, reason, message))
  }
  throw lastErr ?? new Error('Google API: max retries exceeded')
}

interface GCalList<T> { items?: T[] }
// accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader' — define si se puede escribir
export interface GCal { id: string; summary: string; backgroundColor: string; primary?: boolean; accessRole?: string }
interface GEvent {
  id: string; summary?: string; description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

export async function fetchCalendars(email: string): Promise<GCal[]> {
  const data = await apiFetch<GCalList<GCal>>('/users/me/calendarList', email)
  return data.items || []
}

export async function fetchEvents(email: string, calId: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '500',
  })
  const data = await apiFetch<GCalList<GEvent>>(`/calendars/${encodeURIComponent(calId)}/events?${params}`, email)
  return data.items || []
}

export function toLocalEvento(ge: GEvent, calColor: string, calSourceId?: string): Evento {
  const isAllDay = !!ge.start.date
  const fecha = isAllDay ? ge.start.date! : ge.start.dateTime?.split('T')[0] || ''
  const hora = isAllDay ? '' : ge.start.dateTime?.split('T')[1]?.substring(0, 5) || ''
  const horaFin = isAllDay ? '' : ge.end?.dateTime?.split('T')[1]?.substring(0, 5) || ''
  return {
    id: `gcal_${ge.id}`, titulo: ge.summary || '(Sin título)',
    fecha, hora, horaFin, nota: ge.description || '',
    allDay: isAllDay, color: calColor, source: 'google', sourceId: ge.id,
    calendarSourceId: calSourceId,
  }
}

export interface NewGoogleEvent {
  summary: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  description?: string
}

export async function createGoogleEvent(calId: string, event: NewGoogleEvent, email: string): Promise<GEvent> {
  return apiFetch(`/calendars/${encodeURIComponent(calId)}/events`, email, {
    method: 'POST', body: JSON.stringify(event),
  })
}

export async function updateGoogleEvent(calId: string, eventId: string, event: NewGoogleEvent, email: string): Promise<GEvent> {
  return apiFetch(`/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`, email, {
    method: 'PATCH', body: JSON.stringify(event),
  })
}

export async function deleteGoogleEvent(calId: string, eventId: string, email: string): Promise<void> {
  await apiFetch(`/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`, email, { method: 'DELETE' })
}
