import {
  GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

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
  if (auth) signOut(auth).catch(() => {})
  if (window.google?.accounts?.id) {
    google.accounts.id.disableAutoSelect()
  }
}

export async function isSupabaseAuthValid(): Promise<boolean> {
  if (!auth) return true
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth!, user => {
      unsub()
      resolve(!!user)
    })
  })
}

async function authenticateWithFirebase(idToken: string): Promise<User | undefined> {
  if (!auth) return undefined
  const credential = GoogleAuthProvider.credential(idToken)
  const result = await signInWithCredential(auth, credential)
  return result.user
}

async function upsertProfile(user: User): Promise<void> {
  if (!db) return
  try {
    await setDoc(doc(db, 'profiles', user.uid), {
      id: user.uid,
      email: user.email || '',
      name: user.displayName || user.email || '',
      avatarUrl: user.photoURL || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
  } catch (e) {
    console.warn('upsertProfile:', e)
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
    callback: async (response) => {
      const payload = decodeJwt(response.credential)
      const email = payload.email || ''
      if (!email) { onError('No se pudo obtener el email'); return }
      try {
        const user = await authenticateWithFirebase(response.credential)
        if (user) void upsertProfile(user)
        onSuccess(saveSession(email, payload.name || email, payload.picture, user?.uid))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        console.error('Auth Firebase error:', e)
        onError(`No se pudo conectar con Firebase: ${msg}`)
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
