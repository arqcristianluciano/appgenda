import type { Evento } from '../types'
import {
  getAccountEmails, getStoredAccessToken, clearStoredToken,
  exchangeCode, getValidToken,
} from './googleTokens'

export { getAccountEmails, getValidToken, hasRefreshToken } from './googleTokens'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'email',
  'profile',
].join(' ')

const API = 'https://www.googleapis.com/calendar/v3'

export function isGoogleConfigured(): boolean {
  return !!(import.meta.env.VITE_GOOGLE_CLIENT_ID)
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
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      scope: SCOPES,
      ux_mode: 'popup',
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

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 401) throw new Error('Token expired')
  if (!res.ok) throw new Error(`Google API ${res.status}`)
  if (res.status === 204) return {} as T
  return res.json()
}

interface GCalList<T> { items?: T[] }
export interface GCal { id: string; summary: string; backgroundColor: string; primary?: boolean }
interface GEvent {
  id: string; summary?: string; description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

export async function fetchCalendars(token: string): Promise<GCal[]> {
  const data = await apiFetch<GCalList<GCal>>('/users/me/calendarList', token)
  return data.items || []
}

export async function fetchEvents(token: string, calId: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '500',
  })
  const data = await apiFetch<GCalList<GEvent>>(`/calendars/${encodeURIComponent(calId)}/events?${params}`, token)
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

export async function createGoogleEvent(calId: string, event: NewGoogleEvent, token: string): Promise<GEvent> {
  return apiFetch(`/calendars/${encodeURIComponent(calId)}/events`, token, {
    method: 'POST', body: JSON.stringify(event),
  })
}

export async function updateGoogleEvent(calId: string, eventId: string, event: NewGoogleEvent, token: string): Promise<GEvent> {
  return apiFetch(`/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`, token, {
    method: 'PATCH', body: JSON.stringify(event),
  })
}

export async function deleteGoogleEvent(calId: string, eventId: string, token: string): Promise<void> {
  await apiFetch(`/calendars/${encodeURIComponent(calId)}/events/${eventId}`, token, { method: 'DELETE' })
}
