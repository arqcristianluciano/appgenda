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

export function makeBasicAuth(appleId: string, password: string): string {
  return 'Basic ' + btoa(`${appleId}:${password}`)
}

export async function caldavRequest(
  url: string, method: string, auth: string,
  xmlBody?: string, depth = '1', contentType?: string,
): Promise<string> {
  const fn = caldavCallable()
  const res = await fn({ url, caldavMethod: method, auth, xmlBody, depth, contentType })
  const { status, body } = res.data
  if (status === 401) throw new Error('Credenciales incorrectas')
  if (status === 403) throw new Error('Acceso denegado')
  if (status < 200 || status >= 300) throw new Error(`Error CalDAV ${status}`)
  return body
}
