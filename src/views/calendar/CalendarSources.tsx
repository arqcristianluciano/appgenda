import { useState } from 'react'
import { Check, Plus, Unplug } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import {
  isGoogleConfigured, signIn, signOut, fetchCalendars, fetchEvents, toLocalEvento,
} from '../../services/googleCalendar'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarSources() {
  const { sources, toggleSource, addSource, removeSource, setExternalEvents } = useCalendarStore()
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
        id: `google_${primary.id}`, name: primary.summary,
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
    } finally { setBusy(false) }
  }

  const disconnectGoogle = () => {
    signOut()
    sources.filter(s => s.type === 'google').forEach(s => removeSource(s.id))
    setExternalEvents([])
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
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-0.5">
        {!hasGoogle && (
          <button onClick={connectGoogle} disabled={!gconfigured || busy}
            className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 w-full">
            <Plus size={15} className="text-accent" />
            {busy ? 'Conectando…' : 'Google Calendar'}
            {!gconfigured && <span className="text-[10px] text-ink-4 ml-auto">(.env)</span>}
          </button>
        )}
        <button disabled
          className="flex items-center gap-2 text-[12px] font-medium text-ink-4 py-1.5 px-1 rounded-lg w-full cursor-not-allowed">
          <Plus size={15} />
          iCloud Calendar
          <span className="text-[10px] ml-auto">pronto</span>
        </button>
      </div>
    </div>
  )
}
