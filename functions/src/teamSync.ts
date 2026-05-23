import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) initializeApp()

// Colecciones owner-scoped que pueden compartirse por equipo (llevan teamId).
const COLLECTIONS = [
  'tasks', 'events', 'projects', 'obligations',
  'investments', 'bank_accounts', 'contacts', 'remote_accesses',
]

// Mantiene memberUids sincronizado: cuando se agrega/quita un miembro de un
// equipo, recalcula la lista de uids y la propaga a TODOS los docs de ese
// equipo. Corre con admin SDK, así que puede escribir docs de cualquier dueño
// (el cliente solo puede poblar memberUids en sus propios docs por las reglas).
export const syncMemberUids = onDocumentWritten(
  { document: 'teams/{teamId}/members/{memberId}', region: 'us-east1' },
  async (event) => {
    const { teamId } = event.params as { teamId: string }
    const fdb = getFirestore()

    const membersSnap = await fdb.collection('teams').doc(teamId).collection('members').get()
    const uids = membersSnap.docs.map(d => d.id)

    for (const coll of COLLECTIONS) {
      const docsSnap = await fdb.collection(coll).where('teamId', '==', teamId).get()
      let batch = fdb.batch()
      let n = 0
      for (const d of docsSnap.docs) {
        batch.update(d.ref, { memberUids: uids })
        if (++n >= 450) { await batch.commit(); batch = fdb.batch(); n = 0 }
      }
      if (n > 0) await batch.commit()
    }
  },
)
