import { describe, it, expect } from 'vitest'
import { parseICSBlock } from './icloudCalDAV'

const wrap = (vevents: string) => [
  'BEGIN:VCALENDAR', 'VERSION:2.0', vevents, 'END:VCALENDAR',
].join('\r\n')

const simple = wrap([
  'BEGIN:VEVENT',
  'UID:evento-simple',
  'DTSTART:20260710T140000Z',
  'DTEND:20260710T150000Z',
  'SUMMARY:Reunión única',
  'END:VEVENT',
].join('\r\n'))

// Así entrega iCloud una serie expandida (<C:expand>): un VEVENT por
// ocurrencia, mismo UID, cada una con RECURRENCE-ID y sin RRULE.
const expandida = wrap([
  'BEGIN:VEVENT',
  'UID:serie-gym',
  'RECURRENCE-ID:20260706T120000Z',
  'DTSTART:20260706T120000Z',
  'DTEND:20260706T130000Z',
  'SUMMARY:Gimnasio',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:serie-gym',
  'RECURRENCE-ID:20260713T120000Z',
  'DTSTART:20260713T120000Z',
  'DTEND:20260713T130000Z',
  'SUMMARY:Gimnasio',
  'END:VEVENT',
].join('\r\n'))

const conRrule = wrap([
  'BEGIN:VEVENT',
  'UID:serie-master',
  'DTSTART:20260706T120000Z',
  'DTEND:20260706T130000Z',
  'RRULE:FREQ=WEEKLY;BYDAY=MO',
  'SUMMARY:Serie sin expandir',
  'END:VEVENT',
].join('\r\n'))

// Servidor que expande sin poner RECURRENCE-ID: el UID repetido debe bastar
// para detectar la serie.
const uidRepetidoSinMarcas = wrap([
  'BEGIN:VEVENT',
  'UID:serie-anonima',
  'DTSTART:20260706T120000Z',
  'SUMMARY:Serie',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:serie-anonima',
  'DTSTART:20260713T120000Z',
  'SUMMARY:Serie',
  'END:VEVENT',
].join('\r\n'))

describe('parseICSBlock — protección de eventos recurrentes de iCloud', () => {
  it('un evento único no se marca como recurrente y conserva su id', () => {
    const [ev] = parseICSBlock(simple, '#fff', 'cal1')
    expect(ev.recurring).toBeUndefined()
    expect(ev.id).toBe('icloud_evento-simple')
    expect(ev.sourceId).toBe('evento-simple')
  })

  it('las ocurrencias expandidas quedan marcadas recurring y con ids distintos', () => {
    const evts = parseICSBlock(expandida, '#fff', 'cal1')
    expect(evts).toHaveLength(2)
    expect(evts.every(e => e.recurring)).toBe(true)
    expect(new Set(evts.map(e => e.id)).size).toBe(2)
    // sourceId conserva el UID real para poder identificar el recurso
    expect(evts.every(e => e.sourceId === 'serie-gym')).toBe(true)
    expect(evts.map(e => e.fecha)).toEqual(['2026-07-06', '2026-07-13'])
  })

  it('un master con RRULE queda marcado recurring', () => {
    const [ev] = parseICSBlock(conRrule, '#fff', 'cal1')
    expect(ev.recurring).toBe(true)
  })

  it('UID repetido sin RRULE ni RECURRENCE-ID también se detecta como serie', () => {
    const evts = parseICSBlock(uidRepetidoSinMarcas, '#fff', 'cal1')
    expect(evts).toHaveLength(2)
    expect(evts.every(e => e.recurring)).toBe(true)
    expect(new Set(evts.map(e => e.id)).size).toBe(2)
  })
})
