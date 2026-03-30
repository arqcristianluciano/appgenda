import { useState } from 'react'
import { Plus, Loader2, ChevronDown } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import { loadIcloudEvents, saveIcloudConfig } from '../../services/icloudCalendar'

export default function IcloudForm({ hasIcloud }: { hasIcloud: boolean }) {
  const { addSource, mergeExternalEvents } = useCalendarStore()
  const [show, setShow] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('iCloud')
  const [color, setColor] = useState('#A855F7')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const connect = async () => {
    if (!url.trim() || busy) return
    setBusy(true); setError('')
    try {
      const events = await loadIcloudEvents(url.trim(), color)
      saveIcloudConfig(url.trim(), color, name)
      addSource({ id: 'icloud_main', name, type: 'icloud', color, enabled: true })
      mergeExternalEvents(events, 'icloud')
      setShow(false); setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar')
    } finally { setBusy(false) }
  }

  if (hasIcloud) return null

  return (
    <div>
      <button onClick={() => setShow(f => !f)}
        className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors w-full">
        <Plus size={15} className="text-accent" />
        iCloud Calendar
        <ChevronDown size={12} className={`ml-auto transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>

      {show && (
        <div className="mt-2 space-y-2 px-1">
          <p className="text-[10px] text-ink-3 leading-relaxed">
            En iCloud → Calendario → compartir → copiar enlace (webcal://)
          </p>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Nombre del calendario"
            className="w-full text-[12px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink"
            style={{ borderColor: 'var(--edge)' }} />
          <input value={url} onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder="webcal://p01-caldav.icloud.com/…"
            className="w-full text-[11px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink font-mono"
            style={{ borderColor: 'var(--edge)' }} />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-ink-3">Color:</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0" />
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <button onClick={connect} disabled={!url.trim() || busy}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium bg-accent text-white py-1.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity">
            {busy && <Loader2 size={12} className="animate-spin" />}
            {busy ? 'Cargando…' : 'Conectar'}
          </button>
        </div>
      )}
    </div>
  )
}
