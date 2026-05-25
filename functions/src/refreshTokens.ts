import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) initializeApp()

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Mismas credenciales que usa googleoauth: viven en Firestore (configurables
// desde la app), no en Secret Manager.
const PUBLIC_DOC = 'app_config/google_oauth_public'
const SECRET_DOC = 'app_config/google_oauth_secret'

interface CalendarConfig {
  googleRefreshTokens?: Record<string, string>
  googleTokens?: Record<string, string>
  googleTokenExpiry?: Record<string, number>
}

async function resolveCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const fdb = getFirestore()
  const [pub, sec] = await Promise.all([
    fdb.doc(PUBLIC_DOC).get(),
    fdb.doc(SECRET_DOC).get(),
  ])
  return {
    clientId: ((pub.get('clientId') as string | undefined) ?? '').trim(),
    clientSecret: ((sec.get('clientSecret') as string | undefined) ?? '').trim(),
  }
}

// Renueva a diario, en el servidor, todos los refresh tokens de Google Calendar
// guardados — aunque nadie abra la app. Google caduca un refresh token tras ~6
// meses sin uso; usarlo periódicamente reinicia ese reloj, así la sincronización
// nunca se pierde por inactividad. De paso guarda el access token nuevo en
// Firestore para que la app cargue con una sesión fresca.
export const refreshGoogleTokens = onSchedule(
  {
    schedule: 'every 24 hours',
    region: 'us-east1',
    timeoutSeconds: 540,
    memory: '256MiB',
  },
  async () => {
    const fdb = getFirestore()
    const { clientId, clientSecret } = await resolveCredentials()
    if (!clientId || !clientSecret) {
      console.warn('refreshGoogleTokens: sin credenciales OAuth configuradas; omitido')
      return
    }

    const snap = await fdb.collection('calendar_configs').get()
    let ok = 0
    let fail = 0

    for (const docSnap of snap.docs) {
      const config = (docSnap.get('config') ?? {}) as CalendarConfig
      const refreshTokens = config.googleRefreshTokens ?? {}
      const emails = Object.keys(refreshTokens)
      if (emails.length === 0) continue

      const tokens: Record<string, string> = { ...(config.googleTokens ?? {}) }
      const expiry: Record<string, number> = { ...(config.googleTokenExpiry ?? {}) }
      let changed = false

      for (const email of emails) {
        const refreshToken = refreshTokens[email]
        if (!refreshToken) continue
        try {
          const res = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }),
          })
          const data = (await res.json()) as {
            access_token?: string
            expires_in?: number
            error?: string
          }
          if (!res.ok || !data.access_token) {
            fail++
            console.warn(`refreshGoogleTokens: fallo ${docSnap.id} / ${email}: ${data.error ?? res.status}`)
            continue
          }
          tokens[email] = data.access_token
          expiry[email] = Date.now() + (data.expires_in ?? 3600) * 1000
          changed = true
          ok++
        } catch (e) {
          fail++
          console.warn(`refreshGoogleTokens: error ${docSnap.id} / ${email}`, e)
        }
      }

      if (changed) {
        await docSnap.ref.update({
          'config.googleTokens': tokens,
          'config.googleTokenExpiry': expiry,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    console.info(`refreshGoogleTokens: renovados=${ok} fallidos=${fail}`)
  },
)
