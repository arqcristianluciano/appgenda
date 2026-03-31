import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, Plus, Unplug, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import type { Evento } from '../../types'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, fetchUserInfo,
  getAccountEmails, getTokenForEmail, storeAccount,
  silentAuth, TOKEN_REFRESH_MS,
} from '../../services/googleCalendar'
import { loadIcloudEvents } from '../../services/icloudCalendar'
import {
  fetchCalendarEvents, discoverPrincipal, discoverCalendars,
} from '../../services/icloudCalDAV'
import IcloudAuthForm from './IcloudAuthForm'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateRange() {
  const now = new Date()
  return {
    start: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: toISO(new Date(now.getFullYear(), now.getMonth() + 6, 0)),
  }
}

const LEGACY_ICLOUD_AUTH_KEY = 'icloud_caldav_auth'
const LEGACY_ICLOUD_URL_KEY = 'icloud_cal_url'
const LEGACY_GCAL_ACCOUNTS_KEY = 'gcal_accounts'

function migrateLegacyToStore(updateCalendarConfig: (patch: Record<string, unknown>) => void) {
  let migrated = false

  const rawAuth = localStorage.getItem(LEGACY_ICLOUD_AUTH_KEY)
  if (rawAuth) {
    try {
      const parsed = JSON.parse(rawAuth)
      if (parsed?.appleId) {
        updateCalendarConfig({ icloudAuth: parsed })
        migrated = true
      }
    } catch { /* ignore */ }
    localStorage.removeItem(LEGACY_ICLOUD_AUTH_KEY)
  }

  const rawUrl = localStorage.getItem(LEGACY_ICLOUD_URL_KEY)
  if (rawUrl && !migrated) {
    const color = localStorage.getItem('icloud_cal_color') || '#A855F7'
    const name = localStorage.getItem('icloud_cal_name') || 'iCloud'
    updateCalendarConfig({ icloudWebcal: { url: rawUrl, color, name } })
    localStorage.removeItem(LEGACY_ICLOUD_URL_KEY)
    localStorage.removeItem('icloud_cal_color')
    localStorage.removeItem('icloud_cal_name')
  }

  const rawAccounts = localStorage.getItem(LEGACY_GCAL_ACCOUNTS_KEY)
  if (rawAccounts) {
    try {
      const emails = Object.keys(JSON.parse(rawAccounts))
      if (emails.length > 0) updateCalendarConfig({ googleEmails: emails })
    } catch { /* ignore */ }
  }
}

export default function CalendarSources() {
  const { sources, toggleSource, addSource, removeSource, mergeExternalEvents, appendExternalEvents, clearExternalEvents } = useCalendarStore()
  const { data, updateCalendarConfig } = useStore()
  const calConfig = data.calendarConfig ?? {}

  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [needsReauth, setNeedsReauth] = useState<Set<string>>(new Set())
  const [icloudBusy, setIcloudBusy] = useState(false)
  const [icloudError, setIcloudError] = useState('')
  const gconfigured = isGoogleConfigured()
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadAccount = useCallback(async (email: string, token: string) => {
    const cals = await fetchCalendars(token)
    const { start, end } = dateRange()
    const allEvts: ReturnType<typeof toLocalEvento>[] = []
    for (const cal of cals) {
      const sourceId = `gcal_${email}_${cal.id}`
      addSource({ id: sourceId, name: cal.summary, type: 'google', color: cal.backgroundColor || '#4285F4', enabled: true, accountEmail: email })
      const evts = await fetchEvents(token, cal.id, start, end)
      allEvts.push(...evts.map(e => toLocalEvento(e, cal.backgroundColor || '#4285F4', sourceId)))
    }
    appendExternalEvents(allEvts)
  }, [addSource, appendExternalEvents])

  const tryLoadAccount = useCallback(async (email: string) => {
    let token = getTokenForEmail(email)
    if (!token) {
      setNeedsReauth(prev => new Set([...prev, email]))
      return
    }
    try {
      await loadAccount(email, token)
      setNeedsReauth(prev => { const s = new Set(prev); s.delete(email); return s })
    } catch {
      try {
        token = await silentAuth(email)
        await loadAccount(email, token)
        setNeedsReauth(prev => { const s = new Set(prev); s.delete(email); return s })
      } catch {
        setNeedsReauth(prev => new Set([...prev, email]))
      }
    }
  }, [loadAccount])

  const refreshAllAccounts = useCallback(async () => {
    clearExternalEvents('google')
    for (const email of getAccountEmails()) {
      await tryLoadAccount(email)
    }
  }, [tryLoadAccount, clearExternalEvents])

  const loadIcloudFromConfig = useCallback(async () => {
    setIcloudError('')
    const icloudAuth = calConfig.icloudAuth
    if (icloudAuth) {
      let calendars = icloudAuth.calendars
      if (!calendars.length) {
        const principal = await discoverPrincipal(icloudAuth.appleId, icloudAuth.password)
        calendars = await discoverCalendars(principal, icloudAuth.appleId, icloudAuth.password)
        updateCalendarConfig({ icloudAuth: { ...icloudAuth, calendars } })
      }
      const allEvts: Evento[] = []
      for (const cal of calendars) {
        const sourceId = `icloud_${encodeURIComponent(cal.url)}`
        addSource({ id: sourceId, name: cal.name, type: 'icloud', color: cal.color, enabled: true })
        const evts = await fetchCalendarEvents(cal, icloudAuth.appleId, icloudAuth.password)
        allEvts.push(...evts)
      }
      mergeExternalEvents(allEvts, 'icloud')
      return
    }

    const webcal = calConfig.icloudWebcal
    if (webcal) {
      addSource({ id: 'icloud_main', name: webcal.name, type: 'icloud', color: webcal.color, enabled: true })
      const events = await loadIcloudEvents(webcal.url, webcal.color)
      mergeExternalEvents(events, 'icloud')
    }
  }, [calConfig, addSource, mergeExternalEvents, updateCalendarConfig])

  useEffect(() => {
    const init = async () => {
      migrateLegacyToStore(updateCalendarConfig)

      const localEmails = getAccountEmails()
      const syncedEmails = calConfig.googleEmails ?? []
      const allEmails = [...new Set([...localEmails, ...syncedEmails])]
      for (const email of allEmails) {
        await tryLoadAccount(email)
      }
      if (localEmails.length > 0 && !syncedEmails.length) {
        updateCalendarConfig({ googleEmails: localEmails })
      }

      if (!sources.some(s => s.type === 'icloud')) {
        try { await loadIcloudFromConfig() } catch (err) {
          setIcloudError(err instanceof Error ? err.message : 'Error al cargar iCloud')
        }
      }
    }
    init()

    refreshTimerRef.current = setInterval(refreshAllAccounts, TOKEN_REFRESH_MS)
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectGoogle = () => {
    if (!gconfigured || googleBusy) return
    setGoogleBusy(true)
    setGoogleError('')
    startGoogleAuth()
      .then(token => fetchUserInfo(token).then(({ email }) => {
        storeAccount(email, token)
        const current = calConfig.googleEmails ?? []
        if (!current.includes(email)) updateCalendarConfig({ googleEmails: [...current, email] })
        setNeedsReauth(prev => { const s = new Set(prev); s.delete(email); return s })
        return loadAccount(email, token)
      }))
      .catch(err => setGoogleError(err instanceof Error ? err.message : String(err)))
      .finally(() => setGoogleBusy(false))
  }

  const reconnectAccount = (email: string) => {
    if (googleBusy) return
    setGoogleBusy(true)
    setGoogleError('')
    startGoogleAuth()
      .then(token => {
        storeAccount(email, token)
        setNeedsReauth(prev => { const s = new Set(prev); s.delete(email); return s })
        return loadAccount(email, token)
      })
      .catch(err => setGoogleError(err instanceof Error ? err.message : String(err)))
      .finally(() => setGoogleBusy(false))
  }

  const disconnectAccount = async (email: string) => {
    signOut(email)
    sources.filter(s => s.accountEmail === email).forEach(s => removeSource(s.id))
    setNeedsReauth(prev => { const s = new Set(prev); s.delete(email); return s })
    const remaining = (calConfig.googleEmails ?? []).filter(e => e !== email)
    updateCalendarConfig({ googleEmails: remaining })
    clearExternalEvents('google')
    for (const e of getAccountEmails()) {
      const token = getTokenForEmail(e)
      if (!token) continue
      try { await loadAccount(e, token) } catch { /* silencioso */ }
    }
  }

  const disconnectIcloud = () => {
    updateCalendarConfig({ icloudAuth: null, icloudWebcal: null })
    sources.filter(c => c.type === 'icloud').forEach(c => removeSource(c.id))
    clearExternalEvents('icloud')
  }

  const refreshIcloud = async () => {
    if (icloudBusy) return
    setIcloudBusy(true)
    setIcloudError('')
    try {
      sources.filter(s => s.type === 'icloud').forEach(s => removeSource(s.id))
      const icloudAuth = calConfig.icloudAuth
      if (icloudAuth) {
        const principal = await discoverPrincipal(icloudAuth.appleId, icloudAuth.password)
        const calendars = await discoverCalendars(principal, icloudAuth.appleId, icloudAuth.password)
        updateCalendarConfig({ icloudAuth: { ...icloudAuth, calendars } })
        const allEvts: Evento[] = []
        for (const cal of calendars) {
          const sourceId = `icloud_${encodeURIComponent(cal.url)}`
          addSource({ id: sourceId, name: cal.name, type: 'icloud', color: cal.color, enabled: true })
          const evts = await fetchCalendarEvents(cal, icloudAuth.appleId, icloudAuth.password)
          allEvts.push(...evts)
        }
        mergeExternalEvents(allEvts, 'icloud')
      } else if (calConfig.icloudWebcal) {
        const { url, color, name } = calConfig.icloudWebcal
        addSource({ id: 'icloud_main', name, type: 'icloud', color, enabled: true })
        const events = await loadIcloudEvents(url, color)
        mergeExternalEvents(events, 'icloud')
      }
    } catch (err) {
      setIcloudError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally { setIcloudBusy(false) }
  }

  const googleSources = sources.filter(s => s.type === 'google')
  const connectedEmails = [...new Set(googleSources.map(s => s.accountEmail).filter(Boolean) as string[])]
  const disconnectedEmails = [...needsReauth].filter(e => !connectedEmails.includes(e))
  const allGoogleEmails = [...new Set([...connectedEmails, ...disconnectedEmails])]
  const hasIcloud = sources.some(s => s.type === 'icloud')

  return (
    <div className="mt-6">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2 px-1">
        Mis calendarios
      </div>

      <div className="space-y-1">
        {sources.filter(s => s.type !== 'google').map(s => (
          <div key={s.id} className="flex items-center gap-2.5 group py-1 px-1 rounded-lg hover:bg-surface-2 transition-colors">
            <button onClick={() => toggleSource(s.id)}
              className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: s.enabled ? s.color : 'transparent', border: `2px solid ${s.color}` }}>
              {s.enabled && <Check size={11} className="text-white" strokeWidth={3} />}
            </button>
            <span className="text-[13px] text-ink-2 flex-1 truncate">{s.name}</span>
            {s.type === 'icloud' && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                <button onClick={refreshIcloud} disabled={icloudBusy}
                  className="text-ink-4 hover:text-accent transition-colors p-0.5" title="Actualizar">
                  {icloudBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                </button>
                <button onClick={disconnectIcloud}
                  className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                  <Unplug size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {allGoogleEmails.map(email => {
          const isDisconnected = needsReauth.has(email)
          const emailSources = googleSources.filter(s => s.accountEmail === email)
          return (
            <div key={email}>
              <div className="flex items-center gap-1 px-1 pt-2 pb-0.5">
                {isDisconnected && <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />}
                <span className={`text-[10px] truncate flex-1 ${isDisconnected ? 'text-amber-500' : 'text-ink-4'}`} title={email}>{email}</span>
                {isDisconnected ? (
                  <button onClick={() => reconnectAccount(email)} disabled={googleBusy}
                    className="text-amber-500 hover:text-amber-400 transition-colors p-0.5 flex items-center gap-0.5" title="Reconectar">
                    <RefreshCw size={11} />
                  </button>
                ) : (
                  <button onClick={() => disconnectAccount(email)}
                    className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                    <Unplug size={11} />
                  </button>
                )}
              </div>
              {emailSources.map(s => (
                <div key={s.id} className="flex items-center gap-2.5 py-1 px-1 rounded-lg hover:bg-surface-2 transition-colors">
                  <button onClick={() => toggleSource(s.id)}
                    className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ backgroundColor: s.enabled ? s.color : 'transparent', border: `2px solid ${s.color}` }}>
                    {s.enabled && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className="text-[13px] text-ink-2 flex-1 truncate">{s.name}</span>
                </div>
              ))}
              {isDisconnected && emailSources.length === 0 && (
                <p className="text-[10px] text-ink-4 px-1 pb-1">Sesión expirada</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 space-y-0.5">
        <button onClick={connectGoogle} disabled={!gconfigured || googleBusy}
          className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 w-full">
          {googleBusy ? <Loader2 size={15} className="animate-spin text-accent" /> : <Plus size={15} className="text-accent" />}
          {googleBusy ? 'Conectando…' : 'Agregar cuenta Google'}
          {!gconfigured && <span className="text-[10px] text-ink-4 ml-auto">(.env)</span>}
        </button>
        {googleError && <p className="text-[10px] text-red-500 px-1 leading-tight">{googleError}</p>}
        {icloudError && <p className="text-[10px] text-red-500 px-1 leading-tight">{icloudError}</p>}
        <IcloudAuthForm hasIcloud={hasIcloud} />
      </div>
    </div>
  )
}
