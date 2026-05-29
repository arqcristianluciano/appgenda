import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, type User,
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
}

export async function isAuthValid(): Promise<boolean> {
  if (!auth) return true
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth!, user => {
      unsub()
      resolve(!!user)
    })
  })
}

async function upsertProfile(user: User): Promise<void> {
  if (!db) return
  try {
    const email = user.email || ''
    await setDoc(doc(db, 'profiles', user.uid), {
      id: user.uid,
      email,
      emailLowercase: email.toLowerCase(),
      name: user.displayName || email,
      avatarUrl: user.photoURL || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
  } catch (e) {
    console.warn('upsertProfile:', e)
  }
}

function sessionFromUser(user: User): Session {
  void upsertProfile(user)
  const email = user.email || ''
  return saveSession(email, user.displayName || email, user.photoURL || undefined, user.uid)
}

// Errores de Firebase Auth → mensajes accionables. Las cancelaciones del usuario
// devuelven '' (no se muestra nada); el resto explican qué revisar en la consola.
function firebaseAuthErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  const raw = e instanceof Error ? e.message : 'Error desconocido'
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return ''
    case 'auth/operation-not-allowed':
      return 'El login con Google no está habilitado en Firebase. Actívalo en Firebase '
        + 'Console → Authentication → Sign-in method → Google.'
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado para el login. Añádelo en Firebase Console → '
        + 'Authentication → Settings → Authorized domains.'
    case 'auth/network-request-failed':
      return 'Error de red al conectar con Firebase. Revisa tu conexión e inténtalo otra vez.'
    default:
      return `No se pudo iniciar sesión: ${raw}`
  }
}

// Entornos donde el popup no es viable (bloqueado, WebView, algunas PWAs): caemos
// a redirect, que completa la sesión al volver vía completeRedirectSignIn().
const REDIRECT_FALLBACK = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

// Login con Google vía Firebase (popup, con fallback a redirect). Usa el cliente
// OAuth gestionado por el propio proyecto de Firebase, así que NO depende de
// VITE_GOOGLE_CLIENT_ID ni de que ese client ID viva en otro proyecto de GCP
// (que era la causa del auth/invalid-credential por audiencia no autorizada).
export async function signInWithGoogle(): Promise<Session | null> {
  if (!auth) throw new Error('Firebase no está configurado.')
  try {
    const result = await signInWithPopup(auth, googleProvider())
    return sessionFromUser(result.user)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null // el usuario cerró el popup
    }
    if (REDIRECT_FALLBACK.has(code)) {
      await signInWithRedirect(auth, googleProvider())
      return null // la página navega fuera; el resultado se recoge al volver
    }
    throw new Error(firebaseAuthErrorMessage(e))
  }
}

// Recoge el resultado de un login por redirect, al montar la pantalla de login.
export async function completeRedirectSignIn(): Promise<Session | null> {
  if (!auth) return null
  try {
    const result = await getRedirectResult(auth)
    return result?.user ? sessionFromUser(result.user) : null
  } catch (e) {
    console.error('Redirect sign-in error:', e)
    return null
  }
}
