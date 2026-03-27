import type { Evento } from '../types'

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_KEY = 'gcal_token'

function getClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

export function isGoogleConfigured(): boolean {
  return !!getClientId()
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export async function loadGoogleScript(): Promise<void> {
  if (document.getElementById('gis-script')) return
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.id = 'gis-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export async function signIn(): Promise<string> {
  await loadGoogleScript()
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: (res) => {
        if (res.error) return reject(new Error(res.error))
        localStorage.setItem(TOKEN_KEY, res.access_token)
        resolve(res.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export function signOut(): void {
  const token = getStoredToken()
  if (token) google.accounts.oauth2.revoke(token, () => {})
  localStorage.removeItem(TOKEN_KEY)
}

async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  if (!token) throw new Error('No access token')
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    throw new Error('Token expired')
  }
  if (!res.ok) throw new Error(`Google API ${res.status}`)
  if (res.status === 204) return {} as T
  return res.json()
}

interface GCalList<T> { items?: T[] }
interface GCal { id: string; summary: string; backgroundColor: string; primary?: boolean }
interface GEvent {
  id: string; summary?: string; description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

export async function fetchCalendars(): Promise<GCal[]> {
  const data = await apiFetch<GCalList<GCal>>('/users/me/calendarList')
  return data.items || []
}

export async function fetchEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  })
  const data = await apiFetch<GCalList<GEvent>>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
  )
  return data.items || []
}

export function toLocalEvento(ge: GEvent, calColor: string): Evento {
  const isAllDay = !!ge.start.date
  const fecha = isAllDay ? ge.start.date! : ge.start.dateTime?.split('T')[0] || ''
  const hora = isAllDay ? '' : ge.start.dateTime?.split('T')[1]?.substring(0, 5) || ''
  const horaFin = isAllDay ? '' : ge.end?.dateTime?.split('T')[1]?.substring(0, 5) || ''
  return {
    id: `gcal_${ge.id}`, titulo: ge.summary || '(Sin título)',
    fecha, hora, horaFin, nota: ge.description || '',
    allDay: isAllDay, color: calColor, source: 'google', sourceId: ge.id,
  }
}

export interface NewGoogleEvent {
  summary: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  description?: string
}

export async function createGoogleEvent(calendarId: string, event: NewGoogleEvent): Promise<GEvent> {
  return apiFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST', body: JSON.stringify(event),
  })
}

export async function deleteGoogleEvent(calendarId: string, eventId: string): Promise<void> {
  await apiFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
  })
}
