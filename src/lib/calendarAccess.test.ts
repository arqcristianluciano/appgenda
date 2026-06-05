import { describe, it, expect } from 'vitest'
import { selectWritableSources, isSourceReadOnly, isGoogleAccessReadOnly } from './calendarAccess'
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
