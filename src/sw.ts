import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

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
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => 'focus' in c)
        if (existing) return (existing as WindowClient).focus()
        return self.clients.openWindow(url)
      })
  )
})

// Push vía FCM. Los recordatorios se envían como mensajes "data-only" desde la
// Cloud Function `sendDueReminders`; aquí los mostramos manualmente para tener
// control total (sin duplicados con el auto-display de FCM).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)
  onBackgroundMessage(messaging, (payload) => {
    const d = (payload.data ?? {}) as { title?: string; body?: string; url?: string }
    self.registration.showNotification(d.title || 'APPgenda', {
      body: d.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: d.url || '/' },
    })
  })
}
