import {
  collection, collectionGroup, doc, getDoc, getDocs, query, where, setDoc, deleteDoc, updateDoc,
  limit,
} from 'firebase/firestore'
import { auth, db as fdb } from '../lib/firebase'
import type {
  Tarea, Proyecto, Evento, Obligacion, Pago,
  Inversion, CuentaBancaria, Contacto, AccesoRemoto, CalendarConfig,
  Team, TeamMember, Profile, ArchivoAdjunto,
} from '../types'

type Row = Record<string, unknown>

export async function getUserId(): Promise<string | null> {
  return auth?.currentUser?.uid ?? null
}

// --- mappers (Firestore docs <-> app types) ---
// Firestore docs use snake_case field names; renaming requires a data migration.
// `ownerUid` is the canonical Firebase user UID field.

// `notification` es hora local naïve ("YYYY-MM-DDTHH:mm"); `notification_at` es
// el instante absoluto en epoch ms (calculado con la zona del navegador) para que
// la Cloud Function de recordatorios consulte sin ambigüedad de zona horaria.
const notifEpoch = (n?: string) => (n ? new Date(n).getTime() : null)

// Adjuntos hacia Firestore: se guarda la lista (id, nombre, url, etc.) pero
// nunca `dataUrl` (base64 del modo sin-Storage): podría exceder el límite de
// 1MB por documento y tumbar el guardado completo de la tarea/proyecto.
const toDbArchivos = (files?: ArchivoAdjunto[]) =>
  (files ?? []).map(f => {
    const rest = { ...f }
    delete rest.dataUrl
    return rest
  })
const fromDbArchivos = (v: unknown): ArchivoAdjunto[] | undefined =>
  Array.isArray(v) && v.length ? (v as ArchivoAdjunto[]) : undefined

const toDbTask = (t: Tarea, userId: string) => ({
  id: t.id, text: t.txt, done: t.done, priority: t.prio,
  project_id: t.proj || null, date: t.fecha, note: t.nota,
  notification: t.notificacion || null, notification_at: notifEpoch(t.notificacion), position: 0,
  assignee_id: t.assigneeId || null, team_id: t.teamId || null,
  archivos: toDbArchivos(t.archivos),
  ownerUid: userId, teamId: t.teamId || null,
})
const fromDbTask = (r: Row): Tarea => ({
  id: r.id as string, txt: r.text as string, done: r.done as boolean,
  prio: r.priority as Tarea['prio'], proj: (r.project_id as string) || null,
  fecha: (r.date as string) || '', nota: (r.note as string) || '',
  notificacion: r.notification as string | undefined,
  assigneeId: (r.assignee_id as string) || null,
  archivos: fromDbArchivos(r.archivos),
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbProject = (p: Proyecto, userId: string) => ({
  id: p.id, name: p.nombre, color: p.color,
  assignee_id: p.assigneeId || null,
  archivos: toDbArchivos(p.archivos),
  team_id: p.teamId || null,
  ownerUid: userId, teamId: p.teamId || null,
})
const fromDbProject = (r: Row): Proyecto => ({
  id: r.id as string, nombre: r.name as string, color: r.color as string,
  assigneeId: (r.assignee_id as string) || null,
  archivos: fromDbArchivos(r.archivos),
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbEvent = (e: Evento, userId: string) => ({
  id: e.id, title: e.titulo, date: e.fecha, date_end: e.fechaFin || null,
  time_start: e.hora, time_end: e.horaFin || null, note: e.nota,
  all_day: e.allDay || false, color: e.color || null, done: e.done || false,
  source: e.source || 'local', source_id: e.sourceId || null,
  calendar_source_id: e.calendarSourceId || null,
  notification: e.notificacion || null, notification_at: notifEpoch(e.notificacion), project_id: e.proj || null,
  team_id: e.teamId || null,
  ownerUid: userId, teamId: e.teamId || null,
})
const fromDbEvent = (r: Row): Evento => ({
  id: r.id as string, titulo: r.title as string, fecha: r.date as string,
  fechaFin: r.date_end as string | undefined, hora: (r.time_start as string) || '',
  horaFin: r.time_end as string | undefined, nota: (r.note as string) || '',
  allDay: r.all_day as boolean, color: r.color as string | undefined,
  done: r.done as boolean, source: r.source as Evento['source'],
  sourceId: r.source_id as string | undefined,
  calendarSourceId: r.calendar_source_id as string | undefined,
  notificacion: r.notification as string | undefined,
  proj: (r.project_id as string) || null,
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbObligation = (o: Obligacion, userId: string) => ({
  id: o.id, text: o.txt, type: o.tipo,
  team_id: o.teamId || null,
  ownerUid: userId, teamId: o.teamId || null,
})
const fromDbObligation = (r: Row): Obligacion => ({
  id: r.id as string, txt: r.text as string, tipo: r.type as Obligacion['tipo'],
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbPayment = (p: Pago, userId: string) => ({
  id: p.id, obligation_id: p.oblId, month: p.mes, done: p.done, date: p.fecha,
  ownerUid: userId,
})
const fromDbPayment = (r: Row): Pago => ({
  id: r.id as string, oblId: r.obligation_id as string,
  mes: r.month as string, done: r.done as boolean, fecha: (r.date as string) || '',
})

const toDbInvestment = (i: Inversion, userId: string) => ({
  id: i.id, name: i.nombre, category: i.cat, currency: i.moneda,
  purchase_price: i.compra, current_price: i.actual,
  date: i.fecha, note: i.nota,
  team_id: i.teamId || null,
  ownerUid: userId, teamId: i.teamId || null,
})
const fromDbInvestment = (r: Row): Inversion => ({
  id: r.id as string, nombre: r.name as string,
  cat: r.category as Inversion['cat'], moneda: r.currency as 'USD' | 'DOP',
  compra: Number(r.purchase_price), actual: Number(r.current_price),
  fecha: (r.date as string) || '', nota: (r.note as string) || '',
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbBank = (c: CuentaBancaria, userId: string) => ({
  id: c.id, banco: c.banco, tipo: c.tipo, numero: c.numero,
  titular: c.titular, telefono: c.telefono, nota: c.nota,
  tipo_cuenta: c.tipoCuenta || 'personal', cedula: c.cedula || null,
  rnc: c.rnc || null, pais: c.pais || null, swift: c.swift || null,
  iban: c.iban || null, banco_intermediario: c.bancoIntermediario || null,
  direccion_banco: c.direccionBanco || null, team_id: c.teamId || null,
  ownerUid: userId, teamId: c.teamId || null,
})
const fromDbBank = (r: Row): CuentaBancaria => ({
  id: r.id as string, banco: (r.banco as string) || '',
  tipo: (r.tipo as string) || '', numero: (r.numero as string) || '',
  titular: (r.titular as string) || '', telefono: (r.telefono as string) || '',
  nota: (r.nota as string) || '', tipoCuenta: r.tipo_cuenta as 'personal' | 'empresarial',
  cedula: r.cedula as string | undefined, rnc: r.rnc as string | undefined,
  pais: r.pais as string | undefined, swift: r.swift as string | undefined,
  iban: r.iban as string | undefined,
  bancoIntermediario: r.banco_intermediario as string | undefined,
  direccionBanco: r.direccion_banco as string | undefined,
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbContact = (c: Contacto, userId: string) => ({
  id: c.id, nombre: c.nombre, cedula: c.cedula,
  telefono: c.telefono, email: c.email, nota: c.nota,
  team_id: c.teamId || null,
  ownerUid: userId, teamId: c.teamId || null,
})
const fromDbContact = (r: Row): Contacto => ({
  id: r.id as string, nombre: (r.nombre as string) || '',
  cedula: (r.cedula as string) || '', telefono: (r.telefono as string) || '',
  email: (r.email as string) || '', nota: (r.nota as string) || '',
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const toDbAccess = (a: AccesoRemoto, userId: string) => ({
  id: a.id, nombre: a.nombre, app: a.app,
  codigo: a.codigo, password: a.password, nota: a.nota,
  team_id: a.teamId || null,
  ownerUid: userId, teamId: a.teamId || null,
})
const fromDbAccess = (r: Row): AccesoRemoto => ({
  id: r.id as string, nombre: (r.nombre as string) || '',
  app: r.app as AccesoRemoto['app'], codigo: (r.codigo as string) || '',
  password: (r.password as string) || '', nota: (r.nota as string) || '',
  teamId: (r.team_id as string) || (r.teamId as string) || null,
})

const fromDbTeam = (r: Row, id: string): Team => ({
  id, name: r.name as string,
  color: (r.color as string) || '#2B5E3E',
  createdBy: r.createdBy as string ?? r.created_by as string ?? '',
})

const fromDbMember = (r: Row, memberId: string, profile?: Profile): TeamMember => ({
  id: memberId, teamId: r.teamId as string ?? r.team_id as string ?? '',
  userId: memberId, role: r.role as TeamMember['role'],
  profile,
})

const fromDbProfile = (r: Row, id: string): Profile => ({
  id, email: (r.email as string) || '',
  name: (r.name as string) || '',
  avatarUrl: (r.avatar_url ?? r.avatarUrl) as string | undefined,
})

// Member uids de un equipo (el id del doc de miembro == uid). Cache corta para
// no re-leer en cada escritura; se invalida al cambiar la membresía localmente.
const memberUidsCache = new Map<string, { uids: string[]; ts: number }>()
const MEMBER_UIDS_TTL = 30_000

async function getTeamMemberUids(teamId: string): Promise<string[]> {
  if (!fdb) return []
  const cached = memberUidsCache.get(teamId)
  if (cached && Date.now() - cached.ts < MEMBER_UIDS_TTL) return cached.uids
  const snap = await getDocs(collection(fdb, 'teams', teamId, 'members'))
  const uids = snap.docs.map(d => d.id)
  memberUidsCache.set(teamId, { uids, ts: Date.now() })
  return uids
}
function invalidateMemberUids(teamId: string): void {
  memberUidsCache.delete(teamId)
}

// Lectura: docs propios (incluye los que aún no tienen memberUids) ∪ docs
// compartidos donde el uid está en memberUids. Ambas queries cumplen la regla
// ownsOrShared() de master sin necesidad de exists().
async function loadOwnerOrTeam<T>(table: string, mapper: (r: Row) => T): Promise<T[]> {
  if (!fdb || !auth?.currentUser) return []
  const uid = auth.currentUser.uid
  const col = collection(fdb, table)
  // Las dos queries se autorizan por reglas distintas. La compartida
  // (`array-contains` sobre memberUids) puede ser denegada de forma
  // independiente; si falla no debe tumbar la carga de los docs propios.
  const [ownRes, sharedRes] = await Promise.allSettled([
    getDocs(query(col, where('ownerUid', '==', uid))),
    getDocs(query(col, where('memberUids', 'array-contains', uid))),
  ])
  if (ownRes.status === 'rejected') {
    console.warn(`loadOwnerOrTeam ${table} (own):`, ownRes.reason)
  }
  if (sharedRes.status === 'rejected') {
    console.warn(`loadOwnerOrTeam ${table} (shared):`, sharedRes.reason)
  }
  const docs = [
    ...(ownRes.status === 'fulfilled' ? ownRes.value.docs : []),
    ...(sharedRes.status === 'fulfilled' ? sharedRes.value.docs : []),
  ]
  const seen = new Set<string>()
  const out: T[] = []
  for (const d of docs) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    out.push(mapper({ ...d.data(), id: d.id }))
  }
  return out
}

export const db = {
  async loadTasks(): Promise<Tarea[]> {
    return loadOwnerOrTeam('tasks', fromDbTask)
  },
  async loadProjects(): Promise<Proyecto[]> {
    return loadOwnerOrTeam('projects', fromDbProject)
  },
  async loadEvents(): Promise<Evento[]> {
    return loadOwnerOrTeam('events', fromDbEvent)
  },
  async loadObligations(): Promise<Obligacion[]> {
    return loadOwnerOrTeam('obligations', fromDbObligation)
  },
  async loadPayments(): Promise<Pago[]> {
    return loadOwnerOrTeam('payments', fromDbPayment)
  },
  async loadInvestments(): Promise<Inversion[]> {
    return loadOwnerOrTeam('investments', fromDbInvestment)
  },
  async loadBankAccounts(): Promise<CuentaBancaria[]> {
    return loadOwnerOrTeam('bank_accounts', fromDbBank)
  },
  async loadContacts(): Promise<Contacto[]> {
    return loadOwnerOrTeam('contacts', fromDbContact)
  },
  async loadAccesses(): Promise<AccesoRemoto[]> {
    return loadOwnerOrTeam('remote_accesses', fromDbAccess)
  },
  async loadCalendarConfig(): Promise<CalendarConfig | undefined> {
    if (!fdb || !auth?.currentUser) return undefined
    const snap = await getDoc(doc(fdb, 'calendar_configs', auth.currentUser.uid))
    return snap.exists() ? (snap.data().config as CalendarConfig) : undefined
  },

  async upsert(table: string, row: Record<string, unknown>) {
    if (!fdb) return
    const id = row.id as string
    if (!id) { console.error(`db.upsert ${table}: missing id`); return }
    // Denormaliza memberUids para el sharing por equipo (regla ownsOrShared).
    // Solo poblamos nuestros propios docs; el fan-out a docs de otros dueños al
    // cambiar la membresía lo hace la Cloud Function syncMemberUids (admin SDK).
    const teamId = row.teamId as string | null | undefined
    row.memberUids = teamId ? await getTeamMemberUids(teamId) : []
    try {
      await setDoc(doc(fdb, table, id), row, { merge: true })
    } catch (e) {
      console.error(`db.upsert ${table}:`, e)
    }
  },
  async remove(table: string, id: string) {
    if (!fdb) return
    try {
      await deleteDoc(doc(fdb, table, id))
    } catch (e) {
      console.error(`db.remove ${table}:`, e)
    }
  },

  async loadTeams(): Promise<Team[]> {
    if (!fdb || !auth?.currentUser) return []
    const uid = auth.currentUser.uid
    try {
      // Find all team memberships for this user across all teams
      const memSnap = await getDocs(query(collectionGroup(fdb, 'members'), where('userId', '==', uid)))
      const teams: Team[] = []
      for (const m of memSnap.docs) {
        const teamRef = m.ref.parent.parent
        if (!teamRef) continue
        const teamSnap = await getDoc(teamRef)
        if (teamSnap.exists()) teams.push(fromDbTeam(teamSnap.data(), teamSnap.id))
      }
      return teams
    } catch (e) {
      // El indice de grupo de coleccion (members/userId) puede no estar listo
      // todavia, o la consulta puede fallar de forma transitoria. En ese caso
      // degradamos sin equipos en vez de romper el arranque de la app.
      console.error('db.loadTeams:', e)
      return []
    }
  },
  async loadTeamMembers(teamId: string): Promise<TeamMember[]> {
    if (!fdb) return []
    const memSnap = await getDocs(collection(fdb, 'teams', teamId, 'members'))
    const members: TeamMember[] = []
    for (const m of memSnap.docs) {
      const profile = await this.loadProfile(m.id) ?? undefined
      members.push(fromDbMember(m.data(), m.id, profile))
    }
    return members
  },
  async loadProfile(userId: string): Promise<Profile | null> {
    if (!fdb) return null
    const snap = await getDoc(doc(fdb, 'profiles', userId))
    return snap.exists() ? fromDbProfile(snap.data(), userId) : null
  },
  async searchProfiles(emailQuery: string): Promise<Profile[]> {
    if (!fdb || emailQuery.length < 3) return []
    const q = emailQuery.toLowerCase()
    // Prefix search via emailLowercase. `upsertProfile` (auth.ts) always
    // populates emailLowercase so this query covers all profiles.
    const snap = await getDocs(query(
      collection(fdb, 'profiles'),
      where('emailLowercase', '>=', q),
      where('emailLowercase', '<=', q + ''),
      limit(5),
    ))
    return snap.docs.map(d => fromDbProfile(d.data(), d.id))
  },
  async createTeam(name: string, color: string, userId: string): Promise<Team | null> {
    if (!fdb) return null
    const id = crypto.randomUUID()
    try {
      await setDoc(doc(fdb, 'teams', id), { name, color, createdBy: userId })
      await setDoc(doc(fdb, 'teams', id, 'members', userId), {
        teamId: id, userId, role: 'admin',
      })
      return { id, name, color, createdBy: userId }
    } catch (e) {
      console.error('db.createTeam:', e)
      return null
    }
  },
  async addTeamMember(teamId: string, userId: string, role: TeamMember['role'] = 'editor') {
    if (!fdb) return
    try {
      await setDoc(doc(fdb, 'teams', teamId, 'members', userId), {
        teamId, userId, role,
      })
      invalidateMemberUids(teamId)
    } catch (e) {
      console.error('db.addTeamMember:', e)
    }
  },
  async removeTeamMember(teamId: string, userId: string) {
    if (!fdb) return
    await deleteDoc(doc(fdb, 'teams', teamId, 'members', userId))
    invalidateMemberUids(teamId)
  },
  async updateMemberRole(teamId: string, userId: string, role: TeamMember['role']) {
    if (!fdb) return
    await updateDoc(doc(fdb, 'teams', teamId, 'members', userId), { role })
  },
  async updateTeam(id: string, fields: { name?: string; color?: string }) {
    if (!fdb) return
    await updateDoc(doc(fdb, 'teams', id), fields)
  },
  async deleteTeam(id: string) { await this.remove('teams', id) },

  async upsertTask(t: Tarea, userId: string) { await this.upsert('tasks', toDbTask(t, userId)) },
  async removeTask(id: string) { await this.remove('tasks', id) },
  async upsertProject(p: Proyecto, userId: string) { await this.upsert('projects', toDbProject(p, userId)) },
  async removeProject(id: string) { await this.remove('projects', id) },
  async upsertEvent(e: Evento, userId: string) { await this.upsert('events', toDbEvent(e, userId)) },
  async removeEvent(id: string) { await this.remove('events', id) },
  async upsertObligation(o: Obligacion, userId: string) { await this.upsert('obligations', toDbObligation(o, userId)) },
  async upsertPayment(p: Pago) {
    const uid = auth?.currentUser?.uid ?? ''
    await this.upsert('payments', toDbPayment(p, uid))
  },
  async upsertInvestment(i: Inversion, userId: string) { await this.upsert('investments', toDbInvestment(i, userId)) },
  async removeInvestment(id: string) { await this.remove('investments', id) },
  async upsertBankAccount(c: CuentaBancaria, userId: string) { await this.upsert('bank_accounts', toDbBank(c, userId)) },
  async removeBankAccount(id: string) { await this.remove('bank_accounts', id) },
  async upsertContact(c: Contacto, userId: string) { await this.upsert('contacts', toDbContact(c, userId)) },
  async removeContact(id: string) { await this.remove('contacts', id) },
  async upsertAccess(a: AccesoRemoto, userId: string) { await this.upsert('remote_accesses', toDbAccess(a, userId)) },
  async removeAccess(id: string) { await this.remove('remote_accesses', id) },

  async saveCalendarConfig(userId: string, config: CalendarConfig) {
    if (!fdb) return
    await setDoc(doc(fdb, 'calendar_configs', userId), {
      userId, config, updatedAt: new Date().toISOString(),
    }, { merge: true })
  },
}
