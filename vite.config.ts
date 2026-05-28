import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
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
