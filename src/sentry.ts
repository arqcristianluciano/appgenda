import * as Sentry from '@sentry/react'

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
    })
}
