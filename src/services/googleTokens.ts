import { useStore } from '../store/useStore'
import { getCallable } from '../lib/functionsUrl'

const EXPIRY_BUFFER_MS = 5 * 60 * 1000  // renovar 5 min antes de expirar
const ACCOUNTS_KEY = 'gcal_accounts'

// ── Almacenamiento local de access tokens ─────────────────────────────────

export function getStoredAccessToken(email: string): string | null {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')[email] ?? null }
  catch { return null }
}

export function storeAccessToken(email: string, token: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
    all[email] = token
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

export function clearStoredToken(email: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
    delete all[email]
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

export function getAccountEmails(): string[] {
  try { return Object.keys(JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')) }
  catch { return [] }
}

// ── Refresh tokens y expiración (sincronizados a Firestore) ────────────────

function getRefreshToken(email: string): string | null {
  return useStore.getState().data.calendarConfig?.googleRefreshTokens?.[email] ?? null
}

function isTokenExpired(email: string): boolean {
  const expiry = useStore.getState().data.calendarConfig?.googleTokenExpiry?.[email]
  if (!expiry) return true
  return Date.now() >= expiry - EXPIRY_BUFFER_MS
}

export function saveTokenData(
  email: string, accessToken: string, refreshToken?: string, expiresIn = 3600,
): void {
  storeAccessToken(email, accessToken)
  const expiry = Date.now() + expiresIn * 1000
  const { updateCalendarConfig } = useStore.getState()
  const cfg = useStore.getState().data.calendarConfig ?? {}
  updateCalendarConfig({
    googleTokens: { ...(cfg.googleTokens ?? {}), [email]: accessToken },
    googleTokenExpiry: { ...(cfg.googleTokenExpiry ?? {}), [email]: expiry },
    ...(refreshToken ? {
      googleRefreshTokens: { ...(cfg.googleRefreshTokens ?? {}), [email]: refreshToken },
    } : {}),
  })
}

// ── API de Google OAuth (exchange + refresh) via Firebase Functions ────────

interface OAuthResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

interface OAuthRequest {
  action: 'exchange' | 'refresh'
  code?: string
  refreshToken?: string
}

const googleOAuthCallable = () => getCallable<OAuthRequest, OAuthResponse>('googleoauth')

async function callOAuthAPI(req: OAuthRequest): Promise<OAuthResponse> {
  const fn = googleOAuthCallable()
  const res = await fn(req)
  return res.data
}

export async function exchangeCode(code: string): Promise<{ email: string; accessToken: string }> {
  const data = await callOAuthAPI({ action: 'exchange', code })
  const info = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${data.access_token}`)
  const { email } = await info.json() as { email: string }
  if (!email) throw new Error('No se pudo obtener el email de Google')
  saveTokenData(email, data.access_token, data.refresh_token, data.expires_in)
  return { email, accessToken: data.access_token }
}

async function silentRefresh(email: string): Promise<string> {
  const refreshToken = getRefreshToken(email)
  if (!refreshToken) throw new Error(`Sin refresh token para ${email}`)
  const data = await callOAuthAPI({ action: 'refresh', refreshToken })
  saveTokenData(email, data.access_token, undefined, data.expires_in)
  return data.access_token
}

// ── Token válido: renovación completamente silenciosa ──────────────────────

export async function getValidToken(email: string, opts?: { force?: boolean }): Promise<string> {
  // force: ignora el heurístico de expiración y renueva contra el servidor.
  // Lo usa apiFetch cuando Google devuelve 401 aunque el token pareciera vigente
  // (revocado, scope cambiado, o expiry local desincronizado).
  if (!opts?.force) {
    const local = getStoredAccessToken(email)
    const cloud = useStore.getState().data.calendarConfig?.googleTokens?.[email]
    const candidate = local || cloud
    if (candidate && !isTokenExpired(email)) return candidate
  }
  return silentRefresh(email)
}

export function hasRefreshToken(email: string): boolean {
  return !!getRefreshToken(email)
}
