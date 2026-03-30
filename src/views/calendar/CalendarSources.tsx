import { useState } from 'react'
import { Check, Plus, Unplug, Loader2, ChevronDown } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import {
  isGoogleConfigured, signIn, signOut, fetchCalendars, fetchEvents, toLocalEvento,
} from '../../services/googleCalendar'
import {
  loadIcloudEvents, saveIcloudConfig, clearIcloudConfig,
  getStoredIcloudUrl, getStoredIcloudColor,
} from '../../services/icloudCalendar'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarSources() {
  const { sources, toggleSource, addSource, removeSource, mergeExternalEvents, clearExternalEvents } = useCalendarStore()
  const [googleBusy, setGoogleBusy] = useState(false)
  const [icloudBusy, setIcloudBusy] = useState(false)
  const [showIcloudForm, setShowIcloudForm] = useState(false)
  const [icloudUrl, setIcloudUrl] = useState('')
  const [icloudName, setIcloudName] = useState('iCloud')
  const [icloudColor, setIcloudColor] = useState('#A855F7')
  const [icloudError, setIcloudError] = useState('')

  const hasGoogle = sources.some(s => s.type === 'google')
  const hasIcloud = sources.some(s => s.type === 'icloud')
  const gconfigured = isGoogleConfigured()

  const connectGoogle = async () => {
    if (!gconfigured || googleBusy) return
    setGoogleBusy(true)
    try {
      await signIn()
      const cals = await fetchCalendars()
      const primary = cals.find(c => c.primary) || cals[0]
      if (!primary) return
      addSource({
        id: `google_${primary.id}`, name: primary.summary,
        type: 'google', color: primary.backgroundColor || '#4285F4', enabled: true,
      })
      const now = new Date()
      const end = new Date(now); end.setMonth(end.getMonth() + 6)
      const evts = await fetchEvents(
        primary.id, toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)), toISO(end),
      )
      mergeExternalEvents(evts.map(e => toLocalEvento(e, primary.backgroundColor || '#4285F4')), 'google')
    } catch (err) {
      console.error('Google Calendar:', err)
    } finally { setGoogleBusy(false) }
  }

  const disconnectGoogle = () => {
    signOut()
    sources.filter(s => s.type === 'google').forEach(s => removeSource(s.id))
    clearExternalEvents('google')
  }

  const connectIcloud = async () => {
    if (!icloudUrl.trim() || icloudBusy) return
    setIcloudBusy(true)
    setIcloudError('')
    try {
      const events = await loadIcloudEvents(icloudUrl.trim(), icloudColor)
      saveIcloudConfig(icloudUrl.trim(), icloudColor, icloudName)
      addSource({ id: 'icloud_main', name: icloudName, type: 'icloud', color: icloudColor, enabled: true })
      mergeExternalEvents(events, 'icloud')
      setShowIcloudForm(false)
      setIcloudUrl('')
    } catch (err) {
      setIcloudError(err instanceof Error ? err.message : 'Error al conectar')
    } finally { setIcloudBusy(false) }
  }

  const disconnectIcloud = () => {
    clearIcloudConfig()
    sources.filter(s => s.type === 'icloud').forEach(s => removeSource(s.id))
    clearExternalEvents('icloud')
  }

  const refreshIcloud = async () => {
    const url = getStoredIcloudUrl()
    const color = getStoredIcloudColor()
    if (!url || icloudBusy) return
    setIcloudBusy(true)
    try {
      const events = await loadIcloudEvents(url, color)
      mergeExternalEvents(events, 'icloud')
    } catch (err) {
      console.error('iCloud refresh:', err)
    } finally { setIcloudBusy(false) }
  }

  return (
    <div className="mt-6">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2 px-1">
        Mis calendarios
      </div>
      <div className="space-y-1">
        {sources.map(s => (
          <div key={s.id} className="flex items-center gap-2.5 group py-1 px-1 rounded-lg hover:bg-surface-2 transition-colors">
            <button onClick={() => toggleSource(s.id)}
              className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: s.enabled ? s.color : 'transparent', border: `2px solid ${s.color}` }}>
              {s.enabled && <Check size={11} className="text-white" strokeWidth={3} />}
            </button>
            <span className="text-[13px] text-ink-2 flex-1 truncate">{s.name}</span>
            {s.type === 'google' && (
              <button onClick={disconnectGoogle}
                className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-500 transition-all p-0.5">
                <Unplug size={12} />
              </button>
            )}
            {s.type === 'icloud' && (
              <button onClick={icloudBusy ? undefined : refreshIcloud}
                className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-accent transition-all p-0.5 mr-0.5"
                title="Actualizar">
                {icloudBusy ? <Loader2 size={12} className="animate-spin" /> : '↻'}
              </button>
            )}
            {s.type === 'icloud' && (
              <button onClick={disconnectIcloud}
                className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-500 transition-all p-0.5">
                <Unplug size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-0.5">
        {!hasGoogle && (
          <button onClick={connectGoogle} disabled={!gconfigured || googleBusy}
            className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 w-full">
            {googleBusy ? <Loader2 size={15} className="animate-spin text-accent" /> : <Plus size={15} className="text-accent" />}
            {googleBusy ? 'Conectando…' : 'Google Calendar'}
            {!gconfigured && <span className="text-[10px] text-ink-4 ml-auto">(.env)</span>}
          </button>
        )}

        {!hasIcloud && (
          <button onClick={() => setShowIcloudForm(f => !f)}
            className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors w-full">
            <Plus size={15} className="text-accent" />
            iCloud Calendar
            <ChevronDown size={12} className={`ml-auto transition-transform ${showIcloudForm ? 'rotate-180' : ''}`} />
          </button>
        )}

        {showIcloudForm && !hasIcloud && (
          <div className="mt-2 space-y-2 px-1">
            <p className="text-[10px] text-ink-3 leading-relaxed">
              En iCloud → Calendario → compartir → copiar enlace (webcal://)
            </p>
            <input
              value={icloudName}
              onChange={e => setIcloudName(e.target.value)}
              placeholder="Nombre del calendario"
              className="w-full text-[12px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink"
              style={{ borderColor: 'var(--edge)' }}
            />
            <input
              value={icloudUrl}
              onChange={e => { setIcloudUrl(e.target.value); setIcloudError('') }}
              placeholder="webcal://p01-caldav.icloud.com/…"
              className="w-full text-[11px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink font-mono"
              style={{ borderColor: 'var(--edge)' }}
            />
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-ink-3">Color:</label>
              <input type="color" value={icloudColor} onChange={e => setIcloudColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0" />
            </div>
            {icloudError && <p className="text-[11px] text-red-500">{icloudError}</p>}
            <button onClick={connectIcloud} disabled={!icloudUrl.trim() || icloudBusy}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium bg-accent text-white py-1.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity">
              {icloudBusy && <Loader2 size={12} className="animate-spin" />}
              {icloudBusy ? 'Cargando…' : 'Conectar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
