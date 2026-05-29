import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFunctions, type Functions } from 'firebase/functions'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

// authDomain forzado al dominio de Hosting (*.web.app) en vez del *.firebaseapp.com
// que trae el secret: así el handler de OAuth (/__/auth/handler) queda same-origin con
// la app y signInWithRedirect funciona en la PWA instalada en iOS (Safari/ITP bloquea
// el storage cross-domain del handler en firebaseapp.com). Firebase Hosting sirve el
// handler en ambos dominios; el client OAuth debe tener registrada esta redirect URI.
const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '')
  .replace(/\.firebaseapp\.com$/, '.web.app')

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const FUNCTIONS_REGION = 'us-east1'

// Clave de sitio reCAPTCHA Enterprise (pública por diseño) para Firebase App Check.
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LcRQPksAAAAABpvVCr20fFLJmxCxzIvMWDjHLLQ'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null
let _storage: FirebaseStorage | null = null
let _functions: Functions | null = null

function ready(): boolean {
  return !!(config.apiKey && config.projectId && config.appId)
}

if (ready()) {
  _app = initializeApp(config)
  // App Check debe inicializarse antes de usar Firestore/Storage/Functions para
  // que adjunte el token de attestation a cada request.
  initializeAppCheck(_app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  })
  _auth = getAuth(_app)
  // Firestore with IndexedDB-backed offline persistence (multi-tab safe).
  _db = initializeFirestore(_app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  _storage = getStorage(_app)
  _functions = getFunctions(_app, FUNCTIONS_REGION)
}

export const firebaseApp = _app
export const auth = _auth
export const db = _db
export const storage = _storage
export const functions = _functions
export const isFirebaseReady = ready
