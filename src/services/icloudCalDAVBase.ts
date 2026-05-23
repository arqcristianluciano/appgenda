import { getCallable } from '../lib/functionsUrl'

interface CalDavReq {
  url: string
  caldavMethod: string
  auth: string
  xmlBody?: string
  depth?: string
  contentType?: string
}
interface CalDavRes {
  status: number
  body: string
  contentType?: string
}

const caldavCallable = () => getCallable<CalDavReq, CalDavRes>('caldavproxy')

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const backoffMs = (attempt: number) => Math.min(500 * 2 ** attempt, 4000) + Math.random() * 250

export function makeBasicAuth(appleId: string, password: string): string {
  return 'Basic ' + btoa(`${appleId}:${password}`)
}

export async function caldavRequest(
  url: string, method: string, auth: string,
  xmlBody?: string, depth = '1', contentType?: string,
): Promise<string> {
  const fn = caldavCallable()
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let status: number, body: string
    try {
      const res = await fn({ url, caldavMethod: method, auth, xmlBody, depth, contentType })
      status = res.data.status; body = res.data.body
    } catch (err) {
      // Error de red / función — reintentar con backoff
      lastErr = err
      if (attempt === MAX_RETRIES) throw err
      await sleep(backoffMs(attempt))
      continue
    }
    if (status === 401) throw new Error('Credenciales incorrectas')
    if (status === 403) throw new Error('Acceso denegado')
    if (RETRYABLE_STATUS.has(status) && attempt < MAX_RETRIES) {
      await sleep(backoffMs(attempt))
      continue
    }
    if (status < 200 || status >= 300) throw new Error(`Error CalDAV ${status}`)
    return body
  }
  throw lastErr ?? new Error('Error CalDAV')
}
