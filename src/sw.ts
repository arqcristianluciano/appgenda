import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

// Abrir la app al tocar una notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => 'focus' in c)
        if (existing) return (existing as WindowClient).focus()
        return self.clients.openWindow('/')
      })
  )
})

// Push server-side (futuro) — por ahora solo cierra el push con gracia
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const { title, body } = event.data.json() as { title: string; body: string }
    event.waitUntil(
      self.registration.showNotification(title ?? 'APPgenda', {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      })
    )
  } catch {
    // payload malformado — ignorar
  }
})
