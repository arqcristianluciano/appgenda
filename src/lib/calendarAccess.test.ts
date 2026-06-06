import { describe, it, expect } from 'vitest'
import {
  selectWritableSources, isSourceReadOnly, isGoogleAccessReadOnly,
  dedupeSourcesByCalendar, canonicalSourceMap, isCanonicalSource,
} from './calendarAccess'
import type { CalendarSource } from '../types'

const src = (over: Partial<CalendarSource> & { id: string }): CalendarSource => ({
  name: 'Cal', type: 'google', color: '#000', enabled: true, ...over,
})

describe('selectWritableSources', () => {
  it('incluye los calendarios activos y escribibles', () => {
    const out = selectWritableSources([
      src({ id: 'local', type: 'local' }),
      src({ id: 'g1', type: 'google' }),
      src({ id: 'i1', type: 'icloud' }),
    ])
    expect(out.map(s => s.id)).toEqual(['local', 'g1', 'i1'])
  })

  it('excluye los calendarios de solo lectura (p. ej. festivos de Google)', () => {
    const out = selectWritableSources([
      src({ id: 'mio', type: 'google' }),
      src({ id: 'festivos', type: 'google', readOnly: true }),
    ])
    expect(out.map(s => s.id)).toEqual(['mio'])
  })

  it('excluye los calendarios desactivados', () => {
    const out = selectWritableSources([
      src({ id: 'on', enabled: true }),
      src({ id: 'off', enabled: false }),
    ])
    expect(out.map(s => s.id)).toEqual(['on'])
  })

  it('excluye tipos derivados que no son destino de escritura', () => {
    const out = selectWritableSources([
      src({ id: 'fin', type: 'finances' }),
      src({ id: 'tasks', type: 'tasks' }),
      src({ id: 'local', type: 'local' }),
    ])
    expect(out.map(s => s.id)).toEqual(['local'])
  })

  it('ofrece el mismo calendario una sola vez aunque llegue por dos cuentas', () => {
    const out = selectWritableSources([
      src({ id: 'gcal_B_A', accountEmail: 'b@x.com', calendarId: 'a@x.com' }),
      src({ id: 'gcal_A_A', accountEmail: 'a@x.com', calendarId: 'a@x.com' }),
    ])
    // Una sola entrada, la de la cuenta dueña (donde el calendario es primario)
    expect(out.map(s => s.id)).toEqual(['gcal_A_A'])
  })
})

// Escenario real: dos cuentas conectadas y el calendario de una compartido en la
// otra → la misma entrada llega por ambas con el mismo calendarId.
const shared = [
  src({ id: 'gcal_B_A', accountEmail: 'b@x.com', calendarId: 'a@x.com' }), // copia compartida vista por B
  src({ id: 'gcal_A_A', accountEmail: 'a@x.com', calendarId: 'a@x.com' }), // primario de la cuenta dueña A
]

describe('dedupeSourcesByCalendar', () => {
  it('colapsa el mismo calendario a la fuente de la cuenta dueña', () => {
    expect(dedupeSourcesByCalendar(shared).map(s => s.id)).toEqual(['gcal_A_A'])
  })

  it('prefiere la fuente escribible cuando ninguna es la cuenta dueña', () => {
    const out = dedupeSourcesByCalendar([
      src({ id: 'ro', accountEmail: 'b@x.com', calendarId: 'grupo@g.com', readOnly: true }),
      src({ id: 'rw', accountEmail: 'c@x.com', calendarId: 'grupo@g.com' }),
    ])
    expect(out.map(s => s.id)).toEqual(['rw'])
  })

  it('no fusiona calendarios distintos', () => {
    const out = dedupeSourcesByCalendar([
      src({ id: 'g1', calendarId: 'uno@x.com' }),
      src({ id: 'g2', calendarId: 'dos@x.com' }),
    ])
    expect(out.map(s => s.id)).toEqual(['g1', 'g2'])
  })

  it('deja intactas las fuentes sin calendarId (local, finanzas, etc.)', () => {
    const out = dedupeSourcesByCalendar([
      src({ id: 'local', type: 'local' }),
      src({ id: 'fin', type: 'finances' }),
    ])
    expect(out.map(s => s.id)).toEqual(['local', 'fin'])
  })
})

describe('canonicalSourceMap / isCanonicalSource', () => {
  it('mapea ambas fuentes del calendario compartido a la canónica', () => {
    const map = canonicalSourceMap(shared)
    expect(map.get('gcal_B_A')?.id).toBe('gcal_A_A')
    expect(map.get('gcal_A_A')?.id).toBe('gcal_A_A')
  })

  it('solo la fuente de la cuenta dueña es canónica', () => {
    expect(isCanonicalSource(shared, shared[1])).toBe(true)  // gcal_A_A
    expect(isCanonicalSource(shared, shared[0])).toBe(false) // gcal_B_A (compartida)
  })
})

describe('isSourceReadOnly', () => {
  const sources = [src({ id: 'rw' }), src({ id: 'ro', readOnly: true })]

  it('es true cuando el calendario de origen es de solo lectura', () => {
    expect(isSourceReadOnly(sources, 'ro')).toBe(true)
  })
  it('es false cuando el calendario permite escritura', () => {
    expect(isSourceReadOnly(sources, 'rw')).toBe(false)
  })
  it('es false sin calendarSourceId o si no existe la fuente', () => {
    expect(isSourceReadOnly(sources, undefined)).toBe(false)
    expect(isSourceReadOnly(sources, 'desconocido')).toBe(false)
  })
})

describe('isGoogleAccessReadOnly', () => {
  it('marca reader y freeBusyReader como solo lectura', () => {
    expect(isGoogleAccessReadOnly('reader')).toBe(true)
    expect(isGoogleAccessReadOnly('freeBusyReader')).toBe(true)
  })
  it('deja owner y writer como escribibles', () => {
    expect(isGoogleAccessReadOnly('owner')).toBe(false)
    expect(isGoogleAccessReadOnly('writer')).toBe(false)
  })
  it('trata el campo ausente como escribible', () => {
    expect(isGoogleAccessReadOnly(undefined)).toBe(false)
  })
})
