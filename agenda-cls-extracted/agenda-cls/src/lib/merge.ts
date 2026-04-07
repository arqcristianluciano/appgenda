import type { AppData, Tarea, Pago } from '../types'
import { DEFAULT_DATA } from './defaults'

const BLACKLIST = ['recibir pago euripides', 'euripides montanto']

export function mergeData(saved: Partial<AppData>): AppData {
  // Tareas: preserve done/nota/fecha from saved, add new defaults
  const savedTaskMap = new Map<number, Tarea>()
  ;(saved.tareas ?? []).forEach(t => {
    const normalized = { ...t, txt: t.txt || (t as unknown as { texto?: string }).texto || '' }
    if (normalized.txt) savedTaskMap.set(t.id, normalized)
  })

  const merged: Tarea[] = DEFAULT_DATA.tareas.map(def => {
    const s = savedTaskMap.get(def.id)
    return s ? { ...def, done: s.done, nota: s.nota ?? '', fecha: s.fecha ?? '' } : { ...def }
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

  // Inversiones: preserve edits
  const savedInvMap = new Map(
    (saved.inversiones ?? []).map(i => [i.id, i])
  )
  const defInvIds = new Set(DEFAULT_DATA.inversiones.map(i => i.id))
  const mergedInv = DEFAULT_DATA.inversiones.map(def => {
    const s = savedInvMap.get(def.id)
    return s ? { ...def, compra: s.compra, actual: s.actual, fecha: s.fecha, nota: s.nota, nombre: s.nombre } : { ...def }
  })
  ;(saved.inversiones ?? []).forEach(i => {
    if (!defInvIds.has(i.id)) mergedInv.push(i)
  })

  return {
    nextId: saved.nextId ?? DEFAULT_DATA.nextId,
    nextPagoId: saved.nextPagoId ?? DEFAULT_DATA.nextPagoId,
    nextInvId: saved.nextInvId ?? DEFAULT_DATA.nextInvId,
    proyectos: saved.proyectos ?? DEFAULT_DATA.proyectos,
    tareas: merged,
    obligaciones: saved.obligaciones ?? DEFAULT_DATA.obligaciones,
    pagos: mergedPagos,
    eventos: saved.eventos ?? [],
    inversiones: mergedInv,
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

export function ensureMonths(data: AppData): AppData {
  const now = new Date()
  const curMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nxtMes = nextMes(curMes)

  const seen = new Map<string, Pago>()
  data.pagos.forEach(p => {
    const key = `${p.oblId}|${p.mes}`
    if (!seen.has(key)) seen.set(key, p)
  })
  const deduped = Array.from(seen.values())

  let nextPagoId = data.nextPagoId
  const newPagos = [...deduped]

  data.obligaciones.forEach(ob => {
    for (const mes of [curMes, nxtMes]) {
      const exists = deduped.find(p => p.oblId === ob.id && p.mes === mes)
      if (!exists) {
        const prev = deduped
          .filter(p => p.oblId === ob.id && p.fecha)
          .sort((a, b) => b.mes.localeCompare(a.mes))[0]
        const day = prev?.fecha?.split('-')[2] ?? ''
        const newFecha = day ? `${mes}-${day}` : ''
        newPagos.push({ id: `pg${nextPagoId++}`, oblId: ob.id, mes, done: false, fecha: newFecha })
      }
    }
  })

  return { ...data, pagos: newPagos, nextPagoId }
}

export function fmtMoney(v: number, moneda: 'USD' | 'DOP'): string {
  if (!v) return '—'
  const prefix = moneda === 'DOP' ? 'RD$' : 'US$'
  return prefix + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
