import { supabase } from '../lib/supabase'

const SESSION_KEY = 'app_session'

export interface Session {
  email: string
  name: string
  picture?: string
  userId?: string
  expiresAt: number
}

function decodeJwt(token: string): Record<string, string> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: Session = JSON.parse(raw)
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function saveSession(email: string, name: string, picture?: string, userId?: string): Session {
  const session: Session = {
    email, name, picture, userId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  if (supabase) supabase.auth.signOut().catch(() => {})
  if (window.google?.accounts?.id) {
    google.accounts.id.disableAutoSelect()
  }
}

export async function isSupabaseAuthValid(): Promise<boolean> {
  if (!supabase) return true
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) return false
    return Date.now() / 1000 < (data.session.expires_at ?? 0)
  } catch {
    return false
  }
}

async function authenticateWithSupabase(idToken: string): Promise<string | undefined> {
  if (!supabase) return undefined
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google', token: idToken,
  })
  if (error) {
    console.error('signInWithIdToken error:', error.message)
    throw error
  }
  return data.user?.id
}

export function initGoogleSignIn(
  onSuccess: (s: Session) => void,
  onError: (msg: string) => void,
): void {
  if (!window.google?.accounts?.id) {
    onError('Google no disponible, recarga la página.')
    return
  }
  google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    callback: async (response) => {
      const payload = decodeJwt(response.credential)
      const email = payload.email || ''
      if (!email) { onError('No se pudo obtener el email'); return }
      try {
        const userId = await authenticateWithSupabase(response.credential)
        onSuccess(saveSession(email, payload.name || email, payload.picture, userId))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        console.error('Auth Supabase error:', e)
        onError(`No se pudo conectar con Supabase: ${msg}`)
      }
    },
    auto_select: true,
    cancel_on_tap_outside: false,
  })
  google.accounts.id.prompt()
}

export function renderGoogleButton(el: HTMLElement): void {
  if (!window.google?.accounts?.id) return
  google.accounts.id.renderButton(el, {
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    width: 280,
  })
}
