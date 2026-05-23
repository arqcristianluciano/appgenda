// Tests de las reglas de Firestore (enfoque memberUids) contra el emulator.
// Correr con:  npm run test:rules
//   (= firebase emulators:exec --only firestore "node scripts/test-rules.mjs")
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-appgenda',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
})

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'teams/T1'), { name: 'T1', color: '#fff', createdBy: 'alice' })
  await setDoc(doc(db, 'teams/T1/members/alice'), { teamId: 'T1', userId: 'alice', role: 'admin' })
  await setDoc(doc(db, 'teams/T1/members/bob'), { teamId: 'T1', userId: 'bob', role: 'editor' })
  // doc personal (sin memberUids) y doc de equipo (memberUids poblado)
  await setDoc(doc(db, 'tasks/t-priv'), { ownerUid: 'alice', teamId: null, memberUids: [] })
  await setDoc(doc(db, 'tasks/t-team'), { ownerUid: 'alice', teamId: 'T1', memberUids: ['alice', 'bob'] })
  await setDoc(doc(db, 'payments/p1'), { ownerUid: 'alice', memberUids: [] })
})

const alice = testEnv.authenticatedContext('alice').firestore()
const bob = testEnv.authenticatedContext('bob').firestore()
const carol = testEnv.authenticatedContext('carol').firestore()

let pass = 0, fail = 0
const check = async (name, p) => {
  try { await p; console.log('  ✓', name); pass++ }
  catch (e) { console.log('  ✗', name, '—', e.code || '', e.message || JSON.stringify(e)); fail++ }
}

console.log('\n— Lectura owner / no-owner —')
await check('alice lee su tarea privada', assertSucceeds(getDoc(doc(alice, 'tasks/t-priv'))))
await check('carol NO lee tarea privada de alice', assertFails(getDoc(doc(carol, 'tasks/t-priv'))))

console.log('\n— Sharing por memberUids —')
await check('bob (en memberUids) lee tarea de equipo', assertSucceeds(getDoc(doc(bob, 'tasks/t-team'))))
await check('carol (no en memberUids) NO lee tarea de equipo', assertFails(getDoc(doc(carol, 'tasks/t-team'))))

console.log('\n— LIST queries (las que usa el cliente) —')
await check('alice LIST ownerUid==alice', assertSucceeds(getDocs(query(collection(alice, 'tasks'), where('ownerUid', '==', 'alice')))))
await check('bob LIST memberUids array-contains bob', assertSucceeds(getDocs(query(collection(bob, 'tasks'), where('memberUids', 'array-contains', 'bob')))))
await check('carol LIST memberUids array-contains carol (vacío, permitido)', assertSucceeds(getDocs(query(collection(carol, 'tasks'), where('memberUids', 'array-contains', 'carol')))))

console.log('\n— Escritura sigue siendo solo-dueño —')
await check('alice (dueño) edita su tarea de equipo', assertSucceeds(updateDoc(doc(alice, 'tasks/t-team'), { text: 'x' })))
await check('bob (miembro, no dueño) NO edita la tarea de equipo', assertFails(updateDoc(doc(bob, 'tasks/t-team'), { text: 'hack' })))
await check('alice crea tarea propia', assertSucceeds(setDoc(doc(alice, 'tasks/t-new'), { ownerUid: 'alice', teamId: null, memberUids: [] })))
await check('carol NO crea tarea con ownerUid ajeno', assertFails(setDoc(doc(carol, 'tasks/t-bad'), { ownerUid: 'alice', memberUids: [] })))

console.log('\n— Payments (owner-only) —')
await check('alice lee su payment', assertSucceeds(getDoc(doc(alice, 'payments/p1'))))
await check('carol NO lee payment de alice', assertFails(getDoc(doc(carol, 'payments/p1'))))
await check('carol NO escribe payment de alice', assertFails(setDoc(doc(carol, 'payments/p1'), { ownerUid: 'alice', hacked: true })))

console.log('\n— Teams / members —')
await check('bob (miembro) lee team T1', assertSucceeds(getDoc(doc(bob, 'teams/T1'))))
await check('carol (no-miembro) NO lee team T1', assertFails(getDoc(doc(carol, 'teams/T1'))))
await check('alice (admin) agrega a grace', assertSucceeds(setDoc(doc(alice, 'teams/T1/members/grace'), { teamId: 'T1', userId: 'grace', role: 'editor' })))
await check('bob (no-admin) NO agrega miembros', assertFails(setDoc(doc(bob, 'teams/T1/members/dave'), { teamId: 'T1', userId: 'dave', role: 'editor' })))

console.log(`\n${pass} passed, ${fail} failed\n`)
await testEnv.cleanup()
process.exit(fail > 0 ? 1 : 0)
