import { getFunctionUrl, getFunctionHeaders } from '../lib/functionsUrl'

export function makeBasicAuth(appleId: string, password: string): string {
  return 'Basic ' + btoa(`${appleId}:${password}`)
}

export async function caldavRequest(
  url: string, method: string, auth: string,
  xmlBody?: string, depth = '1', contentType?: string,
): Promise<string> {
  const res = await fetch(getFunctionUrl('caldav-proxy'), {
    method: 'POST',
    headers: getFunctionHeaders({ 'x-caldav-auth': auth }),
    body: JSON.stringify({ url, caldavMethod: method, xmlBody, depth, contentType }),
  })
  if (res.status === 401) throw new Error('Credenciales incorrectas')
  if (res.status === 403) throw new Error('Acceso denegado')
  if (!res.ok) throw new Error(`Error CalDAV ${res.status}`)
  return res.text()
}
