import { onCall, HttpsError } from 'firebase-functions/v2/https'

// El (\/|$) final ancla el host: evita que `https://icloud.com.evil.com` pase el allowlist.
const ALLOWED_PATTERN = /^https:\/\/([\w-]+\.)*icloud\.com(\/|$)/

interface CalDavRequest {
  url: string
  caldavMethod?: string
  auth: string
  xmlBody?: string
  depth?: string
  contentType?: string
}

interface CalDavResponse {
  status: number
  body: string
  contentType?: string
}

async function fetchFollowingRedirects(
  url: string,
  options: RequestInit,
  maxRedirects = 5,
): Promise<Response> {
  let currentUrl = url
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(currentUrl, { ...options, redirect: 'manual' })
    const isRedirect = res.status >= 300 && res.status < 400
    if (!isRedirect) return res
    const location = res.headers.get('Location')
    if (!location) return res
    currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href
    if (!ALLOWED_PATTERN.test(currentUrl)) {
      throw new HttpsError('permission-denied', 'Redirect to disallowed host')
    }
  }
  throw new HttpsError('deadline-exceeded', 'Too many redirects')
}

export const caldavproxy = onCall<CalDavRequest, Promise<CalDavResponse>>(
  { region: 'us-east1', enforceAppCheck: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Login requerido')
    }

    const { url, caldavMethod = 'PROPFIND', xmlBody, depth = '1', contentType, auth } = req.data

    if (!url || !auth) {
      throw new HttpsError('invalid-argument', 'Missing url or auth')
    }
    if (!ALLOWED_PATTERN.test(url)) {
      throw new HttpsError('permission-denied', 'Forbidden')
    }

    const upstream = await fetchFollowingRedirects(url, {
      method: caldavMethod,
      headers: {
        Authorization: auth,
        'Content-Type': contentType || 'application/xml; charset=utf-8',
        ...(caldavMethod !== 'DELETE' ? { Depth: depth } : {}),
      },
      body: xmlBody || undefined,
    })

    const text = await upstream.text()
    return {
      status: upstream.status,
      body: text,
      contentType: upstream.headers.get('Content-Type') || undefined,
    }
  }
)
