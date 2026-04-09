import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    )
  )
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(new NavigationRoute(new NetworkFirst({ cacheName: 'pages' })))

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

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
    // payload malformado
  }
})
