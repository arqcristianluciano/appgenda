// ============================================================
// TIPOS — Agenda CLS
// ============================================================

export type Prioridad = 'alta' | 'media' | 'baja'
export type CatInversion = 'inmobiliario' | 'vehiculos' | 'financiero' | 'empresas'
export type TipoObligacion = 'tarjeta' | 'prestamo'

export interface Proyecto {
  id: string
  nombre: string
  color: string
}

export interface Tarea {
  id: number
  txt: string
  done: boolean
  proj: string | null
  prio: Prioridad
  fecha: string
  nota: string
}

export interface Obligacion {
  id: string
  txt: string
  tipo: TipoObligacion
}

export interface Pago {
  id: string
  oblId: string
  mes: string     // YYYY-MM
  done: boolean
  fecha: string   // YYYY-MM-DD
}

export interface Evento {
  id: string
  titulo: string
  fecha: string
  hora: string
  nota: string
}

export interface Inversion {
  id: string
  nombre: string
  cat: CatInversion
  moneda: 'USD' | 'DOP'
  compra: number
  actual: number
  fecha: string
  nota: string
}

export interface AppData {
  nextId: number
  nextPagoId: number
  nextInvId: number
  proyectos: Proyecto[]
  tareas: Tarea[]
  obligaciones: Obligacion[]
  pagos: Pago[]
  eventos: Evento[]
  inversiones: Inversion[]
}

export type Vista = 'hoy' | 'proyectos' | 'semana' | 'finanzas' | 'inversiones'
export type FiltroHoy = 'all' | 'alta' | 'pendiente' | 'done'
export type FiltroProy = 'todos' | 'activos' | 'completos'
export type FiltroInv = 'todas' | CatInversion
