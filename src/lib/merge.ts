import type { AppData, Tarea, Pago } from '../types'
import { DEFAULT_DATA } from './defaults'
import { dedupeById } from './dedupe'

const BLACKLIST = ['recibir pago euripides', 'euripides montanto']

export function mergeData(saved: Partial<AppData>): AppData {
  const deletedTaskIds = new Set(saved.deletedTaskIds ?? [])

  // Tareas: preserve done/nota/fecha from saved, add new defaults
  const savedTaskMap = new Map<string, Tarea>()
  ;(saved.tareas ?? []).forEach(t => {
    const normalized = { ...t, txt: t.txt || (t as unknown as { texto?: string }).texto || '' }
    if (normalized.txt) savedTaskMap.set(t.id, normalized)
  })

  const merged: Tarea[] = DEFAULT_DATA.tareas.filter(def => !deletedTaskIds.has(def.id)).map(def => {
    const s = savedTaskMap.get(def.id)
    if (!s) return { ...def }
    return {
      ...def,
      done: s.done,
      nota: s.nota ?? '',
      fecha: s.fecha ?? '',
      prio: s.prio ?? def.prio,
      proj: s.proj !== undefined ? s.proj : def.proj,
      notificacion: s.notificacion ?? def.notificacion,
    }
  })

  // Add user-created tasks
  const defIds = new Set(DEFAULT_DATA.tareas.map(t => t.id))
  ;(saved.tareas ?? []).forEach(t => {
    const txt = t.txt || (t as unknown as { texto?: string }).texto || ''
    if (!txt || defIds.has(t.id)) return
    if (BLACKLIST.some(b => txt.toLowerCase().includes(b))) return
    merged.push({ ...t, txt })
  })

  // Pagos: preserve done + fecha
  const savedPagoMap = new Map<string, Pago>()
  ;(saved.pagos ?? []).forEach(p => savedPagoMap.set(p.id, p))

  const mergedPagos: Pago[] = DEFAULT_DATA.pagos.map(def => {
    const s = savedPagoMap.get(def.id)
    return s ? { ...def, done: s.done, fecha: s.fecha ?? def.fecha } : { ...def }
  })
  const defPagoIds = new Set(DEFAULT_DATA.pagos.map(p => p.id))
  ;(saved.pagos ?? []).forEach(p => {
    if (!defPagoIds.has(p.id)) mergedPagos.push(p)
  })

  // Inversiones: preserve edits and deletions
  const savedInvMap = new Map(
    (saved.inversiones ?? []).map(i => [i.id, i])
  )
  const defInvIds = new Set(DEFAULT_DATA.inversiones.map(i => i.id))
  const hasSavedInv = saved.inversiones !== undefined

  const mergedInv = DEFAULT_DATA.inversiones
    .filter(def => !hasSavedInv || savedInvMap.has(def.id))
    .map(def => {
      const s = savedInvMap.get(def.id)
      if (!s) return { ...def }
    return {
      ...def,
      compra: s.compra,
      actual: s.actual,
      fecha: s.fecha,
      nota: s.nota,
      nombre: s.nombre,
      cat: s.cat ?? def.cat,
      moneda: s.moneda ?? def.moneda,
    }
    })
  ;(saved.inversiones ?? []).forEach(i => {
    if (!defInvIds.has(i.id)) mergedInv.push(i)
  })

  return {
    nextId: saved.nextId ?? DEFAULT_DATA.nextId,
    nextPagoId: saved.nextPagoId ?? DEFAULT_DATA.nextPagoId,
    nextInvId: saved.nextInvId ?? DEFAULT_DATA.nextInvId,
    proyectos: dedupeById(saved.proyectos ?? DEFAULT_DATA.proyectos),
    tareas: dedupeById(merged),
    deletedTaskIds: saved.deletedTaskIds ?? [],
    obligaciones: dedupeById(saved.obligaciones ?? DEFAULT_DATA.obligaciones),
    pagos: dedupeById(mergedPagos),
    eventos: dedupeById(saved.eventos ?? []),
    inversiones: dedupeById(mergedInv),
    calendarConfig: saved.calendarConfig ?? {},
  }
}

export function getFechaStatus(fecha: string): 'vencido' | 'hoy' | null {
  if (!fecha) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(fecha + 'T00:00:00')
  if (due < today) return 'vencido'
  if (due.getTime() === today.getTime()) return 'hoy'
  return null
}

export function nextMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function mesLabel(mes: string): string {
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [y, m] = mes.split('-').map(Number)
  const label = MESES[m - 1]
  return label.charAt(0).toUpperCase() + label.slice(1) + ' ' + y
}

// Cuántos meses por delante se preparan para los gastos fijos. Como estos
// gastos se repiten cada mes, generamos un año completo hacia adelante (el mes
// actual + los 11 siguientes) para que se puedan ver y planificar con tiempo.
export const MESES_ADELANTE = 11

export function ensureMonths(data: AppData): AppData {
  const now = new Date()
  const curMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Ventana móvil: mes actual + los siguientes MESES_ADELANTE meses.
  const meses = [curMes]
  for (let i = 0; i < MESES_ADELANTE; i++) {
    meses.push(nextMes(meses[meses.length - 1]))
  }

  const seen = new Map<string, Pago>()
  data.pagos.forEach(p => {
    const key = `${p.oblId}|${p.mes}`
    if (!seen.has(key)) seen.set(key, p)
  })
  const deduped = Array.from(seen.values())

  const newPagos = [...deduped]

  data.obligaciones.forEach(ob => {
    for (const mes of meses) {
      const exists = deduped.find(p => p.oblId === ob.id && p.mes === mes)
      if (!exists) {
        const prev = deduped
          .filter(p => p.oblId === ob.id && p.fecha)
          .sort((a, b) => b.mes.localeCompare(a.mes))[0]
        const day = prev?.fecha?.split('-')[2] ?? ''
        const newFecha = day ? `${mes}-${day}` : ''
        // Id único universal (igual que el resto de la app). Antes se usaba un
        // contador `pg${nextPagoId}` que, al recargar desde la nube, arrancaba
        // en 0 y colisionaba con ids ya existentes: dos pagos distintos con el
        // mismo id se pisaban y la fecha recién puesta "se perdía".
        newPagos.push({ id: crypto.randomUUID(), oblId: ob.id, mes, done: false, fecha: newFecha })
      }
    }
  })

  return { ...data, pagos: newPagos, nextPagoId: data.nextPagoId }
}

export function trunc2(v: number): number {
  return Math.trunc(v * 100) / 100
}

export function fmtNum(v: number): string {
  const [int, dec = ''] = trunc2(v).toFixed(2).split('.')
  const sign = int.startsWith('-') ? '-' : ''
  const digits = int.replace('-', '')
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return sign + withCommas + '.' + dec
}

export function fmtMoney(v: number, moneda: 'USD' | 'DOP'): string {
  if (!v && v !== 0) return '—'
  const prefix = moneda === 'DOP' ? 'RD$' : 'US$'
  return prefix + fmtNum(v)
}

export function fmtPct(v: number): string {
  const t = trunc2(v)
  return (t >= 0 ? '+' : '') + t.toFixed(2)
}
