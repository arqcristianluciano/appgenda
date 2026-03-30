import { useState, useEffect, useCallback } from 'react'
import { Check, Plus, Unplug, Loader2 } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import {
  isGoogleConfigured, startGoogleAuth, signOut,
  fetchCalendars, fetchEvents, toLocalEvento, fetchUserInfo,
  getAccountEmails, getTokenForEmail, storeAccount,
} from '../../services/googleCalendar'
import {
  getStoredIcloudUrl, getStoredIcloudColor, loadIcloudEvents,
} from '../../services/icloudCalendar'
import IcloudForm from './IcloudForm'

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

export default function CalendarSources() {
  const { sources, toggleSource, addSource, removeSource, mergeExternalEvents, appendExternalEvents, clearExternalEvents } = useCalendarStore()
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const gconfigured = isGoogleConfigured()

  const loadAccount = useCallback(async (email: string, token: string) => {
    const cals = await fetchCalendars(token)
    const { start, end } = dateRange()
    const allEvts: ReturnType<typeof toLocalEvento>[] = []
    for (const cal of cals) {
      const id = `gcal_${email}_${cal.id}`
      addSource({ id, name: cal.summary, type: 'google', color: cal.backgroundColor || '#4285F4', enabled: true, accountEmail: email })
      const evts = await fetchEvents(token, cal.id, start, end)
      allEvts.push(...evts.map(e => toLocalEvento(e, cal.backgroundColor || '#4285F4')))
    }
    appendExternalEvents(allEvts)
  }, [addSource, appendExternalEvents])

  useEffect(() => {
    const init = async () => {
      // Restaurar todas las cuentas guardadas
      for (const email of getAccountEmails()) {
        const token = getTokenForEmail(email)
        if (!token) continue
        try { await loadAccount(email, token) } catch { /* token expirado */ }
      }
      // Restaurar iCloud
      const icloudUrl = getStoredIcloudUrl()
      if (icloudUrl && !sources.some(s => s.type === 'icloud')) {
        try {
          const events = await loadIcloudEvents(icloudUrl, getStoredIcloudColor())
          mergeExternalEvents(events, 'icloud')
        } catch { /* silencioso */ }
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectGoogle = () => {
    if (!gconfigured || googleBusy) return
    setGoogleBusy(true)
    setGoogleError('')
    // startGoogleAuth() must be called synchronously within the user gesture
    // so the browser doesn't block the OAuth popup
    startGoogleAuth()
      .then(token => fetchUserInfo(token).then(({ email }) => {
        storeAccount(email, token)
        return loadAccount(email, token)
      }))
      .catch(err => {
        const msg = err instanceof Error ? err.message : String(err)
        setGoogleError(msg)
        console.error('Google auth:', err)
      })
      .finally(() => setGoogleBusy(false))
  }

  const disconnectAccount = async (email: string) => {
    signOut(email)
    sources.filter(s => s.accountEmail === email).forEach(s => removeSource(s.id))
    // Reload remaining accounts' events
    clearExternalEvents('google')
    for (const e of getAccountEmails()) {
      const token = getTokenForEmail(e)
      if (!token) continue
      try { await loadAccount(e, token) } catch { /* silencioso */ }
    }
  }

  const googleSources = sources.filter(s => s.type === 'google')
  const accountEmails = [...new Set(googleSources.map(s => s.accountEmail).filter(Boolean) as string[])]
  const hasIcloud = sources.some(s => s.type === 'icloud')

  return (
    <div className="mt-6">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2 px-1">
        Mis calendarios
      </div>

      <div className="space-y-1">
        {/* Calendarios locales y finanzas */}
        {sources.filter(s => s.type !== 'google').map(s => (
          <div key={s.id} className="flex items-center gap-2.5 group py-1 px-1 rounded-lg hover:bg-surface-2 transition-colors">
            <button onClick={() => toggleSource(s.id)}
              className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: s.enabled ? s.color : 'transparent', border: `2px solid ${s.color}` }}>
              {s.enabled && <Check size={11} className="text-white" strokeWidth={3} />}
            </button>
            <span className="text-[13px] text-ink-2 flex-1 truncate">{s.name}</span>
            {s.type === 'icloud' && (
              <button onClick={() => { signOut(); sources.filter(c => c.type === 'icloud').forEach(c => removeSource(c.id)); clearExternalEvents('icloud') }}
                className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-500 transition-all p-0.5">
                <Unplug size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Cuentas Google */}
        {accountEmails.map(email => (
          <div key={email}>
            <div className="flex items-center gap-1 px-1 pt-2 pb-0.5">
              <span className="text-[10px] text-ink-4 truncate flex-1" title={email}>{email}</span>
              <button onClick={() => disconnectAccount(email)}
                className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar cuenta">
                <Unplug size={11} />
              </button>
            </div>
            {googleSources.filter(s => s.accountEmail === email).map(s => (
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
        ))}
      </div>

      <div className="mt-3 space-y-0.5">
        <button onClick={connectGoogle} disabled={!gconfigured || googleBusy}
          className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 w-full">
          {googleBusy ? <Loader2 size={15} className="animate-spin text-accent" /> : <Plus size={15} className="text-accent" />}
          {googleBusy ? 'Conectando…' : 'Agregar cuenta Google'}
          {!gconfigured && <span className="text-[10px] text-ink-4 ml-auto">(.env)</span>}
        </button>
        {googleError && (
          <p className="text-[10px] text-red-500 px-1 leading-tight">{googleError}</p>
        )}
        <IcloudForm hasIcloud={hasIcloud} />
      </div>
    </div>
  )
}
