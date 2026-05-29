// Notificaciones push (FCM) — recordatorios que llegan con la app cerrada.
// Requiere VITE_FIREBASE_VAPID_KEY (clave par web push de la consola de Firebase:
// Project settings → Cloud Messaging → Web Push certificates).
//
// El envío lo hace la Cloud Function `sendDueReminders`, que lee los tokens
// guardados en Firestore (push_tokens/{uid}) y dispara según el campo
// `notification` (datetime ISO) de tareas/eventos.

import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import {
  getMessaging, getToken, deleteToken, onMessage, isSupported, type Messaging,
} from 'firebase/messaging'
import { auth, db as fdb, firebaseApp } from '../lib/firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
const TOKEN_LS_KEY = 'push_token'

/** ¿Está la app configurada para push? (clave VAPID + Firebase listos) */
export function isPushConfigured(): boolean {
  return !!VAPID_KEY && !!firebaseApp
}

/** ¿El usuario ya activó push en este dispositivo? */
export function isPushEnabled(): boolean {
  return (
    !!localStorage.getItem(TOKEN_LS_KEY) &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  )
}

let _messaging: Messaging | null = null
let _foregroundBound = false

async function resolveMessaging(): Promise<Messaging | null> {
  if (!firebaseApp) return null
  if (!(await isSupported().catch(() => false))) return null
  if (!_messaging) _messaging = getMessaging(firebaseApp)
  return _messaging
}

/** Muestra los mensajes recibidos con la app en primer plano. */
function bindForeground(messaging: Messaging) {
  if (_foregroundBound) return
  _foregroundBound = true
  onMessage(messaging, (payload) => {
    const d = payload.data ?? {}
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(d.title || 'APPgenda', { body: d.body, icon: '/pwa-192x192.png' })
    }
  })
}

export interface EnableResult {
  ok: boolean
  reason?: string
}

export async function enablePush(): Promise<EnableResult> {
  if (!VAPID_KEY) return { ok: false, reason: 'Falta configurar la clave VAPID (VITE_FIREBASE_VAPID_KEY).' }
  if (!auth?.currentUser || !fdb) return { ok: false, reason: 'Necesitás iniciar sesión.' }

  const messaging = await resolveMessaging()
  if (!messaging) return { ok: false, reason: 'Este dispositivo/navegador no soporta push.' }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'Las notificaciones están bloqueadas en los ajustes del navegador.' }
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'Permiso de notificaciones denegado.' }

  try {
    const reg = await navigator.serviceWorker.ready
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
    if (!token) return { ok: false, reason: 'No se pudo obtener el token de push.' }

    await setDoc(
      doc(fdb, 'push_tokens', auth.currentUser.uid),
      { tokens: arrayUnion(token), updatedAt: new Date().toISOString() },
      { merge: true },
    )
    localStorage.setItem(TOKEN_LS_KEY, token)
    bindForeground(messaging)
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: (e as Error).message || 'Error al activar push.' }
  }
}

export async function disablePush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_LS_KEY)
  const messaging = await resolveMessaging()
  if (messaging) { try { await deleteToken(messaging) } catch { /* ignore */ } }
  if (token && auth?.currentUser && fdb) {
    try {
      await updateDoc(doc(fdb, 'push_tokens', auth.currentUser.uid), { tokens: arrayRemove(token) })
    } catch { /* ignore */ }
  }
  localStorage.removeItem(TOKEN_LS_KEY)
}
