import { useEffect, useState } from 'react'
import { Check, Plus, Unplug, Loader2, RefreshCw, RefreshCcw, ExternalLink } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import { getAccountEmails } from '../../services/googleCalendar'
import IcloudAuthForm from './IcloudAuthForm'
import GoogleOAuthConfigForm from './GoogleOAuthConfigForm'
import { useGoogleCalendar } from './useGoogleCalendar'
import { useIcloudCalendar } from './useIcloudCalendar'

export default function CalendarSources() {
  const { sources, toggleSource } = useCalendarStore()
  const configEmails = useStore(s => s.data.calendarConfig?.googleEmails) ?? []

  const gcal = useGoogleCalendar()
  const icloud = useIcloudCalendar()

  useEffect(() => {
    const init = async () => {
      const cloudEmails = useStore.getState().data.calendarConfig?.googleEmails ?? []
      const allEmails = [...new Set([...getAccountEmails(), ...cloudEmails])]
      for (const email of allEmails) await gcal.tryLoad(email)
      // Carga silenciosa de iCloud: usa cache si la última sync es fresca y nunca muestra reauth UI en background.
      icloud.loadSilent().catch(() => {})
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
          <div key={s.id}>
            <div className="flex items-center gap-2.5 group py-1 px-1 rounded-lg hover:bg-surface-2 transition-colors">
              <button onClick={() => toggleSource(s.id)}
                className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ backgroundColor: s.enabled ? s.color : 'transparent', border: `2px solid ${s.color}` }}>
                {s.enabled && <Check size={11} className="text-white" strokeWidth={3} />}
              </button>
              <span className="text-[13px] text-ink-2 flex-1 truncate">{s.name}</span>
              {s.type === 'icloud' && (
                <div className="lg:opacity-0 lg:group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                  {icloud.needsReauth ? (
                    <span className="text-[10px] text-red-500 font-medium mr-1">Auth expirada</span>
                  ) : (
                    <button onClick={icloud.refresh} disabled={icloud.busy}
                      className="text-ink-4 hover:text-accent transition-colors p-0.5" title="Actualizar">
                      {icloud.busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    </button>
                  )}
                  <button onClick={icloud.disconnect}
                    className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                    <Unplug size={12} />
                  </button>
                </div>
              )}
            </div>
            {s.type === 'icloud' && icloud.needsReauth && (
              <IcloudReauthForm onReconnect={icloud.reconnect} busy={icloud.busy} error={icloud.error} />
            )}
          </div>
        ))}

        {configEmails.map(email => {
          const emailSources = googleSources.filter(s => s.accountEmail === email)
          const configErr = gcal.configError.get(email)?.message
          const needsReauth = gcal.needsAuth.has(email)
          return (
            <div key={email}>
              <div className="flex items-center gap-1 px-1 pt-2 pb-0.5">
                <span className="text-[10px] truncate flex-1 text-ink-4" title={email}>{email}</span>
                {configErr ? (
                  <>
                    <span className="text-[10px] text-red-500 font-medium mr-1"
                      title={`${configErr} — reconectar no soluciona esto; hay que revisar las credenciales OAuth en Google Cloud. Usá Reintentar si ya se restauró.`}>
                      No disponible
                    </span>
                    <button onClick={() => gcal.retry(email)} disabled={gcal.busy}
                      className="text-ink-4 hover:text-accent transition-colors p-0.5" title="Reintentar">
                      {gcal.busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
                    </button>
                    <button onClick={() => gcal.disconnect(email)}
                      className="text-ink-4 hover:text-red-500 transition-colors p-0.5" title="Desconectar">
                      <Unplug size={11} />
                    </button>
                  </>
                ) : needsReauth ? (
                  <>
                    <span className="text-[10px] text-red-500 font-medium mr-1">Sesión expirada</span>
                    <button onClick={() => gcal.reconnect(email)} disabled={gcal.busy}
                      className="text-ink-4 hover:text-accent transition-colors p-0.5" title="Reconectar Google">
                      {gcal.busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
                    </button>
                  </>
                ) : (
                  <button onClick={() => gcal.disconnect(email)}
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
            </div>
          )
        })}
      </div>

      <div className="mt-3 space-y-0.5">
        {gcal.gconfigured && (
          <button onClick={gcal.connect} disabled={gcal.busy}
            className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 w-full">
            {gcal.busy ? <Loader2 size={15} className="animate-spin text-accent" /> : <Plus size={15} className="text-accent" />}
            {gcal.busy ? 'Conectando…' : 'Agregar cuenta Google'}
          </button>
        )}
        {gcal.error && <p className="text-[10px] text-red-500 px-1 leading-tight">{gcal.error}</p>}
        {icloud.error && !icloud.needsReauth && <p className="text-[10px] text-red-500 px-1 leading-tight">{icloud.error}</p>}
        {(!gcal.gconfigured || gcal.configError.size > 0) && (
          <GoogleOAuthConfigForm configured={gcal.gconfigured} onSave={gcal.saveConfig} />
        )}
        <IcloudAuthForm hasIcloud={hasIcloud} />
      </div>
    </div>
  )
}

function IcloudReauthForm({ onReconnect, busy, error }: {
  onReconnect: (pw: string) => Promise<void>; busy: boolean; error: string
}) {
  const [pw, setPw] = useState('')
  const appleId = useStore.getState().data.calendarConfig?.icloudAuth?.appleId ?? ''

  return (
    <div className="ml-6 mt-1 mb-2 p-2 bg-surface-2 border border-edge rounded-lg space-y-1.5">
      <p className="text-[10px] text-ink-3">
        Genera una nueva{' '}
        <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noreferrer"
          className="text-accent inline-flex items-center gap-0.5 hover:underline">
          contraseña de app <ExternalLink size={8} />
        </a>
      </p>
      {appleId && <p className="text-[10px] text-ink-4 font-mono">{appleId}</p>}
      <input value={pw} onChange={e => setPw(e.target.value)}
        type="password" placeholder="xxxx-xxxx-xxxx-xxxx"
        className="w-full text-[11px] bg-surface border border-edge rounded px-2 py-1 outline-none focus:border-accent text-ink font-mono"
        onKeyDown={e => e.key === 'Enter' && pw.trim() && onReconnect(pw.trim())} />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
      <button onClick={() => pw.trim() && onReconnect(pw.trim())} disabled={!pw.trim() || busy}
        className="w-full flex items-center justify-center gap-1 text-[11px] font-medium bg-accent text-white py-1 rounded disabled:opacity-40 hover:opacity-90 transition-opacity">
        {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
        {busy ? 'Reconectando…' : 'Reconectar'}
      </button>
    </div>
  )
}
