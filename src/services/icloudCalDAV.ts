import type { Evento } from '../types'

const PROXY = '/api/caldav-proxy'
const AUTH_KEY = 'icloud_caldav_auth'

export interface IcloudCalDAVCalendar {
  url: string
  name: string
  color: string
}

export interface IcloudAuthConfig {
  appleId: string
  password: string
  calendars: IcloudCalDAVCalendar[]
}

export function getIcloudAuth(): IcloudAuthConfig | null {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null') } catch { return null }
}

export function saveIcloudAuth(config: IcloudAuthConfig): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(config))
}

export function clearIcloudAuth(): void {
  localStorage.removeItem(AUTH_KEY)
}

function makeBasicAuth(appleId: string, password: string): string {
  return 'Basic ' + btoa(`${appleId}:${password}`)
}

async function caldavRequest(
  url: string, method: string, auth: string, xmlBody?: string, depth = '1',
): Promise<string> {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body: JSON.stringify({ url, caldavMethod: method, xmlBody, depth }),
  })
  if (res.status === 401) throw new Error('Credenciales incorrectas')
  if (res.status === 403) throw new Error('Acceso denegado')
  if (!res.ok) throw new Error(`Error CalDAV ${res.status}`)
  return res.text()
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

function getHref(el: Element | Document, tagNS: string, tag: string): string {
  const parent = el instanceof Document ? el.documentElement : el
  const found = parent.getElementsByTagNameNS(tagNS, tag)[0]
  return found?.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent?.trim() || ''
}

function resolveUrl(href: string, base = 'https://caldav.icloud.com'): string {
  return href.startsWith('http') ? href : `${base}${href}`
}

const CALDAV_NS = 'urn:ietf:params:xml:ns:caldav'
const APPLE_NS = 'http://apple.com/ns/ical/'

export async function discoverPrincipal(appleId: string, password: string): Promise<string> {
  const auth = makeBasicAuth(appleId, password)
  const xml = `<?xml version="1.0" encoding="UTF-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:current-user-principal/></D:prop></D:propfind>`
  const text = await caldavRequest('https://caldav.icloud.com/', 'PROPFIND', auth, xml, '0')
  const doc = parseXml(text)
  const href = getHref(doc, 'DAV:', 'current-user-principal')
  if (!href) throw new Error('No se pudo obtener el principal (verifica tus credenciales)')
  return resolveUrl(href)
}

export async function discoverCalendars(
  principalUrl: string, appleId: string, password: string,
): Promise<IcloudCalDAVCalendar[]> {
  const auth = makeBasicAuth(appleId, password)
  const baseUrl = new URL(principalUrl).origin

  const homeXml = `<?xml version="1.0" encoding="UTF-8"?><D:propfind xmlns:D="DAV:" xmlns:C="${CALDAV_NS}"><D:prop><C:calendar-home-set/></D:prop></D:propfind>`
  const homeText = await caldavRequest(principalUrl, 'PROPFIND', auth, homeXml, '0')
  const homeDoc = parseXml(homeText)
  const homeHref = getHref(homeDoc, CALDAV_NS, 'calendar-home-set')
  if (!homeHref) throw new Error('No se encontró el home de calendarios')
  const homeUrl = resolveUrl(homeHref, baseUrl)

  const calsXml = `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="${CALDAV_NS}" xmlns:CS="${APPLE_NS}">
  <D:prop>
    <D:displayname/><D:resourcetype/>
    <CS:calendar-color/>
    <C:supported-calendar-component-set/>
  </D:prop>
</D:propfind>`
  const calsText = await caldavRequest(homeUrl, 'PROPFIND', auth, calsXml, '1')
  const calsDoc = parseXml(calsText)

  const results: IcloudCalDAVCalendar[] = []
  for (const resp of Array.from(calsDoc.getElementsByTagNameNS('DAV:', 'response'))) {
    const href = resp.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent?.trim()
    if (!href) continue
    const rt = resp.getElementsByTagNameNS('DAV:', 'resourcetype')[0]
    if (!rt?.getElementsByTagNameNS(CALDAV_NS, 'calendar').length) continue
    const comps = Array.from(resp.getElementsByTagNameNS(CALDAV_NS, 'comp'))
    const hasVevent = comps.some(c => c.getAttribute('name') === 'VEVENT')
    if (comps.length > 0 && !hasVevent) continue
    const name = resp.getElementsByTagNameNS('DAV:', 'displayname')[0]?.textContent?.trim() || 'Calendario'
    const colorRaw = resp.getElementsByTagNameNS(APPLE_NS, 'calendar-color')[0]?.textContent?.trim() || '#A855F7'
    const color = colorRaw.slice(0, 7)
    results.push({ url: resolveUrl(href, baseUrl), name, color })
  }
  return results
}

function parseDateStr(raw: string): { date: string; time: string } {
  const v = raw.replace('Z', '').replace(/[+-]\d{4}$/, '')
  return {
    date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`,
    time: v.length > 8 ? `${v.slice(9, 11)}:${v.slice(11, 13)}` : '',
  }
}

function icsToEvento(fields: Record<string, string>, color: string, calSourceId: string): Evento {
  const dtstart = fields.DTSTART || ''
  const dtend = fields.DTEND || dtstart
  const allDay = dtstart.length === 8
  const start = parseDateStr(dtstart)
  const end = parseDateStr(dtend)
  return {
    id: `icloud_${fields.UID}`,
    titulo: fields.SUMMARY || '(Sin título)',
    fecha: start.date,
    fechaFin: end.date !== start.date ? end.date : undefined,
    hora: start.time,
    horaFin: end.time || undefined,
    nota: fields.DESCRIPTION || '',
    allDay,
    color,
    source: 'icloud' as const,
    sourceId: fields.UID,
    calendarSourceId: calSourceId,
  }
}

function parseICSBlock(icsText: string, color: string, calSourceId: string): Evento[] {
  const lines = icsText.replace(/\r\n[ \t]/g, '').split(/\r?\n/)
  const events: Evento[] = []
  let cur: Record<string, string> | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') { cur = {}; continue }
    if (line === 'END:VEVENT') {
      if (cur?.UID && cur.DTSTART) events.push(icsToEvento(cur, color, calSourceId))
      cur = null; continue
    }
    if (!cur) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const prop = line.slice(0, colon).split(';')[0]
    const val = line.slice(colon + 1).trim().replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\;/g, ';')
    cur[prop] = val
  }
  return events
}

export async function fetchCalendarEvents(
  cal: IcloudCalDAVCalendar, appleId: string, password: string,
): Promise<Evento[]> {
  const auth = makeBasicAuth(appleId, password)
  const now = new Date()
  const toBasic = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const start = toBasic(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const end = toBasic(new Date(now.getFullYear(), now.getMonth() + 6, 0))
  const reportXml = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:C="${CALDAV_NS}" xmlns:D="DAV:">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`
  const text = await caldavRequest(cal.url, 'REPORT', auth, reportXml, '1')
  const doc = parseXml(text)
  const calSourceId = `icloud_${encodeURIComponent(cal.url)}`
  const events: Evento[] = []
  for (const resp of Array.from(doc.getElementsByTagNameNS('DAV:', 'response'))) {
    const calData = resp.getElementsByTagNameNS(CALDAV_NS, 'calendar-data')[0]
    if (calData?.textContent) events.push(...parseICSBlock(calData.textContent, cal.color, calSourceId))
  }
  return events
}
