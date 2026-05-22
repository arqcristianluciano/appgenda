#!/usr/bin/env node
/**
 * Migrate user backup JSON -> Firestore.
 *
 * Usage:
 *   node scripts/migrate-to-firestore.mjs <backup.json> <userUid>
 *
 * Requires:
 *   GOOGLE_APPLICATION_CREDENTIALS pointing to Firebase service account JSON.
 *
 * Backup shape (AppData export):
 *   { tareas, eventos, proyectos, obligaciones, pagos, inversiones, calendarConfig,
 *     cuentas?, contactos?, accesos? }
 */
import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const [, , backupPath, userUid] = process.argv
if (!backupPath || !userUid) {
  console.error('Usage: migrate-to-firestore.mjs <backup.json> <userUid>')
  process.exit(1)
}

admin.initializeApp({ projectId: 'appgenda-rd-ad765' })
const db = admin.firestore()

const raw = JSON.parse(readFileSync(backupPath, 'utf8'))
// Support both wrapped { agendaData, datos } and flat AppData
const app = raw.agendaData ?? raw
const datos = raw.datos

const toDbTask = (t, uid) => ({
  id: t.id, text: t.txt, done: t.done ?? false, priority: t.prio ?? 'media',
  project_id: t.proj || null, date: t.fecha ?? '', note: t.nota ?? '',
  notification: t.notificacion || null, position: 0,
  assignee_id: t.assigneeId || null, team_id: t.teamId || null,
  ownerUid: uid, teamId: t.teamId || null,
})

const toDbProject = (p, uid) => ({
  id: p.id, name: p.nombre, color: p.color,
  team_id: p.teamId || null, ownerUid: uid, teamId: p.teamId || null,
})

const toDbEvent = (e, uid) => ({
  id: e.id, title: e.titulo, date: e.fecha, date_end: e.fechaFin || null,
  time_start: e.hora ?? '', time_end: e.horaFin || null, note: e.nota ?? '',
  all_day: e.allDay ?? false, color: e.color || null, done: e.done ?? false,
  source: e.source || 'local', source_id: e.sourceId || null,
  calendar_source_id: e.calendarSourceId || null,
  notification: e.notificacion || null, project_id: e.proj || null,
  team_id: e.teamId || null, ownerUid: uid, teamId: e.teamId || null,
})

const toDbObligation = (o, uid) => ({
  id: o.id, text: o.txt, type: o.tipo,
  team_id: o.teamId || null, ownerUid: uid, teamId: o.teamId || null,
})

const toDbPayment = (p, uid) => ({
  id: p.id, obligation_id: p.oblId, month: p.mes, done: p.done, date: p.fecha ?? '',
  ownerUid: uid,
})

const toDbInvestment = (i, uid) => ({
  id: i.id, name: i.nombre, category: i.cat, currency: i.moneda,
  purchase_price: i.compra, current_price: i.actual,
  date: i.fecha ?? '', note: i.nota ?? '',
  team_id: i.teamId || null, ownerUid: uid, teamId: i.teamId || null,
})

const toDbBank = (c, uid) => ({
  id: c.id, banco: c.banco ?? '', tipo: c.tipo ?? '', numero: c.numero ?? '',
  titular: c.titular ?? '', telefono: c.telefono ?? '', nota: c.nota ?? '',
  tipo_cuenta: c.tipoCuenta || 'personal', cedula: c.cedula || null,
  rnc: c.rnc || null, pais: c.pais || null, swift: c.swift || null,
  iban: c.iban || null, banco_intermediario: c.bancoIntermediario || null,
  direccion_banco: c.direccionBanco || null, team_id: c.teamId || null,
  ownerUid: uid, teamId: c.teamId || null,
})

const toDbContact = (c, uid) => ({
  id: c.id, nombre: c.nombre ?? '', cedula: c.cedula ?? '',
  telefono: c.telefono ?? '', email: c.email ?? '', nota: c.nota ?? '',
  team_id: c.teamId || null, ownerUid: uid, teamId: c.teamId || null,
})

const toDbAccess = (a, uid) => ({
  id: a.id, nombre: a.nombre ?? '', app: a.app ?? 'anydesk',
  codigo: a.codigo ?? '', password: a.password ?? '', nota: a.nota ?? '',
  team_id: a.teamId || null, ownerUid: uid, teamId: a.teamId || null,
})

async function batchUpsert(collection, items, mapper) {
  if (!items?.length) return 0
  const batches = []
  for (let i = 0; i < items.length; i += 400) {
    batches.push(items.slice(i, i + 400))
  }
  let total = 0
  for (const chunk of batches) {
    const batch = db.batch()
    for (const item of chunk) {
      const data = mapper(item, userUid)
      if (!data.id) continue
      batch.set(db.collection(collection).doc(data.id), data, { merge: true })
    }
    await batch.commit()
    total += chunk.length
  }
  console.log(`  ${collection}: ${total}`)
  return total
}

console.log(`Migrando backup -> Firestore (uid=${userUid})`)

await batchUpsert('tasks', app.tareas, toDbTask)
await batchUpsert('projects', app.proyectos, toDbProject)
await batchUpsert('events', app.eventos, toDbEvent)
await batchUpsert('obligations', app.obligaciones, toDbObligation)
await batchUpsert('payments', app.pagos, toDbPayment)
await batchUpsert('investments', app.inversiones, toDbInvestment)

if (datos) {
  await batchUpsert('bank_accounts', datos.cuentas, toDbBank)
  await batchUpsert('contacts', datos.contactos, toDbContact)
  await batchUpsert('remote_accesses', datos.accesos, toDbAccess)
}

if (app.calendarConfig) {
  await db.collection('calendar_configs').doc(userUid).set({
    userId: userUid, config: app.calendarConfig, updatedAt: new Date().toISOString(),
  }, { merge: true })
  console.log('  calendar_configs: 1')
}

console.log('OK')
process.exit(0)
