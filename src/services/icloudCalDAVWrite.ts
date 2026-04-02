import type { Evento, IcloudCalDAVConfig } from '../types'
import { makeBasicAuth, caldavRequest } from './icloudCalDAVBase'

type IcloudCalDAVCalendar = IcloudCalDAVConfig['calendars'][number]

function toICSDate(fecha: string, hora?: string): string {
  const d = fecha.replace(/-/g, '')
  if (!hora) return d
  return `${d}T${hora.replace(':', '')}00`
}

function buildICS(uid: string, evento: Partial<Evento>): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const allDay = evento.allDay || !evento.hora
  const dtstart = allDay
    ? `DTSTART;VALUE=DATE:${toICSDate(evento.fecha!)}`
    : `DTSTART:${toICSDate(evento.fecha!, evento.hora)}`
  const dtend = allDay
    ? `DTEND;VALUE=DATE:${toICSDate(evento.fechaFin || evento.fecha!)}`
    : `DTEND:${toICSDate(evento.fecha!, evento.horaFin || evento.hora)}`
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//APPgenda//EN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`,
    dtstart, dtend,
    `SUMMARY:${(evento.titulo || '').replace(/\n/g, '\\n')}`,
  ]
  if (evento.nota) lines.push(`DESCRIPTION:${evento.nota.replace(/\n/g, '\\n')}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export async function createIcloudEvent(
  cal: IcloudCalDAVCalendar, evento: Partial<Evento>,
  appleId: string, password: string,
): Promise<string> {
  const uid = `appgenda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ics = buildICS(uid, evento)
  const url = `${cal.url.replace(/\/$/, '')}/${uid}.ics`
  const auth = makeBasicAuth(appleId, password)
  await caldavRequest(url, 'PUT', auth, ics, '0', 'text/calendar; charset=utf-8')
  return uid
}

export async function updateIcloudEvent(
  cal: IcloudCalDAVCalendar, uid: string, evento: Partial<Evento>,
  appleId: string, password: string,
): Promise<void> {
  const ics = buildICS(uid, evento)
  const url = `${cal.url.replace(/\/$/, '')}/${uid}.ics`
  const auth = makeBasicAuth(appleId, password)
  await caldavRequest(url, 'PUT', auth, ics, '0', 'text/calendar; charset=utf-8')
}

export async function deleteIcloudEvent(
  cal: IcloudCalDAVCalendar, uid: string,
  appleId: string, password: string,
): Promise<void> {
  const url = `${cal.url.replace(/\/$/, '')}/${uid}.ics`
  const auth = makeBasicAuth(appleId, password)
  await caldavRequest(url, 'DELETE', auth, undefined, '0')
}
