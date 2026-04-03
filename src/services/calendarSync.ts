import type { Evento } from '../types'
import { useStore } from '../store/useStore'
import { useCalendarStore } from '../store/useCalendarStore'
import {
  createGoogleEvent, updateGoogleEvent, deleteGoogleEvent,
  getValidToken,
  type NewGoogleEvent,
} from './googleCalendar'
import {
  createIcloudEvent, updateIcloudEvent, deleteIcloudEvent,
  type IcloudCalDAVCalendar,
} from './icloudCalDAV'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

function buildGoogleEvent(ev: Partial<Evento>): NewGoogleEvent {
  if (ev.allDay) {
    return {
      summary: ev.titulo || '',
      description: ev.nota,
      start: { date: ev.fecha! },
      end: { date: ev.fechaFin || ev.fecha! },
    }
  }
  return {
    summary: ev.titulo || '',
    description: ev.nota,
    start: { dateTime: `${ev.fecha}T${ev.hora || '00:00'}:00`, timeZone: TZ },
    end: { dateTime: `${ev.fecha}T${ev.horaFin || ev.hora || '01:00'}:00`, timeZone: TZ },
  }
}

async function getGoogleToken(email: string): Promise<string> {
  return getValidToken(email)
}

function extractGoogleCalId(sourceId: string, email: string): string {
  const prefix = `gcal_${email}_`
  return sourceId.startsWith(prefix) ? sourceId.slice(prefix.length) : 'primary'
}

function getIcloudCreds() {
  const cfg = useStore.getState().data.calendarConfig?.icloudAuth
  if (!cfg?.appleId) throw new Error('No hay credenciales iCloud configuradas')
  return cfg
}

function findIcloudCal(calSourceId: string): IcloudCalDAVCalendar {
  const cfg = getIcloudCreds()
  const url = decodeURIComponent(calSourceId.replace('icloud_', ''))
  const cal = cfg.calendars.find(c => c.url === url)
  if (!cal) throw new Error('Calendario iCloud no encontrado')
  return cal
}

export async function syncCreateEvent(
  evento: Partial<Evento>, targetSourceId: string,
): Promise<Evento> {
  const source = useCalendarStore.getState().sources.find(s => s.id === targetSourceId)
  if (!source) throw new Error('Fuente de calendario no encontrada')

  if (source.type === 'google') {
    const email = source.accountEmail!
    const token = await getGoogleToken(email)
    const calId = extractGoogleCalId(source.id, email)
    const gEvent = buildGoogleEvent(evento)
    const created = await createGoogleEvent(calId, gEvent, token)
    return {
      ...evento as Evento,
      id: `gcal_${created.id}`,
      source: 'google',
      sourceId: created.id,
      calendarSourceId: source.id,
      color: source.color,
    }
  }

  if (source.type === 'icloud') {
    const { appleId, password } = getIcloudCreds()
    const cal = findIcloudCal(source.id)
    const uid = await createIcloudEvent(cal, evento, appleId, password)
    return {
      ...evento as Evento,
      id: `icloud_${uid}`,
      source: 'icloud',
      sourceId: uid,
      calendarSourceId: source.id,
      color: source.color,
    }
  }

  throw new Error(`Tipo de fuente no soportada: ${source.type}`)
}

export async function syncUpdateEvent(evento: Evento): Promise<void> {
  if (evento.source === 'google' && evento.calendarSourceId) {
    const source = useCalendarStore.getState().sources.find(s => s.id === evento.calendarSourceId)
    const email = source?.accountEmail
    if (!email || !evento.sourceId) return
    const token = await getGoogleToken(email)
    const calId = extractGoogleCalId(source.id, email)
    await updateGoogleEvent(calId, evento.sourceId, buildGoogleEvent(evento), token)
    return
  }

  if (evento.source === 'icloud' && evento.calendarSourceId && evento.sourceId) {
    const { appleId, password } = getIcloudCreds()
    const cal = findIcloudCal(evento.calendarSourceId)
    await updateIcloudEvent(cal, evento.sourceId, evento, appleId, password)
  }
}

export async function syncDeleteEvent(evento: Evento): Promise<void> {
  if (evento.source === 'google' && evento.calendarSourceId) {
    const source = useCalendarStore.getState().sources.find(s => s.id === evento.calendarSourceId)
    const email = source?.accountEmail
    if (!email || !evento.sourceId) return
    const token = await getGoogleToken(email)
    const calId = extractGoogleCalId(source.id, email)
    await deleteGoogleEvent(calId, evento.sourceId, token)
    return
  }

  if (evento.source === 'icloud' && evento.calendarSourceId && evento.sourceId) {
    const { appleId, password } = getIcloudCreds()
    const cal = findIcloudCal(evento.calendarSourceId)
    await deleteIcloudEvent(cal, evento.sourceId, appleId, password)
  }
}
