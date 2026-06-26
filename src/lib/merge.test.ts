import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  trunc2, fmtNum, fmtMoney, fmtPct,
  nextMes, mesLabel, getFechaStatus, ensureMonths,
  mergeData,
} from './merge'
import type { AppData } from '../types'

describe('trunc2', () => {
  it('trunca a 2 decimales sin redondear', () => {
    expect(trunc2(1.999)).toBe(1.99)
    expect(trunc2(1.005)).toBe(1)
    expect(trunc2(100)).toBe(100)
  })
  it('trunca hacia cero en negativos', () => {
    expect(trunc2(-1.999)).toBe(-1.99)
  })
})

describe('fmtNum', () => {
  it('formatea con separador de miles y 2 decimales', () => {
    expect(fmtNum(1234.5)).toBe('1,234.50')
    expect(fmtNum(1000000)).toBe('1,000,000.00')
    expect(fmtNum(0)).toBe('0.00')
    expect(fmtNum(999)).toBe('999.00')
  })
  it('mantiene el signo negativo', () => {
    expect(fmtNum(-1234.567)).toBe('-1,234.56')
  })
})

describe('fmtMoney', () => {
  it('antepone el prefijo de moneda', () => {
    expect(fmtMoney(1234.5, 'USD')).toBe('US$1,234.50')
    expect(fmtMoney(1234.5, 'DOP')).toBe('RD$1,234.50')
  })
  it('muestra cero como monto válido', () => {
    expect(fmtMoney(0, 'USD')).toBe('US$0.00')
  })
  it('muestra guion para valores no numéricos', () => {
    expect(fmtMoney(NaN, 'USD')).toBe('—')
  })
})

describe('fmtPct', () => {
  it('antepone + en positivos', () => {
    expect(fmtPct(5.5)).toBe('+5.50')
    expect(fmtPct(0)).toBe('+0.00')
  })
  it('mantiene el - en negativos sin doble signo', () => {
    expect(fmtPct(-3.2)).toBe('-3.20')
  })
})

describe('nextMes', () => {
  it('avanza un mes', () => {
    expect(nextMes('2026-01')).toBe('2026-02')
    expect(nextMes('2026-05')).toBe('2026-06')
  })
  it('cruza el cambio de año', () => {
    expect(nextMes('2026-12')).toBe('2027-01')
  })
})

describe('mesLabel', () => {
  it('devuelve mes capitalizado + año', () => {
    expect(mesLabel('2026-05')).toBe('Mayo 2026')
    expect(mesLabel('2026-01')).toBe('Enero 2026')
    expect(mesLabel('2026-12')).toBe('Diciembre 2026')
  })
})

describe('getFechaStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-23T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('retorna null para fecha vacía', () => {
    expect(getFechaStatus('')).toBeNull()
  })
  it('marca fechas pasadas como vencido', () => {
    expect(getFechaStatus('2026-05-22')).toBe('vencido')
    expect(getFechaStatus('2026-01-01')).toBe('vencido')
  })
  it('marca la fecha de hoy', () => {
    expect(getFechaStatus('2026-05-23')).toBe('hoy')
  })
  it('retorna null para fechas futuras', () => {
    expect(getFechaStatus('2026-05-24')).toBeNull()
  })
})

describe('ensureMonths', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-23T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  const base = (pagos: AppData['pagos']): AppData => ({
    nextId: 0, nextPagoId: 500, nextInvId: 0,
    proyectos: [], tareas: [], deletedTaskIds: [],
    obligaciones: [{ id: 'o1', txt: 'Tarjeta', tipo: 'tarjeta' }],
    pagos, eventos: [], inversiones: [],
  })

  it('genera pagos para el mes actual y el siguiente', () => {
    const result = ensureMonths(base([]))
    const meses = result.pagos.filter(p => p.oblId === 'o1').map(p => p.mes).sort()
    expect(meses).toEqual(['2026-05', '2026-06'])
  })

  it('no duplica pagos existentes', () => {
    const result = ensureMonths(base([
      { id: 'p1', oblId: 'o1', mes: '2026-05', done: true, fecha: '2026-05-10' },
    ]))
    const may = result.pagos.filter(p => p.oblId === 'o1' && p.mes === '2026-05')
    expect(may).toHaveLength(1)
    expect(may[0].done).toBe(true)
  })

  it('deduplica pagos con misma obligación y mes', () => {
    const result = ensureMonths(base([
      { id: 'p1', oblId: 'o1', mes: '2026-05', done: true, fecha: '2026-05-10' },
      { id: 'p2', oblId: 'o1', mes: '2026-05', done: false, fecha: '2026-05-11' },
    ]))
    const may = result.pagos.filter(p => p.oblId === 'o1' && p.mes === '2026-05')
    expect(may).toHaveLength(1)
  })

  it('hereda el día del pago previo al generar el nuevo mes', () => {
    const result = ensureMonths(base([
      { id: 'p1', oblId: 'o1', mes: '2026-04', done: true, fecha: '2026-04-15' },
    ]))
    const jun = result.pagos.find(p => p.oblId === 'o1' && p.mes === '2026-06')
    expect(jun?.fecha).toBe('2026-06-15')
  })

  it('genera ids de pago únicos sin colisionar con los existentes', () => {
    // Escenario real: la carga desde la nube devuelve nextPagoId=0 aunque ya
    // existan pagos "pg0", "pg1"... Al agregar una obligación nueva (EDENORTE),
    // el contador colisionaba con ids ya usados y los pagos se pisaban entre sí,
    // por lo que la fecha "no se guardaba".
    const data: AppData = {
      nextId: 0, nextPagoId: 0, nextInvId: 0,
      proyectos: [], tareas: [], deletedTaskIds: [],
      obligaciones: [
        { id: 'o1', txt: 'Tarjeta', tipo: 'tarjeta' },
        { id: 'o2', txt: 'EDENORTE', tipo: 'servicio' },
      ],
      pagos: [
        { id: 'pg0', oblId: 'o1', mes: '2026-05', done: false, fecha: '2026-05-10' },
        { id: 'pg1', oblId: 'o1', mes: '2026-06', done: false, fecha: '2026-06-10' },
      ],
      eventos: [], inversiones: [],
    }
    const result = ensureMonths(data)
    const ids = result.pagos.map(p => p.id)
    // Ningún id repetido
    expect(new Set(ids).size).toBe(ids.length)
    // El pago original de o1 conserva su fecha (no fue pisado por una colisión)
    const o1may = result.pagos.find(p => p.oblId === 'o1' && p.mes === '2026-05')
    expect(o1may?.fecha).toBe('2026-05-10')
  })
})

describe('mergeData', () => {
  it('preserva el estado done de tareas guardadas', () => {
    const result = mergeData({ tareas: [{ id: '2', txt: 'Responder a GEEKOM', done: true, proj: null, prio: 'alta', fecha: '', nota: '' }] })
    const t = result.tareas.find(x => x.id === '2')
    expect(t?.done).toBe(true)
  })

  it('agrega tareas creadas por el usuario (id no-default)', () => {
    const result = mergeData({ tareas: [{ id: 'user-123', txt: 'Mi tarea nueva', done: false, proj: null, prio: 'media', fecha: '', nota: '' }] })
    expect(result.tareas.some(t => t.id === 'user-123')).toBe(true)
  })

  it('filtra tareas en la blacklist', () => {
    const result = mergeData({ tareas: [{ id: 'x1', txt: 'Recibir pago Euripides ya', done: false, proj: null, prio: 'baja', fecha: '', nota: '' }] })
    expect(result.tareas.some(t => t.id === 'x1')).toBe(false)
  })

  it('respeta deletedTaskIds para tareas default', () => {
    const result = mergeData({ deletedTaskIds: ['2'] })
    expect(result.tareas.some(t => t.id === '2')).toBe(false)
  })

  it('migra el campo legacy "texto" a "txt"', () => {
    const result = mergeData({ tareas: [{ id: 'leg-1', texto: 'Tarea legacy', done: false, proj: null, prio: 'media', fecha: '', nota: '' } as never] })
    const t = result.tareas.find(x => x.id === 'leg-1')
    expect(t?.txt).toBe('Tarea legacy')
  })
})
