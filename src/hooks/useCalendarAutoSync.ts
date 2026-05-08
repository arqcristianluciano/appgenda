import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useCalendarStore } from '../store/useCalendarStore'
import { useCalendarSyncStore } from '../store/useCalendarSyncStore'
import { useGoogleCalendar } from '../views/calendar/useGoogleCalendar'
import { useIcloudCalendar } from '../views/calendar/useIcloudCalendar'
import { getAccountEmails } from '../services/googleCalendar'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const THROTTLE_MS = 30_000

function emailsToSync(): string[] {
  const cloudEmails = useStore.getState().data.calendarConfig?.googleEmails ?? []
  return [...new Set([...getAccountEmails(), ...cloudEmails])]
}

function hasIcloudConfig(): boolean {
  const cfg = useStore.getState().data.calendarConfig
  return !!(cfg?.icloudAuth?.appleId || cfg?.icloudWebcal?.url)
}

export function useCalendarAutoSync(enabled: boolean): void {
  const gcal = useGoogleCalendar()
  const icloud = useIcloudCalendar()
  const initRef = useRef(false)
  const lastRunRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const runSync = async (force: boolean) => {
      if (!force && Date.now() - lastRunRef.current < THROTTLE_MS) return
      lastRunRef.current = Date.now()

      const emails = emailsToSync()
      for (const email of emails) {
        if (force || !useCalendarSyncStore.getState().googleLoaded.has(email)) {
          await gcal.tryLoad(email)
        }
      }

      if (hasIcloudConfig()) {
        const icloudSources = useCalendarStore.getState().sources.some(s => s.type === 'icloud')
        if (force || !icloudSources) {
          try { await icloud.load() } catch { /* manejado por hook */ }
        } else {
          icloud.refresh().catch(() => {})
        }
      }
    }

    if (!initRef.current) {
      initRef.current = true
      runSync(true)
    }

    const onVisibleOrFocus = () => {
      if (document.visibilityState === 'visible') runSync(false)
    }
    const onOnline = () => runSync(true)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') runSync(true)
    }, REFRESH_INTERVAL_MS)

    document.addEventListener('visibilitychange', onVisibleOrFocus)
    window.addEventListener('focus', onVisibleOrFocus)
    window.addEventListener('online', onOnline)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibleOrFocus)
      window.removeEventListener('focus', onVisibleOrFocus)
      window.removeEventListener('online', onOnline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
