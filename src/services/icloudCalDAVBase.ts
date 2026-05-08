const PROXY = '/api/caldav-proxy'

export function makeBasicAuth(appleId: string, password: string): string {
  return 'Basic ' + btoa(`${appleId}:${password}`)
}

interface CalDAVOptions {
  url: string
  method: string
  auth: string
  xmlBody?: string
  depth?: string
  contentType?: string
}

const RETRYABLE_STATUS = new Set([0, 408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function doFetch(opts: CalDAVOptions): Promise<Response> {
  const { url, method, auth, xmlBody, depth = '1', contentType } = opts
  return fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body: JSON.stringify({ url, caldavMethod: method, xmlBody, depth, contentType }),
  })
}

function shouldRetry(status: number): boolean {
  return RETRYABLE_STATUS.has(status)
}

function backoffMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4000) + Math.random() * 250
}

async function requestWithRetry(opts: CalDAVOptions): Promise<Response> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await doFetch(opts)
      if (res.ok || !shouldRetry(res.status)) return res
      if (attempt === MAX_RETRIES) return res
    } catch (err) {
      lastErr = err
      if (attempt === MAX_RETRIES) throw err
    }
    await sleep(backoffMs(attempt))
  }
  throw lastErr ?? new Error('Error CalDAV')
}

export async function caldavRequest(
  url: string, method: string, auth: string,
  xmlBody?: string, depth = '1', contentType?: string,
): Promise<string> {
  const res = await requestWithRetry({ url, method, auth, xmlBody, depth, contentType })
  if (res.status === 401) throw new Error('Credenciales incorrectas')
  if (res.status === 403) throw new Error('Acceso denegado')
  if (!res.ok) throw new Error(`Error CalDAV ${res.status}`)
  return res.text()
}
