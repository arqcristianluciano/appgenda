import { useState } from 'react'
import { Plus, Loader2, ChevronDown, Check, ExternalLink } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { useStore } from '../../store/useStore'
import { saveData } from '../../lib/storage'
import { loadIcloudEvents } from '../../services/icloudCalendar'
import {
  discoverPrincipal, discoverCalendars, fetchCalendarEvents,
} from '../../services/icloudCalDAV'
import type { IcloudCalDAVConfig } from '../../types'

const ICLOUD_AUTH_KEY = 'icloud_caldav_auth'

type Mode = 'caldav' | 'webcal'

export default function IcloudAuthForm({ hasIcloud }: { hasIcloud: boolean }) {
  const { addSource, mergeExternalEvents } = useCalendarStore()
  const { updateCalendarConfig } = useStore()
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<Mode>('caldav')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [appleId, setAppleId] = useState('')
  const [password, setPassword] = useState('')
  const [discovered, setDiscovered] = useState<IcloudCalDAVConfig['calendars'] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [webcalUrl, setWebcalUrl] = useState('')
  const [webcalName, setWebcalName] = useState('iCloud')
  const [webcalColor, setWebcalColor] = useState('#A855F7')

  const reset = () => { setDiscovered(null); setSelected(new Set()); setError('') }

  const discover = async () => {
    if (!appleId.trim() || !password.trim() || busy) return
    setBusy(true); setError('')
    try {
      const principal = await discoverPrincipal(appleId.trim(), password.trim())
      const cals = await discoverCalendars(principal, appleId.trim(), password.trim())
      if (!cals.length) throw new Error('No se encontraron calendarios')
      setDiscovered(cals)
      setSelected(new Set(cals.map(c => c.url)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con iCloud')
    } finally { setBusy(false) }
  }

  const connectCalDAV = async () => {
    if (!discovered || busy) return
    const cals = discovered.filter(c => selected.has(c.url))
    if (!cals.length) { setError('Selecciona al menos un calendario'); return }
    setBusy(true); setError('')
    try {
      const allEvents = []
      for (const cal of cals) {
        const sourceId = `icloud_${encodeURIComponent(cal.url)}`
        addSource({ id: sourceId, name: cal.name, type: 'icloud', color: cal.color, enabled: true })
        const evts = await fetchCalendarEvents(cal, appleId.trim(), password.trim())
        allEvents.push(...evts)
      }
      const authConfig = { appleId: appleId.trim(), password: password.trim(), calendars: cals }
      updateCalendarConfig({ icloudAuth: authConfig, icloudWebcal: null })
      localStorage.setItem(ICLOUD_AUTH_KEY, JSON.stringify(authConfig))
      await saveData(useStore.getState().data)
      mergeExternalEvents(allEvents, 'icloud')
      setShow(false); reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar eventos')
    } finally { setBusy(false) }
  }

  const connectWebcal = async () => {
    if (!webcalUrl.trim() || busy) return
    setBusy(true); setError('')
    try {
      const events = await loadIcloudEvents(webcalUrl.trim(), webcalColor)
      const webcalConfig = { url: webcalUrl.trim(), color: webcalColor, name: webcalName }
      updateCalendarConfig({ icloudWebcal: webcalConfig, icloudAuth: null })
      localStorage.setItem('icloud_cal_url', webcalConfig.url)
      localStorage.setItem('icloud_cal_color', webcalConfig.color)
      localStorage.setItem('icloud_cal_name', webcalConfig.name)
      await saveData(useStore.getState().data)
      addSource({ id: 'icloud_main', name: webcalName, type: 'icloud', color: webcalColor, enabled: true })
      mergeExternalEvents(events, 'icloud')
      setShow(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar')
    } finally { setBusy(false) }
  }

  const toggleCal = (url: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(url) ? s.delete(url) : s.add(url); return s })

  if (hasIcloud) return null

  return (
    <div>
      <button onClick={() => { setShow(f => !f); reset() }}
        className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors w-full">
        <Plus size={15} className="text-accent" />
        iCloud Calendar
        <ChevronDown size={12} className={`ml-auto transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>

      {show && (
        <div className="mt-2 space-y-2 px-1">
          <div className="flex gap-1 bg-surface-2 rounded-md p-0.5">
            {(['caldav', 'webcal'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); reset() }}
                className={`flex-1 text-[11px] py-1 rounded transition-colors ${mode === m ? 'bg-surface text-ink font-medium shadow-sm' : 'text-ink-3'}`}>
                {m === 'caldav' ? 'Apple ID' : 'URL webcal'}
              </button>
            ))}
          </div>

          {mode === 'caldav' && !discovered && (
            <>
              <p className="text-[10px] text-ink-3 leading-relaxed">
                Usa una{' '}
                <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noreferrer"
                  className="text-accent inline-flex items-center gap-0.5 hover:underline">
                  contraseña de app <ExternalLink size={9} />
                </a>
                {' '}(no tu contraseña de Apple ID)
              </p>
              <input value={appleId} onChange={e => setAppleId(e.target.value)}
                placeholder="tu@icloud.com"
                className="w-full text-[12px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink"
                style={{ borderColor: 'var(--edge)' }} />
              <input value={password} onChange={e => setPassword(e.target.value)}
                type="password" placeholder="xxxx-xxxx-xxxx-xxxx"
                className="w-full text-[12px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink font-mono"
                style={{ borderColor: 'var(--edge)' }} />
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <button onClick={discover} disabled={!appleId.trim() || !password.trim() || busy}
                className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium bg-accent text-white py-1.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity">
                {busy && <Loader2 size={12} className="animate-spin" />}
                {busy ? 'Buscando calendarios…' : 'Descubrir calendarios'}
              </button>
            </>
          )}

          {mode === 'caldav' && discovered && (
            <>
              <p className="text-[11px] text-ink-2 font-medium">Selecciona los calendarios:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {discovered.map(cal => (
                  <button key={cal.url} onClick={() => toggleCal(cal.url)}
                    className="flex items-center gap-2 w-full py-1 px-1 rounded hover:bg-surface-2 transition-colors">
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ backgroundColor: selected.has(cal.url) ? cal.color : 'transparent', border: `2px solid ${cal.color}` }}>
                      {selected.has(cal.url) && <Check size={9} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-[12px] text-ink-2 truncate flex-1 text-left">{cal.name}</span>
                  </button>
                ))}
              </div>
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setDiscovered(null); setError('') }}
                  className="flex-1 text-[12px] text-ink-3 py-1.5 rounded-md border hover:bg-surface-2 transition-colors"
                  style={{ borderColor: 'var(--edge)' }}>
                  Atrás
                </button>
                <button onClick={connectCalDAV} disabled={!selected.size || busy}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium bg-accent text-white py-1.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity">
                  {busy && <Loader2 size={12} className="animate-spin" />}
                  {busy ? 'Cargando…' : 'Conectar'}
                </button>
              </div>
            </>
          )}

          {mode === 'webcal' && (
            <>
              <p className="text-[10px] text-ink-3 leading-relaxed">
                En iCloud → Calendario → compartir → copiar enlace (webcal://)
              </p>
              <input value={webcalName} onChange={e => setWebcalName(e.target.value)}
                placeholder="Nombre del calendario"
                className="w-full text-[12px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink"
                style={{ borderColor: 'var(--edge)' }} />
              <input value={webcalUrl} onChange={e => { setWebcalUrl(e.target.value); setError('') }}
                placeholder="webcal://p01-caldav.icloud.com/…"
                className="w-full text-[11px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink font-mono"
                style={{ borderColor: 'var(--edge)' }} />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-ink-3">Color:</label>
                <input type="color" value={webcalColor} onChange={e => setWebcalColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0" />
              </div>
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <button onClick={connectWebcal} disabled={!webcalUrl.trim() || busy}
                className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium bg-accent text-white py-1.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity">
                {busy && <Loader2 size={12} className="animate-spin" />}
                {busy ? 'Cargando…' : 'Conectar'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
