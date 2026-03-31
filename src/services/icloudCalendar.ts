import type { Evento } from '../types'

const CORS_PROXY = 'https://corsproxy.io/?'

function normalizeUrl(url: string): string {
  return url.replace(/^webcal:\/\//i, 'https://')
}

async function fetchICS(url: string): Promise<string> {
  const normalized = normalizeUrl(url)
  const direct = await fetch(normalized).catch(() => null)
  if (direct?.ok) return direct.text()
  const proxied = `${CORS_PROXY}${encodeURIComponent(normalized)}`
  const res = await fetch(proxied)
  if (!res.ok) throw new Error(`Error al obtener el calendario (${res.status})`)
  return res.text()
}

interface ICSEvent {
  uid: string
  summary: string
  description: string
  dtstart: string
  dtend: string
  allDay: boolean
}

function parseDateValue(raw: string): { date: string; time: string; allDay: boolean } {
  const value = raw.replace('Z', '').replace(/[+-]\d{4}$/, '')
  if (value.length === 8) {
    return {
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      time: '',
      allDay: true,
    }
  }
  return {
    date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
    time: `${value.slice(9, 11)}:${value.slice(11, 13)}`,
    allDay: false,
  }
}

function parseICS(text: string): ICSEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, '').split(/\r?\n/)
  const events: ICSEvent[] = []
  let cur: Partial<ICSEvent> | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') { cur = {}; continue }
    if (line === 'END:VEVENT') {
      if (cur?.uid && cur.dtstart) events.push(cur as ICSEvent)
      cur = null
      continue
    }
    if (!cur) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const prop = line.slice(0, colon).split(';')[0]
    const val = line.slice(colon + 1).trim()
      .replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\;/g, ';')

    if (prop === 'UID') cur.uid = val
    else if (prop === 'SUMMARY') cur.summary = val
    else if (prop === 'DESCRIPTION') cur.description = val
    else if (prop === 'DTSTART') {
      cur.dtstart = val
      cur.allDay = line.includes('VALUE=DATE') || val.length === 8
    } else if (prop === 'DTEND') cur.dtend = val
  }
  return events
}

export async function loadIcloudEvents(url: string, color: string): Promise<Evento[]> {
  const text = await fetchICS(url)
  return parseICS(text).map(e => {
    const start = parseDateValue(e.dtstart)
    const end = e.dtend ? parseDateValue(e.dtend) : start
    return {
      id: `icloud_${e.uid}`,
      titulo: e.summary || '(Sin título)',
      fecha: start.date,
      fechaFin: end.date !== start.date ? end.date : undefined,
      hora: start.time,
      horaFin: end.time || undefined,
      nota: e.description || '',
      allDay: start.allDay,
      color,
      source: 'icloud' as const,
      sourceId: e.uid,
    }
  })
}
