import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, Plus, Unplug } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import {
  isGoogleConfigured, signIn, signOut, fetchCalendars, fetchEvents, toLocalEvento,
} from '../../services/googleCalendar'

export default function CalendarSources() {
  const { sources, toggleSource, addSource, removeSource, setExternalEvents } = useCalendarStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const hasGoogle = sources.some(s => s.type === 'google')
  const gconfigured = isGoogleConfigured()

  const connectGoogle = async () => {
    if (!gconfigured || busy) return
    setBusy(true)
    try {
      await signIn()
      const cals = await fetchCalendars()
      const primary = cals.find(c => c.primary) || cals[0]
      if (!primary) return
      addSource({
        id: `google_${primary.id}`, name: `Google: ${primary.summary}`,
        type: 'google', color: primary.backgroundColor || '#4285F4', enabled: true,
      })
      const now = new Date()
      const end = new Date(now); end.setMonth(end.getMonth() + 6)
      const evts = await fetchEvents(
        primary.id, toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)), toISO(end),
      )
      setExternalEvents(evts.map(e => toLocalEvento(e, primary.backgroundColor || '#4285F4')))
    } catch (err) {
      console.error('Google Calendar:', err)
    } finally {
      setBusy(false)
    }
  }

  const disconnectGoogle = () => {
    signOut()
    sources.filter(s => s.type === 'google').forEach(s => removeSource(s.id))
    setExternalEvents([])
  }

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-3 hover:text-ink-2 transition-colors">
        Calendarios {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-2 bg-surface border border-edge rounded-xl p-3 space-y-2">
          {sources.map(s => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
              <button onClick={() => toggleSource(s.id)}
                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ borderColor: s.color, backgroundColor: s.enabled ? s.color : 'transparent' }}>
                {s.enabled && <Check size={10} className="text-white" />}
              </button>
              <span className="text-[12px] font-medium text-ink-2 flex-1 truncate">{s.name}</span>
              {s.type === 'google' && (
                <button onClick={disconnectGoogle}
                  className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-red-500 transition-all">
                  <Unplug size={12} />
                </button>
              )}
            </label>
          ))}

          <div className="border-t border-edge pt-2 flex flex-col gap-1">
            {!hasGoogle && (
              <button onClick={connectGoogle} disabled={!gconfigured || busy}
                className="flex items-center gap-2 text-[12px] font-medium text-ink-2 hover:text-ink py-1.5 px-2 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40">
                <Plus size={14} />
                {busy ? 'Conectando…' : 'Conectar Google Calendar'}
                {!gconfigured && <span className="text-[10px] text-ink-4 ml-auto">(config .env)</span>}
              </button>
            )}
            <button disabled
              className="flex items-center gap-2 text-[12px] font-medium text-ink-4 py-1.5 px-2 rounded-lg cursor-not-allowed">
              <Plus size={14} />
              Conectar iCloud Calendar
              <span className="text-[10px] ml-auto">(próximamente)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
