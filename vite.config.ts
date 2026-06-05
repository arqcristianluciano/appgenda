import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Separa dependencias grandes en chunks de vendor: mejor cacheado (cambian
        // poco) y descarga en paralelo, reduciendo el chunk inicial de la app.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react'
          if (id.includes('/@sentry')) return 'sentry'
          return 'vendor'
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Registramos el SW nosotros (src/lib/registerSw.ts) para poder capturar
      // los fallos transitorios de carga de /sw.js; la inyección automática lo
      // hacía sin `.catch` y el rechazo escalaba a Sentry (APPGENDA-7).
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Las splash screens de iOS las consume Safari al lanzar, no el SW.
        // Precachearlas (~900 KB) solo infla el cache offline sin beneficio.
        globIgnores: ['**/splash/**'],
      },
      manifest: {
        name: 'APPgenda',
        short_name: 'APPgenda',
        description: 'Agenda personal — tareas, finanzas e inversiones',
        theme_color: '#1C1A17',
        background_color: '#0F0F0F',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        shortcuts: [
          {
            name: 'Nueva tarea',
            short_name: 'Tarea',
            url: '/?action=new-task',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Hoy',
            url: '/?view=hoy',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Calendario',
            url: '/?view=semana',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
    sentryVitePlugin({
      org: 'cristian-apps',
      project: 'appgenda',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
})
