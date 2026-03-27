import { useRef, useEffect } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import type { Evento } from '../../types'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5)
const H_PX = 52
const DIAS_S = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MESES_S = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getMondayOf(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); r.setHours(0, 0, 0, 0); return r
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function timeToMin(t: string) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }

interface Props { events: Evento[] }

export default function WeekView({ events }: Props) {
  const { currentDate, viewMode, openModal } = useCalendarStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = toISO(new Date())
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  const monday = getMondayOf(currentDate)
  const dayCount = viewMode === 'day' ? 1 : 7
  const days = Array.from({ length: dayCount }, (_, i) => {
    if (viewMode === 'day') return new Date(currentDate)
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  useEffect(() => {
    if (!scrollRef.current) return
    const scrollTo = Math.max(0, ((8 - HOURS[0]) * H_PX) - 40)
    scrollRef.current.scrollTop = scrollTo
  }, [viewMode])

  const evStyle = (ev: Evento) => {
    const s = timeToMin(ev.hora || '08:00')
    const e = timeToMin(ev.horaFin || '') || s + 60
    return {
      top: `${((s - HOURS[0] * 60) / 60) * H_PX}px`,
      height: `${Math.max(((e - s) / 60) * H_PX, H_PX * 0.4)}px`,
    }
  }

  const allDay = events.filter(e => e.allDay)
  const timed = events.filter(e => !e.allDay)

  return (
    <div className="h-full flex flex-col bg-surface rounded-xl border border-edge overflow-hidden">
      <div className="grid border-b border-edge flex-shrink-0"
        style={{ gridTemplateColumns: `52px repeat(${dayCount}, 1fr)` }}>
        <div className="border-r border-edge" />
        {days.map((d, i) => {
          const iso = toISO(d)
          const isToday = iso === today
          return (
            <div key={i} className="text-center py-2 border-r border-edge last:border-r-0">
              <div className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-ink-3'}`}>
                {DIAS_S[d.getDay() === 0 ? 6 : d.getDay() - 1]}
              </div>
              <div className={`text-lg font-serif leading-tight mt-0.5
                ${isToday ? 'w-8 h-8 rounded-full bg-accent text-white inline-flex items-center justify-center' : 'text-ink'}`}>
                {d.getDate()}
              </div>
              <div className={`text-[9px] mt-0.5 ${isToday ? 'text-accent' : 'text-ink-4'}`}>
                {MESES_S[d.getMonth()]}
              </div>
              {allDay.filter(e => e.fecha === iso).map(e => (
                <button key={e.id} onClick={() => openModal(iso, '', e)}
                  className="block w-[90%] mx-auto mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
                  style={{ backgroundColor: (e.color || '#2B5E3E') + '25', color: e.color || '#2B5E3E' }}>
                  {e.titulo}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `52px repeat(${dayCount}, 1fr)` }}>
          <div className="border-r border-edge">
            {HOURS.map(h => (
              <div key={h} style={{ height: H_PX }}
                className="flex items-start justify-end pr-2 text-[10px] text-ink-3 font-medium -translate-y-[7px]">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((d, i) => {
            const iso = toISO(d)
            const isToday = iso === today
            const dayEvents = timed.filter(e => e.fecha === iso && e.hora)
            return (
              <div key={i} className={`relative border-r border-edge last:border-r-0 ${isToday ? 'bg-accent/[0.03]' : ''}`}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: H_PX }}
                    onClick={() => openModal(iso, `${String(h).padStart(2, '0')}:00`)}
                    className="border-b border-edge hover:bg-accent/[0.05] cursor-pointer transition-colors" />
                ))}
                {isToday && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: `${((nowMin - HOURS[0] * 60) / 60) * H_PX}px` }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shadow" />
                      <div className="flex-1 h-[2px] bg-red-500 shadow" />
                    </div>
                  </div>
                )}
                {dayEvents.map(ev => (
                  <button key={ev.id}
                    onClick={(e) => { e.stopPropagation(); openModal(iso, ev.hora, ev) }}
                    className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-left overflow-hidden z-20 hover:brightness-95 transition-all shadow-sm"
                    style={{
                      ...evStyle(ev),
                      backgroundColor: (ev.color || '#2B5E3E') + '18',
                      borderLeft: `3px solid ${ev.color || '#2B5E3E'}`,
                      color: ev.color || '#2B5E3E',
                    }}>
                    <div className="text-[11px] font-bold truncate">{ev.titulo}</div>
                    <div className="text-[10px] opacity-60">{ev.hora}{ev.horaFin ? ` – ${ev.horaFin}` : ''}</div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
