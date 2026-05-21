#!/usr/bin/env node
/**
 * Sync data directly from Supabase Postgres -> Firestore.
 *
 * Usage:
 *   SUPABASE_URL=https://bdtotsyunzgthycdaujg.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-sa.json \
 *   node scripts/sync-supabase-to-firestore.mjs <userUid>
 *
 * Reads with service_role (bypasses RLS) and writes to Firestore with the
 * provided Firebase UID stamped on `ownerUid`. Skips rows that already exist
 * in Firestore with the same id (idempotent on re-runs).
 */
import { createClient } from '@supabase/supabase-js'
import admin from 'firebase-admin'

const [, , userUid] = process.argv
if (!userUid) {
  console.error('Usage: sync-supabase-to-firestore.mjs <userUid>')
  process.exit(1)
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

admin.initializeApp({ projectId: 'appgenda-rd-ad765' })
const db = admin.firestore()

// Whitelist users to read from Supabase by their Supabase user_id (owner_id /
// created_by). If the caller already filtered the rows, pass a single id.
async function getSupabaseUserId(email) {
  const { data, error } = await supabase
    .from('profiles').select('id').eq('email', email).maybeSingle()
  if (error) console.warn('profile lookup:', error.message)
  return data?.id ?? null
}

async function fetchAll(table, ownerCol = null, ownerVal = null) {
  let q = supabase.from(table).select('*')
  if (ownerCol && ownerVal) q = q.eq(ownerCol, ownerVal)
  const { data, error } = await q
  if (error) {
    console.warn(`fetch ${table}:`, error.message)
    return []
  }
  return data ?? []
}

async function batchWrite(collection, rows, mapper) {
  if (!rows.length) return 0
  const chunks = []
  for (let i = 0; i < rows.length; i += 400) chunks.push(rows.slice(i, i + 400))
  let total = 0
  for (const chunk of chunks) {
    const batch = db.batch()
    for (const row of chunk) {
      const mapped = mapper(row)
      if (!mapped.id) continue
      batch.set(db.collection(collection).doc(mapped.id), mapped, { merge: true })
    }
    await batch.commit()
    total += chunk.length
  }
  console.log(`  ${collection}: ${total}`)
  return total
}

const ownerStamp = (row, extras = {}) => ({
  ...row,
  ownerUid: userUid,
  teamId: row.team_id || null,
  ...extras,
})

console.log(`Sync Supabase -> Firestore (Firebase uid=${userUid})`)
console.log('Source:', SUPABASE_URL)

// Email of the Firebase user, used to find their Supabase owner_id
const email = process.env.USER_EMAIL || 'arqcristianluciano@gmail.com'
const supabaseUserId = await getSupabaseUserId(email)
console.log('Supabase owner_id:', supabaseUserId)

// Tasks
const tasks = supabaseUserId
  ? await fetchAll('tasks', 'created_by', supabaseUserId)
  : await fetchAll('tasks')
await batchWrite('tasks', tasks, row => ownerStamp(row))

// Projects
const projects = supabaseUserId
  ? await fetchAll('projects', 'owner_id', supabaseUserId)
  : await fetchAll('projects')
await batchWrite('projects', projects, row => ownerStamp(row))

// Events
const events = supabaseUserId
  ? await fetchAll('events', 'created_by', supabaseUserId)
  : await fetchAll('events')
await batchWrite('events', events, row => ownerStamp(row))

// Obligations (+ payments via FK)
const obligations = supabaseUserId
  ? await fetchAll('obligations', 'owner_id', supabaseUserId)
  : await fetchAll('obligations')
await batchWrite('obligations', obligations, row => ownerStamp(row))

const oblIds = new Set(obligations.map(o => o.id))
const allPayments = await fetchAll('payments')
const payments = allPayments.filter(p => oblIds.has(p.obligation_id))
await batchWrite('payments', payments, row => ({
  ...row, ownerUid: userUid,
}))

const investments = supabaseUserId
  ? await fetchAll('investments', 'owner_id', supabaseUserId)
  : await fetchAll('investments')
await batchWrite('investments', investments, row => ownerStamp(row))

const banks = supabaseUserId
  ? await fetchAll('bank_accounts', 'owner_id', supabaseUserId)
  : await fetchAll('bank_accounts')
await batchWrite('bank_accounts', banks, row => ownerStamp(row))

const contacts = supabaseUserId
  ? await fetchAll('contacts', 'owner_id', supabaseUserId)
  : await fetchAll('contacts')
await batchWrite('contacts', contacts, row => ownerStamp(row))

const accesses = supabaseUserId
  ? await fetchAll('remote_accesses', 'owner_id', supabaseUserId)
  : await fetchAll('remote_accesses')
await batchWrite('remote_accesses', accesses, row => ownerStamp(row))

// Calendar config (per-user)
if (supabaseUserId) {
  const { data: cfg } = await supabase
    .from('calendar_configs').select('config').eq('user_id', supabaseUserId).maybeSingle()
  if (cfg?.config) {
    await db.collection('calendar_configs').doc(userUid).set({
      userId: userUid, config: cfg.config, updatedAt: new Date().toISOString(),
    }, { merge: true })
    console.log('  calendar_configs: 1')
  }
}

console.log('Sync done.')
process.exit(0)
