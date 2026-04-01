import type { Evento } from '../types'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'email',
  'profile',
].join(' ')
const API = 'https://www.googleapis.com/calendar/v3'
const ACCOUNTS_KEY = 'gcal_accounts'

type AccountTokens = Record<string, string>

function getAccountTokens(): AccountTokens {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}') } catch { return {} }
}

function setAccountTokens(t: AccountTokens): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(t))
}

export function isGoogleConfigured(): boolean {
  return !!(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}

export function getAccountEmails(): string[] {
  return Object.keys(getAccountTokens())
}

export function getTokenForEmail(email: string): string | null {
  return getAccountTokens()[email] || null
}

export function storeAccount(email: string, token: string): void {
  const t = getAccountTokens(); t[email] = token; setAccountTokens(t)
}

export function removeAccount(email: string): void {
  const t = getAccountTokens(); delete t[email]; setAccountTokens(t)
}

export function getStoredToken(): string | null {
  const emails = getAccountEmails()
  return emails.length > 0 ? getAccountTokens()[emails[0]] : null
}

export async function loadGoogleScript(): Promise<void> {
  if (document.getElementById('gis-script')) return
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.id = 'gis-script'; s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => resolve(); s.onerror = reject
    document.head.appendChild(s)
  })
}

export const TOKEN_REFRESH_MS = 45 * 60 * 1000 // 45 min (tokens live 1h)

// IMPORTANT: Must be called synchronously within a user gesture handler.
// The GIS script is preloaded in index.html. If not ready yet, fallback to loadGoogleScript.
export function startGoogleAuth(): Promise<string> {
  if (!window.google?.accounts?.oauth2) {
    return loadGoogleScript().then(() => startGoogleAuth())
  }
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      scope: SCOPES,
      callback: (res) => {
        if (res.error) return reject(new Error(res.error))
        resolve(res.access_token)
      },
    })
    client.requestAccessToken()
  })
}

// Silent re-auth — works as long as the user is logged into Google in this browser.
// Fails silently on new devices or revoked access (caller must handle).
export function silentAuth(email: string): Promise<string> {
  if (!window.google?.accounts?.oauth2) {
    return loadGoogleScript().then(() => silentAuth(email))
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('silentAuth timeout')), 5000)
    const client = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      scope: SCOPES,
      hint: email,
      callback: (res) => {
        clearTimeout(timeout)
        if (res.error) return reject(new Error(res.error))
        storeAccount(email, res.access_token)
        resolve(res.access_token)
      },
    })
    client.requestAccessToken({ prompt: '' })
  })
}

export async function fetchUserInfo(token: string): Promise<{ email: string; name: string }> {
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`)
  if (!res.ok) throw new Error(`Tokeninfo error: ${res.status}`)
  const data = await res.json()
  if (!data.email) throw new Error('No email in token')
  return { email: data.email, name: data.name || data.email }
}

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
  const data = await apiFetch<GCalList<GEvent>>(
    `/calendars/${encodeURIComponent(calId)}/events?${params}`, token,
  )
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

export function signOut(email?: string): void {
  const tokens = getAccountTokens()
  if (email) {
    if (tokens[email] && window.google) google.accounts.oauth2.revoke(tokens[email], () => {})
    removeAccount(email)
  } else {
    if (window.google) Object.values(tokens).forEach(t => google.accounts.oauth2.revoke(t, () => {}))
    localStorage.removeItem(ACCOUNTS_KEY)
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

export async function deleteGoogleEvent(calId: string, eventId: string, token: string): Promise<void> {
  await apiFetch(`/calendars/${encodeURIComponent(calId)}/events/${eventId}`, token, { method: 'DELETE' })
}
