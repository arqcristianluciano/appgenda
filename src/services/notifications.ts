// Notificaciones — APPgenda
// Capas: 1) showTrigger (Chrome Android), 2) setTimeout + SW, 3) Notification()
// Pendientes persisten en localStorage y se restauran al reabrir la app.

const STORAGE_KEY = 'agenda_notifs'

// ── iOS / PWA detection ──────────────────────────────────────

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

export const isPWA = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigator as any).standalone === true

/** full = background+foreground | foreground = solo con app abierta | none = no soportado */
export type NotifSupport = 'full' | 'foreground' | 'none'

export function getNotifSupport(): NotifSupport {
  if (!('Notification' in window)) return 'none'
  if (isIOS() && !isPWA()) return 'none'   // Safari sin instalar = no funciona
  if (isIOS()) return 'foreground'          // iOS PWA = solo mientras app abierta
  return 'full'
}

interface StoredNotif {
  id: string
  eventoId: string
  titulo: string
  at: string // ISO datetime
}

// TimestampTrigger (experimental Chrome) — no está en los tipos estándar
interface WindowWithTriggers extends Window {
  TimestampTrigger?: new (ts: number) => object
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

// ── Storage ──────────────────────────────────────────────────

function getStored(): StoredNotif[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function setStored(notifs: StoredNotif[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs))
}

// ── Permisos ─────────────────────────────────────────────────

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export function hasPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

// ── Service Worker registration ───────────────────────────────

async function getSwReg(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try { return await navigator.serviceWorker.ready } catch { return null }
}

// ── Capa 1: showTrigger (app cerrada, Chrome Android) ────────

function supportsShowTrigger(): boolean {
  return 'TimestampTrigger' in (window as WindowWithTriggers)
}

async function scheduleWithTrigger(
  reg: ServiceWorkerRegistration,
  notif: StoredNotif,
): Promise<boolean> {
  if (!supportsShowTrigger()) return false
  const ts = new Date(notif.at).getTime()
  if (ts <= Date.now()) return false
  try {
    const TT = (window as WindowWithTriggers).TimestampTrigger!
    await reg.showNotification('APPgenda', {
      body: notif.titulo,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: notif.id,
      // @ts-expect-error - API experimental, no en tipos estándar
      showTrigger: new TT(ts),
    })
    return true
  } catch {
    return false
  }
}

// ── Capa 2: setTimeout + SW (app abierta/background) ─────────

function scheduleWithTimeout(
  reg: ServiceWorkerRegistration | null,
  notif: StoredNotif,
) {
  const ms = new Date(notif.at).getTime() - Date.now()
  if (ms <= 0) return

  const timer = setTimeout(() => {
    void fireNotification(reg, notif)
    setStored(getStored().filter(n => n.id !== notif.id))
    timers.delete(notif.id)
  }, Math.min(ms, 2_147_483_647)) // cap: ~24.8 días (límite setTimeout)

  timers.set(notif.id, timer)
}

async function fireNotification(
  reg: ServiceWorkerRegistration | null,
  notif: StoredNotif,
) {
  const target = reg ?? await getSwReg()
  if (target) {
    await target.showNotification('APPgenda', {
      body: notif.titulo,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: notif.id,
    })
  } else if (hasPermission()) {
    // Capa 3: fallback básico
    new Notification('APPgenda — ' + notif.titulo)
  }
}

// ── Activar la mejor capa disponible ─────────────────────────

async function activate(reg: ServiceWorkerRegistration | null, notif: StoredNotif) {
  if (reg) {
    const usedTrigger = await scheduleWithTrigger(reg, notif)
    if (usedTrigger) return
  }
  scheduleWithTimeout(reg, notif)
}

// ── API pública ───────────────────────────────────────────────

export async function scheduleNotification(
  eventoId: string,
  titulo: string,
  at: string,
): Promise<boolean> {
  const granted = await requestPermission()
  if (!granted) return false

  const id = `notif_${eventoId}`
  cancelNotification(eventoId) // limpiar previa si existe

  const notif: StoredNotif = { id, eventoId, titulo, at }
  setStored([...getStored().filter(n => n.eventoId !== eventoId), notif])

  const reg = await getSwReg()
  await activate(reg, notif)
  return true
}

export function cancelNotification(eventoId: string) {
  const id = `notif_${eventoId}`

  // Cancelar timer activo
  const timer = timers.get(id)
  if (timer) { clearTimeout(timer); timers.delete(id) }

  // Limpiar de storage
  setStored(getStored().filter(n => n.eventoId !== eventoId))

  // Cancelar showTrigger (si fue programada así)
  void getSwReg().then(reg => {
    if (!reg) return
    void reg.getNotifications({ tag: id }).then(ns => ns.forEach(n => n.close()))
  })
}

export async function restoreNotifications() {
  const now = Date.now()
  const future = getStored().filter(n => new Date(n.at).getTime() > now)
  setStored(future) // purgar las ya vencidas

  if (future.length === 0) return
  const reg = await getSwReg()
  for (const notif of future) {
    await activate(reg, notif)
  }
}

// Restaurar timers al volver a la app (crítico en iOS: el proceso puede ser matado)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void restoreNotifications()
  })
}
