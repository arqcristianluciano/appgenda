import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, Plus, Unplug, Loader2, RefreshCw } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import type { Evento, IcloudCalDAVConfig } from '../../types'
import { saveData } from '../../lib/storage'
import {
  isGoogleConfigured, startGoogleAuth, silentAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, fetchUserInfo,
  getAccountEmails, getTokenForEmail, storeAccount,
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

function getIcloudAuthFromAnySource(): IcloudCalDAVConfig | null {
  const storeAuth = useStore.getState().data.calendarConfig?.icloudAuth
  if (storeAuth?.appleId) return storeAuth
  try {
    const raw = localStorage.getItem('icloud_caldav_auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.appleId) return parsed
    }
  } catch { /* ignore */ }
  return null
}

export default function CalendarSources() {
  const { sources, toggleSource, addSource, removeSource, mergeExternalEvents, appendExternalEvents, clearExternalEvents } = useCalendarStore()
  const { updateCalendarConfig } = useStore()
  const configEmails = useStore(s => s.data.calendarConfig?.googleEmails ?? [])

  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [icloudBusy, setIcloudBusy] = useState(false)
  const [icloudError, setIcloudError] = useState('')
  const gconfigured = isGoogleConfigured()
  const loadedEmailsRef = useRef(new Set<string>())

  const loadGoogleEvents = useCallback(async (email: string, token: string) => {
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
    loadedEmailsRef.current.add(email)
  }, [addSource, appendExternalEvents])

  const persistToken = useCallback((email: string, token: string) => {
    storeAccount(email, token)
    const cloudTokens = useStore.getState().data.calendarConfig?.googleTokens ?? {}
    if (cloudTokens[email] !== token) {
      updateCalendarConfig({ googleTokens: { ...cloudTokens, [email]: token } })
    }
  }, [updateCalendarConfig])

  const tryLoadGoogle = useCallback(async (email: string) => {
    const localToken = getTokenForEmail(email)
    const cloudToken = useStore.getState().data.calendarConfig?.googleTokens?.[email]
    const candidates = [localToken, cloudToken].filter(Boolean) as string[]

    for (const token of candidates) {
      try {
        await loadGoogleEvents(email, token)
        persistToken(email, token)
        return
      } catch { /* token inválido, probar siguiente */ }
    }
    try {
      const fresh = await silentAuth(email)
      await loadGoogleEvents(email, fresh)
      persistToken(email, fresh)
    } catch { /* sin sesión Google activa */ }
  }, [loadGoogleEvents, persistToken])

  const loadIcloud = useCallback(async () => {
    setIcloudError('')
    const icloudAuth = getIcloudAuthFromAnySource()
    if (icloudAuth) {
      if (!useStore.getState().data.calendarConfig?.icloudAuth) {
        updateCalendarConfig({ icloudAuth })
        await saveData(useStore.getState().data)
      }
      let calendars = icloudAuth.calendars
      if (!calendars?.length) {
        const principal = await discoverPrincipal(icloudAuth.appleId, icloudAuth.password)
        calendars = await discoverCalendars(principal, icloudAuth.appleId, icloudAuth.password)
        updateCalendarConfig({ icloudAuth: { ...icloudAuth, calendars } })
        await saveData(useStore.getState().data)
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

    let webcal = useStore.getState().data.calendarConfig?.icloudWebcal
    if (!webcal) {
      const url = localStorage.getItem('icloud_cal_url')
      if (url) {
        webcal = {
          url,
          color: localStorage.getItem('icloud_cal_color') || '#A855F7',
          name: localStorage.getItem('icloud_cal_name') || 'iCloud',
        }
        updateCalendarConfig({ icloudWebcal: webcal })
        await saveData(useStore.getState().data)
      }
    }
    if (webcal) {
      addSource({ id: 'icloud_main', name: webcal.name, type: 'icloud', color: webcal.color, enabled: true })
      const events = await loadIcloudEvents(webcal.url, webcal.color)
      mergeExternalEvents(events, 'icloud')
    }
  }, [addSource, mergeExternalEvents, updateCalendarConfig])

  useEffect(() => {
    const init = async () => {
      const cloudEmails = useStore.getState().data.calendarConfig?.googleEmails ?? []
      const localEmails = getAccountEmails()
      const allEmails = [...new Set([...localEmails, ...cloudEmails])]

      for (const email of allEmails) {
        await tryLoadGoogle(email)
      }

      if (!sources.some(s => s.type === 'icloud')) {
        try { await loadIcloud() } catch (err) {
          setIcloudError(err instanceof Error ? err.message : 'Error al cargar iCloud')
        }
      }
    }
    init()

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const emails = useStore.getState().data.calendarConfig?.googleEmails ?? []
      emails.forEach(email => {
        if (!loadedEmailsRef.current.has(email)) tryLoadGoogle(email)
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectGoogle = () => {
    if (!gconfigured || googleBusy) return
    setGoogleBusy(true)
    setGoogleError('')
    startGoogleAuth()
      .then(token => fetchUserInfo(token).then(({ email }) => {
        const cfg = useStore.getState().data.calendarConfig ?? {}
        const emails = cfg.googleEmails ?? []
        updateCalendarConfig({
          googleEmails: emails.includes(email) ? emails : [...emails, email],
          googleTokens: { ...(cfg.googleTokens ?? {}), [email]: token },
        })
        storeAccount(email, token)
        return loadGoogleEvents(email, token).then(() => { loadedEmailsRef.current.add(email) })
      }))
      .catch(err => setGoogleError(err instanceof Error ? err.message : String(err)))
      .finally(() => setGoogleBusy(false))
  }

  const disconnectAccount = async (email: string) => {
    signOut(email)
    loadedEmailsRef.current.delete(email)
    sources.filter(s => s.accountEmail === email).forEach(s => removeSource(s.id))
    const cfg = useStore.getState().data.calendarConfig ?? {}
    const tokens = { ...(cfg.googleTokens ?? {}) }
    delete tokens[email]
    updateCalendarConfig({
      googleEmails: (cfg.googleEmails ?? []).filter(e => e !== email),
      googleTokens: tokens,
    })
    clearExternalEvents('google')
    for (const e of getAccountEmails()) {
      await tryLoadGoogle(e)
    }
  }

  const disconnectIcloud = async () => {
    updateCalendarConfig({ icloudAuth: null, icloudWebcal: null })
    localStorage.removeItem('icloud_caldav_auth')
    localStorage.removeItem('icloud_cal_url')
    localStorage.removeItem('icloud_cal_color')
    localStorage.removeItem('icloud_cal_name')
    await saveData(useStore.getState().data)
    sources.filter(c => c.type === 'icloud').forEach(c => removeSource(c.id))
    clearExternalEvents('icloud')
  }

  const refreshIcloud = async () => {
    if (icloudBusy) return
    setIcloudBusy(true)
    setIcloudError('')
    try {
      sources.filter(s => s.type === 'icloud').forEach(s => removeSource(s.id))
      await loadIcloud()
    } catch (err) {
      setIcloudError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally { setIcloudBusy(false) }
  }

  const googleSources = sources.filter(s => s.type === 'google')
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

        {configEmails.map(email => {
          const emailSources = googleSources.filter(s => s.accountEmail === email)
          return (
            <div key={email}>
              <div className="flex items-center gap-1 px-1 pt-2 pb-0.5">
                <span className="text-[10px] truncate flex-1 text-ink-4" title={email}>{email}</span>
                <button onClick={() => disconnectAccount(email)}
                  className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                  <Unplug size={11} />
                </button>
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
