import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

if (!getApps().length) initializeApp()

// Ventana hacia atrás mayor que el intervalo del schedule: si una corrida se
// salta, la siguiente igual recoge los recordatorios vencidos sin duplicar
// (la colección sent_reminders deduplica).
const WINDOW_MS = 16 * 60 * 1000

interface Due {
  ownerUid: string
  body: string
  key: string
}

// Envía push por los recordatorios vencidos. El campo `notification` (datetime
// ISO) de tasks/events marca cuándo avisar; los tokens viven en push_tokens/{uid}.
export const sendDueReminders = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'us-east1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const fdb = getFirestore()
    const now = Date.now()
    const nowISO = new Date(now).toISOString()
    const windowStart = now - WINDOW_MS

    // Consulta sobre `notification_at` (epoch ms absoluto) → sin ambigüedad de
    // zona horaria. Rango sobre un único campo: no requiere índice compuesto.
    const due: Due[] = []
    for (const table of ['tasks', 'events'] as const) {
      const snap = await fdb
        .collection(table)
        .where('notification_at', '>=', windowStart)
        .where('notification_at', '<=', now)
        .get()
      for (const d of snap.docs) {
        const r = d.data()
        if (r.done) continue
        const ownerUid = r.ownerUid as string | undefined
        if (!ownerUid) continue
        const body = (r.text ?? r.title ?? 'Tenés un recordatorio') as string
        due.push({ ownerUid, body, key: `${table}_${d.id}_${r.notification_at}` })
      }
    }
    if (due.length === 0) return

    const sentCol = fdb.collection('sent_reminders')
    const tokensCache = new Map<string, string[]>()
    let sent = 0

    for (const item of due) {
      const sentRef = sentCol.doc(item.key.replace(/[/.]/g, '_'))
      // create() falla si ya existe → dedup atómico, a prueba de corridas solapadas.
      try {
        await sentRef.create({ at: nowISO })
      } catch {
        continue
      }

      let tokens = tokensCache.get(item.ownerUid)
      if (!tokens) {
        const tdoc = await fdb.collection('push_tokens').doc(item.ownerUid).get()
        tokens = (tdoc.get('tokens') as string[] | undefined) ?? []
        tokensCache.set(item.ownerUid, tokens)
      }
      if (tokens.length === 0) {
        await sentRef.update({ skipped: 'no-tokens' }).catch(() => undefined)
        continue
      }

      const res = await getMessaging().sendEachForMulticast({
        tokens,
        data: { title: 'APPgenda', body: item.body, url: '/' },
      })
      sent += res.successCount

      // Limpia tokens inválidos/caducados.
      const invalid: string[] = []
      res.responses.forEach((resp, i) => {
        const code = resp.error?.code ?? ''
        if (
          !resp.success &&
          (code.includes('registration-token-not-registered') ||
            code.includes('invalid-argument'))
        ) {
          invalid.push(tokens![i])
        }
      })
      if (invalid.length) {
        await fdb
          .collection('push_tokens')
          .doc(item.ownerUid)
          .update({ tokens: FieldValue.arrayRemove(...invalid) })
          .catch(() => undefined)
      }

      await sentRef.update({ sent: res.successCount }).catch(() => undefined)
    }

    console.info(`sendDueReminders: recordatorios=${due.length} enviados=${sent}`)
  },
)
