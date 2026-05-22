import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFunctions, type Functions } from 'firebase/functions'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const FUNCTIONS_REGION = 'us-east1'

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
