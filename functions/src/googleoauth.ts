import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) initializeApp()

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Las credenciales OAuth se guardan en Firestore (configurables desde la app),
// no en Secret Manager: así cambiarlas no requiere CLI ni redeploy. El clientId
// es público (lo usa el frontend para el popup) y vive en un doc legible; el
// clientSecret nunca se expone al cliente — solo lo lee este admin SDK.
const PUBLIC_DOC = 'app_config/google_oauth_public'
const SECRET_DOC = 'app_config/google_oauth_secret'

interface OAuthRequest {
  action: 'exchange' | 'refresh'
  code?: string
  refreshToken?: string
}

interface OAuthResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

async function resolveCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const fdb = getFirestore()
  const [pub, sec] = await Promise.all([
    fdb.doc(PUBLIC_DOC).get(),
    fdb.doc(SECRET_DOC).get(),
  ])
  const clientId = (pub.get('clientId') as string | undefined)?.trim() ?? ''
  const clientSecret = (sec.get('clientSecret') as string | undefined)?.trim() ?? ''
  return { clientId, clientSecret }
}

export const googleoauth = onCall<OAuthRequest, Promise<OAuthResponse>>(
  { region: 'us-east1' },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Login requerido')
    }

    const { action, code, refreshToken } = req.data
    const { clientId, clientSecret } = await resolveCredentials()

    if (!clientId || !clientSecret) {
      throw new HttpsError('failed-precondition', 'Google OAuth no configurado: cargá las credenciales en Ajustes de calendario')
    }

    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret })

    if (action === 'exchange' && code) {
      params.set('code', code)
      params.set('grant_type', 'authorization_code')
      params.set('redirect_uri', 'postmessage')
    } else if (action === 'refresh' && refreshToken) {
      params.set('refresh_token', refreshToken)
      params.set('grant_type', 'refresh_token')
    } else {
      throw new HttpsError('invalid-argument', 'Parámetros inválidos')
    }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const msg = (data.error_description as string) ?? (data.error as string) ?? 'Error OAuth'
      throw new HttpsError('unknown', msg)
    }
    return data as unknown as OAuthResponse
  }
)

interface SetConfigRequest {
  clientId?: string
  clientSecret?: string
}

// Guarda las credenciales OAuth en Firestore. El clientSecret se escribe en un
// doc que las reglas niegan al cliente, así que pasar por este callable (admin
// SDK) es la única vía. Cualquier usuario autenticado puede configurarlo: es
// una app de uso acotado y la config es a nivel de aplicación.
export const setgoogleoauthconfig = onCall<SetConfigRequest, Promise<{ ok: true }>>(
  { region: 'us-east1' },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Login requerido')
    }
    const clientId = (req.data.clientId ?? '').trim()
    const clientSecret = (req.data.clientSecret ?? '').trim()
    if (!clientId || !clientSecret) {
      throw new HttpsError('invalid-argument', 'Faltan client_id o client_secret')
    }

    const fdb = getFirestore()
    const meta = { updatedBy: req.auth.uid, updatedAt: Date.now() }
    await Promise.all([
      fdb.doc(PUBLIC_DOC).set({ clientId, ...meta }),
      fdb.doc(SECRET_DOC).set({ clientSecret, ...meta }),
    ])
    return { ok: true }
  }
)
