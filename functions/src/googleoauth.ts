import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const googleClientId = defineSecret('GOOGLE_CLIENT_ID')
const googleClientSecret = defineSecret('GOOGLE_CLIENT_SECRET')

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

export const googleoauth = onCall<OAuthRequest, Promise<OAuthResponse>>(
  {
    region: 'us-east1',
    enforceAppCheck: true,
    secrets: [googleClientId, googleClientSecret],
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Login requerido')
    }

    const { action, code, refreshToken } = req.data
    const clientId = googleClientId.value()
    const clientSecret = googleClientSecret.value()

    if (!clientId || !clientSecret) {
      throw new HttpsError('failed-precondition', 'Google OAuth no configurado en el servidor')
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
