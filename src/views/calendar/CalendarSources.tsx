import { useEffect } from 'react'
import { Check, Plus, Unplug, Loader2, RefreshCw } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import { getAccountEmails } from '../../services/googleCalendar'
import IcloudAuthForm from './IcloudAuthForm'
import { useGoogleCalendar } from './useGoogleCalendar'
import { useIcloudCalendar } from './useIcloudCalendar'

export default function CalendarSources() {
  const { sources, toggleSource } = useCalendarStore()
  const configEmails = useStore(s => s.data.calendarConfig?.googleEmails ?? [])

  const gcal = useGoogleCalendar()
  const icloud = useIcloudCalendar()

  useEffect(() => {
    const init = async () => {
      const cloudEmails = useStore.getState().data.calendarConfig?.googleEmails ?? []
      const allEmails = [...new Set([...getAccountEmails(), ...cloudEmails])]
      for (const email of allEmails) await gcal.tryLoad(email)

      if (!sources.some(s => s.type === 'icloud')) {
        try { await icloud.load() } catch { /* handled in hook */ }
      }
    }
    init()

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const emails = useStore.getState().data.calendarConfig?.googleEmails ?? []
      emails.forEach(email => {
        if (!gcal.loadedRef.current.has(email)) gcal.tryLoad(email)
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
                <button onClick={icloud.refresh} disabled={icloud.busy}
                  className="text-ink-4 hover:text-accent transition-colors p-0.5" title="Actualizar">
                  {icloud.busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                </button>
                <button onClick={icloud.disconnect}
                  className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                  <Unplug size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {configEmails.map(email => {
          const emailSources = googleSources.filter(s => s.accountEmail === email)
          const needsReauth = gcal.needsAuth.has(email)
          return (
            <div key={email}>
              <div className="flex items-center gap-1 px-1 pt-2 pb-0.5">
                <span className={`text-[10px] truncate flex-1 ${needsReauth ? 'text-amber-500' : 'text-ink-4'}`} title={email}>{email}</span>
                {needsReauth ? (
                  <button onClick={() => gcal.reconnect(email)} disabled={gcal.busy}
                    className="text-[9px] font-medium text-amber-500 hover:text-amber-600 px-1 py-0.5 rounded border border-amber-400/40 hover:bg-amber-50 dark:hover:bg-amber-900/20 whitespace-nowrap transition-colors">
                    Reconectar
                  </button>
                ) : (
                  <button onClick={() => gcal.disconnect(email)}
                    className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                    <Unplug size={11} />
                  </button>
                )}
              </div>
              {needsReauth ? (
                <p className="text-[10px] text-amber-500/80 px-1 pb-1 leading-tight">Toca Reconectar una vez (ya no volverá a pedirlo)</p>
              ) : emailSources.map(s => (
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
        <button onClick={gcal.connect} disabled={!gcal.gconfigured || gcal.busy}
          className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 w-full">
          {gcal.busy ? <Loader2 size={15} className="animate-spin text-accent" /> : <Plus size={15} className="text-accent" />}
          {gcal.busy ? 'Conectando…' : 'Agregar cuenta Google'}
          {!gcal.gconfigured && <span className="text-[10px] text-ink-4 ml-auto">(.env)</span>}
        </button>
        {gcal.error && <p className="text-[10px] text-red-500 px-1 leading-tight">{gcal.error}</p>}
        {icloud.error && <p className="text-[10px] text-red-500 px-1 leading-tight">{icloud.error}</p>}
        <IcloudAuthForm hasIcloud={hasIcloud} />
      </div>
    </div>
  )
}
