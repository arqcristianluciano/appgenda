// ============================================================
// Servicio de notificaciones locales — APPgenda
// Usa setTimeout + localStorage para persistir entre sesiones.
// Las notificaciones solo disparan si la app está abierta/background.
// ============================================================

const STORAGE_KEY = 'agenda_notifs'

interface StoredNotif {
  id: string
  eventoId: string
  titulo: string
  at: string // ISO datetime
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

// ── Storage helpers ─────────────────────────────────────────

function getStored(): StoredNotif[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function setStored(notifs: StoredNotif[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs))
}

// ── Permission ───────────────────────────────────────────────

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

// ── Fire ────────────────────────────────────────────────────

function fire(titulo: string) {
  if (!hasPermission()) return
  try {
    new Notification('APPgenda — ' + titulo, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
    })
  } catch {
    // Safari puede no soportar algunos campos
    new Notification('APPgenda — ' + titulo)
  }
}

// ── Schedule ────────────────────────────────────────────────

function activateTimer(notif: StoredNotif) {
  const ms = new Date(notif.at).getTime() - Date.now()
  if (ms <= 0) return

  const timer = setTimeout(() => {
    fire(notif.titulo)
    setStored(getStored().filter(n => n.id !== notif.id))
    timers.delete(notif.id)
  }, Math.min(ms, 2_147_483_647)) // Max setTimeout ~24.8 días

  timers.set(notif.id, timer)
}

export async function scheduleNotification(eventoId: string, titulo: string, at: string): Promise<boolean> {
  const granted = await requestPermission()
  if (!granted) return false

  const id = `notif_${eventoId}`
  cancelNotification(eventoId)

  const notif: StoredNotif = { id, eventoId, titulo, at }
  const stored = getStored().filter(n => n.eventoId !== eventoId)
  setStored([...stored, notif])
  activateTimer(notif)
  return true
}

export function cancelNotification(eventoId: string) {
  const id = `notif_${eventoId}`
  const timer = timers.get(id)
  if (timer) { clearTimeout(timer); timers.delete(id) }
  setStored(getStored().filter(n => n.eventoId !== eventoId))
}

// ── Restore on app load ─────────────────────────────────────

export function restoreNotifications() {
  const now = Date.now()
  const stored = getStored()
  const future = stored.filter(n => new Date(n.at).getTime() > now)
  setStored(future)
  future.forEach(activateTimer)
}
