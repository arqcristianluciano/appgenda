// ============================================================
// TIPOS — Agenda CLS
// ============================================================

export type Prioridad = 'alta' | 'media' | 'baja'
export type CatInversion = 'inmobiliario' | 'vehiculos' | 'financiero' | 'empresas'
export type TipoObligacion = 'tarjeta' | 'prestamo'

export interface ArchivoAdjunto {
  id: string
  nombre: string
  tipo: string
  tamaño: number
  fecha: string
  url?: string
  dataUrl?: string
  storagePath?: string
}

export type AsignacionTipo = 'personal' | 'equipo'

export interface Proyecto {
  id: string
  nombre: string
  color: string
  archivos?: ArchivoAdjunto[]
  teamId?: string | null
  assigneeId?: string | null
}

export interface Tarea {
  id: string
  txt: string
  done: boolean
  proj: string | null
  prio: Prioridad
  fecha: string
  nota: string
  notificacion?: string
  archivos?: ArchivoAdjunto[]
  assigneeId?: string | null
  teamId?: string | null
}

export interface Obligacion {
  id: string
  txt: string
  tipo: TipoObligacion
  teamId?: string | null
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
  fechaFin?: string
  hora: string
  horaFin?: string
  nota: string
  allDay?: boolean
  color?: string
  done?: boolean
  source?: 'local' | 'google' | 'icloud' | 'finances' | 'tasks'
  sourceId?: string
  calendarSourceId?: string // ID del CalendarSource específico (para filtro por-calendario)
  notificacion?: string // ISO datetime cuando mostrar la notificación
  proj?: string | null
  teamId?: string | null
}

export type CalendarViewMode = 'month' | 'week' | 'day'

export interface CalendarSource {
  id: string
  name: string
  type: 'local' | 'google' | 'icloud' | 'finances' | 'tasks'
  color: string
  enabled: boolean
  accountEmail?: string
  readOnly?: boolean // suscrito sin permiso de escritura (festivos, compartidos como invitado, webcal)
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
  teamId?: string | null
}

export interface IcloudCalDAVConfig {
  appleId: string
  password: string
  calendars: { url: string; name: string; color: string }[]
}

export interface IcloudWebcalConfig {
  url: string
  color: string
  name: string
}

export interface CalendarConfig {
  icloudAuth?: IcloudCalDAVConfig | null
  icloudWebcal?: IcloudWebcalConfig | null
  googleEmails?: string[]
  googleTokens?: Record<string, string>       // access tokens (corta vida, caché)
  googleRefreshTokens?: Record<string, string> // refresh tokens (permanentes)
  googleTokenExpiry?: Record<string, number>   // timestamp ms de expiración
  calendarSources?: CalendarSource[]
}

export interface AppData {
  nextId: number
  nextPagoId: number
  nextInvId: number
  proyectos: Proyecto[]
  tareas: Tarea[]
  deletedTaskIds: string[]
  obligaciones: Obligacion[]
  pagos: Pago[]
  eventos: Evento[]
  inversiones: Inversion[]
  calendarConfig?: CalendarConfig
}

export interface Profile {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface Team {
  id: string
  name: string
  color: string
  createdBy: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'admin' | 'editor' | 'viewer'
  profile?: Profile
}

export type Vista = 'hoy' | 'proyectos' | 'semana' | 'finanzas' | 'inversiones' | 'datos' | 'equipo'
export type FiltroHoy = 'all' | 'alta' | 'pendiente' | 'done'
export type FiltroProy = 'todos' | 'activos' | 'completos'
export type FiltroAsignacion = 'todos' | 'personal' | 'equipo'
export type FiltroInv = 'todas' | CatInversion

export type TipoAccesoRemoto = 'anydesk' | 'teamviewer' | 'rdp' | 'otro'

export interface CuentaBancaria {
  id: string
  banco: string
  tipo: string
  numero: string
  titular: string
  telefono: string
  nota: string
  tipoCuenta?: 'personal' | 'empresarial'
  cedula?: string
  rnc?: string
  pais?: string
  swift?: string
  iban?: string
  bancoIntermediario?: string
  direccionBanco?: string
  teamId?: string | null
}

export interface Contacto {
  id: string
  nombre: string
  cedula: string
  telefono: string
  email: string
  nota: string
  teamId?: string | null
}

export interface AccesoRemoto {
  id: string
  nombre: string
  app: TipoAccesoRemoto
  codigo: string
  password: string
  nota: string
  teamId?: string | null
}

export type FiltroScope = 'personal' | 'equipo' | 'todos'
