import { supabase } from '../lib/supabase'
import type {
  Tarea, Proyecto, Evento, Obligacion, Pago,
  Inversion, CuentaBancaria, Contacto, AccesoRemoto, CalendarConfig,
} from '../types'

export async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

const toDbTask = (t: Tarea, userId: string) => ({
  id: t.id, text: t.txt, done: t.done, priority: t.prio,
  project_id: t.proj || null, date: t.fecha, note: t.nota,
  notification: t.notificacion || null, position: 0, created_by: userId,
})

const fromDbTask = (r: Record<string, unknown>): Tarea => ({
  id: r.id as string, txt: r.text as string, done: r.done as boolean,
  prio: r.priority as Tarea['prio'], proj: (r.project_id as string) || null,
  fecha: (r.date as string) || '', nota: (r.note as string) || '',
  notificacion: r.notification as string | undefined,
})

const toDbProject = (p: Proyecto, userId: string) => ({
  id: p.id, name: p.nombre, color: p.color, owner_id: userId,
})

const fromDbProject = (r: Record<string, unknown>): Proyecto => ({
  id: r.id as string, nombre: r.name as string, color: r.color as string,
})

const toDbEvent = (e: Evento, userId: string) => ({
  id: e.id, title: e.titulo, date: e.fecha, date_end: e.fechaFin || null,
  time_start: e.hora, time_end: e.horaFin || null, note: e.nota,
  all_day: e.allDay || false, color: e.color || null, done: e.done || false,
  source: e.source || 'local', source_id: e.sourceId || null,
  calendar_source_id: e.calendarSourceId || null,
  notification: e.notificacion || null, project_id: e.proj || null,
  created_by: userId,
})

const fromDbEvent = (r: Record<string, unknown>): Evento => ({
  id: r.id as string, titulo: r.title as string, fecha: r.date as string,
  fechaFin: r.date_end as string | undefined, hora: (r.time_start as string) || '',
  horaFin: r.time_end as string | undefined, nota: (r.note as string) || '',
  allDay: r.all_day as boolean, color: r.color as string | undefined,
  done: r.done as boolean, source: r.source as Evento['source'],
  sourceId: r.source_id as string | undefined,
  calendarSourceId: r.calendar_source_id as string | undefined,
  notificacion: r.notification as string | undefined,
  proj: (r.project_id as string) || null,
})

const toDbObligation = (o: Obligacion, userId: string) => ({
  id: o.id, text: o.txt, type: o.tipo, owner_id: userId,
})

const fromDbObligation = (r: Record<string, unknown>): Obligacion => ({
  id: r.id as string, txt: r.text as string, tipo: r.type as Obligacion['tipo'],
})

const toDbPayment = (p: Pago) => ({
  id: p.id, obligation_id: p.oblId, month: p.mes, done: p.done, date: p.fecha,
})

const fromDbPayment = (r: Record<string, unknown>): Pago => ({
  id: r.id as string, oblId: r.obligation_id as string,
  mes: r.month as string, done: r.done as boolean, fecha: (r.date as string) || '',
})

const toDbInvestment = (i: Inversion, userId: string) => ({
  id: i.id, name: i.nombre, category: i.cat, currency: i.moneda,
  purchase_price: i.compra, current_price: i.actual,
  date: i.fecha, note: i.nota, owner_id: userId,
})

const fromDbInvestment = (r: Record<string, unknown>): Inversion => ({
  id: r.id as string, nombre: r.name as string,
  cat: r.category as Inversion['cat'], moneda: r.currency as 'USD' | 'DOP',
  compra: Number(r.purchase_price), actual: Number(r.current_price),
  fecha: (r.date as string) || '', nota: (r.note as string) || '',
})

const toDbBank = (c: CuentaBancaria, userId: string) => ({
  id: c.id, owner_id: userId, banco: c.banco, tipo: c.tipo, numero: c.numero,
  titular: c.titular, telefono: c.telefono, nota: c.nota,
  tipo_cuenta: c.tipoCuenta || 'personal', cedula: c.cedula || null,
  rnc: c.rnc || null, pais: c.pais || null, swift: c.swift || null,
  iban: c.iban || null, banco_intermediario: c.bancoIntermediario || null,
  direccion_banco: c.direccionBanco || null,
})

const fromDbBank = (r: Record<string, unknown>): CuentaBancaria => ({
  id: r.id as string, banco: (r.banco as string) || '',
  tipo: (r.tipo as string) || '', numero: (r.numero as string) || '',
  titular: (r.titular as string) || '', telefono: (r.telefono as string) || '',
  nota: (r.nota as string) || '', tipoCuenta: r.tipo_cuenta as 'personal' | 'empresarial',
  cedula: r.cedula as string | undefined, rnc: r.rnc as string | undefined,
  pais: r.pais as string | undefined, swift: r.swift as string | undefined,
  iban: r.iban as string | undefined,
  bancoIntermediario: r.banco_intermediario as string | undefined,
  direccionBanco: r.direccion_banco as string | undefined,
})

const toDbContact = (c: Contacto, userId: string) => ({
  id: c.id, owner_id: userId, nombre: c.nombre, cedula: c.cedula,
  telefono: c.telefono, email: c.email, nota: c.nota,
})

const fromDbContact = (r: Record<string, unknown>): Contacto => ({
  id: r.id as string, nombre: (r.nombre as string) || '',
  cedula: (r.cedula as string) || '', telefono: (r.telefono as string) || '',
  email: (r.email as string) || '', nota: (r.nota as string) || '',
})

const toDbAccess = (a: AccesoRemoto, userId: string) => ({
  id: a.id, owner_id: userId, nombre: a.nombre, app: a.app,
  codigo: a.codigo, password: a.password, nota: a.nota,
})

const fromDbAccess = (r: Record<string, unknown>): AccesoRemoto => ({
  id: r.id as string, nombre: (r.nombre as string) || '',
  app: r.app as AccesoRemoto['app'], codigo: (r.codigo as string) || '',
  password: (r.password as string) || '', nota: (r.nota as string) || '',
})

type Row = Record<string, unknown>

async function query(table: string, select = '*'): Promise<Row[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from(table).select(select)
  if (error) { console.error(`db.query ${table}:`, error); return [] }
  return (data ?? []) as unknown as Row[]
}

export const db = {
  async loadTasks(): Promise<Tarea[]> {
    return (await query('tasks')).map(fromDbTask)
  },
  async loadProjects(): Promise<Proyecto[]> {
    return (await query('projects')).map(fromDbProject)
  },
  async loadEvents(): Promise<Evento[]> {
    return (await query('events')).map(fromDbEvent)
  },
  async loadObligations(): Promise<Obligacion[]> {
    return (await query('obligations')).map(fromDbObligation)
  },
  async loadPayments(): Promise<Pago[]> {
    return (await query('payments')).map(fromDbPayment)
  },
  async loadInvestments(): Promise<Inversion[]> {
    return (await query('investments')).map(fromDbInvestment)
  },
  async loadBankAccounts(): Promise<CuentaBancaria[]> {
    return (await query('bank_accounts')).map(fromDbBank)
  },
  async loadContacts(): Promise<Contacto[]> {
    return (await query('contacts')).map(fromDbContact)
  },
  async loadAccesses(): Promise<AccesoRemoto[]> {
    return (await query('remote_accesses')).map(fromDbAccess)
  },
  async loadCalendarConfig(): Promise<CalendarConfig | undefined> {
    if (!supabase) return undefined
    const { data } = await supabase.from('calendar_configs').select('config').single()
    return data?.config as CalendarConfig | undefined
  },

  async upsert(table: string, row: Record<string, unknown>) {
    if (!supabase) return
    const { error } = await supabase.from(table).upsert(row)
    if (error) console.error(`db.upsert ${table}:`, error)
  },
  async remove(table: string, id: string) {
    if (!supabase) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error(`db.remove ${table}:`, error)
  },

  async upsertTask(t: Tarea, userId: string) { await this.upsert('tasks', toDbTask(t, userId)) },
  async removeTask(id: string) { await this.remove('tasks', id) },
  async upsertProject(p: Proyecto, userId: string) { await this.upsert('projects', toDbProject(p, userId)) },
  async removeProject(id: string) { await this.remove('projects', id) },
  async upsertEvent(e: Evento, userId: string) { await this.upsert('events', toDbEvent(e, userId)) },
  async removeEvent(id: string) { await this.remove('events', id) },
  async upsertObligation(o: Obligacion, userId: string) { await this.upsert('obligations', toDbObligation(o, userId)) },
  async upsertPayment(p: Pago) { await this.upsert('payments', toDbPayment(p)) },
  async upsertInvestment(i: Inversion, userId: string) { await this.upsert('investments', toDbInvestment(i, userId)) },
  async removeInvestment(id: string) { await this.remove('investments', id) },
  async upsertBankAccount(c: CuentaBancaria, userId: string) { await this.upsert('bank_accounts', toDbBank(c, userId)) },
  async removeBankAccount(id: string) { await this.remove('bank_accounts', id) },
  async upsertContact(c: Contacto, userId: string) { await this.upsert('contacts', toDbContact(c, userId)) },
  async removeContact(id: string) { await this.remove('contacts', id) },
  async upsertAccess(a: AccesoRemoto, userId: string) { await this.upsert('remote_accesses', toDbAccess(a, userId)) },
  async removeAccess(id: string) { await this.remove('remote_accesses', id) },

  async saveCalendarConfig(userId: string, config: CalendarConfig) {
    if (!supabase) return
    await supabase.from('calendar_configs').upsert({
      user_id: userId, config, updated_at: new Date().toISOString(),
    })
  },
}
