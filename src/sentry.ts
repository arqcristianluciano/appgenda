import * as Sentry from '@sentry/react'
import { esErrorServiceWorkerNoAccionable } from './lib/sentryFilters'

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (dsn) {
    Sentry.init({
          dsn,
          environment: import.meta.env.MODE,
          integrations: [
                  Sentry.browserTracingIntegration(),
                  Sentry.replayIntegration({
                            maskAllText: false,
                            blockAllMedia: false,
                  }),
                ],
          tracesSampleRate: 0.2,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          sendDefaultPii: false,
          // No reportamos fallos de registro del Service Worker causados por el
          // entorno del usuario (SSL/red): no son bugs de la app ni accionables.
          beforeSend(event, hint) {
                  const err = hint?.originalException
                  const mensaje =
                          err instanceof Error
                                  ? err.message
                                  : event.exception?.values?.[0]?.value
                  if (esErrorServiceWorkerNoAccionable(mensaje)) return null
                  return event
          },
    })
}
