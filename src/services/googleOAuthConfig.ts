import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getCallable } from '../lib/functionsUrl'

// El clientId OAuth se configura en runtime (Firestore) en vez de hornearse en el
// build, así cambiar de credenciales no requiere rebuild/redeploy. El clientSecret
// nunca llega al cliente: se escribe vía callable y solo lo lee la function.
const PUBLIC_DOC = ['app_config', 'google_oauth_public'] as const

// undefined = aún no consultado; null = consultado y no configurado.
let cachedClientId: string | null | undefined

export async function fetchGoogleClientId(): Promise<string | null> {
  if (!db) { cachedClientId = null; return null }
  try {
    const snap = await getDoc(doc(db, ...PUBLIC_DOC))
    cachedClientId = (snap.data()?.clientId as string | undefined)?.trim() || null
  } catch {
    cachedClientId = null
  }
  return cachedClientId
}

export function getCachedClientId(): string | null {
  return cachedClientId ?? null
}

export async function saveGoogleOAuthConfig(clientId: string, clientSecret: string): Promise<void> {
  const fn = getCallable<{ clientId: string; clientSecret: string }, { ok: true }>('setgoogleoauthconfig')
  await fn({ clientId: clientId.trim(), clientSecret: clientSecret.trim() })
  cachedClientId = clientId.trim()
}
