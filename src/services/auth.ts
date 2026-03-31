import { supabase } from '../lib/supabase'

const SESSION_KEY = 'app_session'
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || 'arqcristianluciano@gmail.com'

export interface Session {
  email: string
  name: string
  picture?: string
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

function saveSession(email: string, name: string, picture?: string): Session {
  const session: Session = {
    email, name, picture,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  if (window.google?.accounts?.id) {
    google.accounts.id.disableAutoSelect()
  }
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
    callback: (response) => {
      const payload = decodeJwt(response.credential)
      const email = payload.email || ''
      if (email !== ALLOWED_EMAIL) {
        onError(`Acceso denegado para ${email}`)
        return
      }
      // Establecer sesión en Supabase Auth (habilita RLS con usuario autenticado)
      if (supabase) {
        supabase.auth.signInWithIdToken({ provider: 'google', token: response.credential })
          .catch(() => { /* Supabase Google provider no configurado — se ignora */ })
      }
      onSuccess(saveSession(email, payload.name || email, payload.picture))
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
