import { useState, useRef, useEffect } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import type { Evento } from '../../types'

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5)
const H_PX = 48
const H_PX_M = 44
const DIAS_S = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

function getMondayOf(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); r.setHours(0, 0, 0, 0); return r
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function timeToMin(t: string) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }

function useIsMobile() {
  const [w] = useState(() => window.innerWidth)
  return w < 1024
}

interface Props { events: Evento[] }

export default function WeekView({ events }: Props) {
  const { currentDate, viewMode, openModal } = useCalendarStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const today = toISO(new Date())
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const hPx = isMobile ? H_PX_M : H_PX
  const timeCol = isMobile ? '40px' : '56px'

  const monday = getMondayOf(currentDate)
  const mobileDay = isMobile && viewMode === 'week'
  const dayCount = (viewMode === 'day' || mobileDay) ? 1 : 7
  const days = Array.from({ length: dayCount }, (_, i) => {
    if (viewMode === 'day' || mobileDay) return new Date(currentDate)
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = Math.max(0, (8 - HOURS[0]) * hPx - 20)
  }, [viewMode, hPx])

  const evStyle = (ev: Evento) => {
    const s = timeToMin(ev.hora || '08:00'), e = timeToMin(ev.horaFin || '') || s + 60
    return { top: `${((s - HOURS[0] * 60) / 60) * hPx}px`, height: `${Math.max(((e - s) / 60) * hPx, 22)}px` }
  }

  const allDayEvts = events.filter(e => e.allDay)
  const timedEvts = events.filter(e => !e.allDay)

  return (
    <div className="h-full flex flex-col">
      <div className="grid flex-shrink-0 border-b" style={{ gridTemplateColumns: `${timeCol} repeat(${dayCount}, 1fr)`, borderColor: 'var(--edge)' }}>
        <div />
        {days.map((d, i) => {
          const iso = toISO(d)
          const isToday = iso === today
          return (
            <div key={i} className="text-center py-1.5 lg:py-2 flex flex-col items-center">
              <div className={`text-[10px] lg:text-[11px] font-medium tracking-wide ${isToday ? 'text-accent' : 'text-ink-3'}`}>
                {DIAS_S[d.getDay() === 0 ? 6 : d.getDay() - 1]}
              </div>
              <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-[20px] lg:text-[22px] font-light mt-0.5
                ${isToday ? 'bg-accent text-white' : 'text-ink hover:bg-surface-3 cursor-pointer transition-colors'}`}
                onClick={() => { useCalendarStore.getState().setCurrentDate(d); useCalendarStore.getState().setViewMode('day') }}>
                {d.getDate()}
              </div>
              {allDayEvts.filter(e => e.fecha === iso).map(e => (
                <button key={e.id} onClick={() => openModal(iso, '', e)}
                  className="w-[92%] mt-1 text-[10px] lg:text-[11px] font-medium px-1.5 py-[2px] rounded text-white truncate hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: e.color || '#2B5E3E' }}>
                  {e.titulo}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto cal-scroll">
        <div className="relative grid" style={{ gridTemplateColumns: `${timeCol} repeat(${dayCount}, 1fr)` }}>
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height: hPx }} className="relative">
                <span className="absolute -top-[7px] right-1 lg:right-2 text-[9px] lg:text-[10px] text-ink-3 font-medium">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {days.map((d, i) => {
            const iso = toISO(d)
            const isToday = iso === today
            const dayEvents = timedEvts.filter(e => e.fecha === iso && e.hora)
            return (
              <div key={i} className={`relative border-l ${isToday ? 'bg-accent/[0.02]' : ''}`}
                style={{ borderColor: 'var(--edge)' }}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: hPx, borderColor: 'var(--edge)' }}
                    onClick={() => openModal(iso, `${String(h).padStart(2, '0')}:00`)}
                    className="border-b cursor-pointer hover:bg-surface-2/50 transition-colors relative">
                    <div className="absolute left-0 right-0 top-1/2 border-b border-dashed" style={{ borderColor: 'var(--edge)' }} />
                  </div>
                ))}

                {isToday && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${((nowMin - HOURS[0] * 60) / 60) * hPx}px` }}>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 -ml-[6px] border-2 border-white dark:border-[var(--surface)]" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}

                {dayEvents.map(ev => (
                  <button key={ev.id}
                    onClick={(e) => { e.stopPropagation(); openModal(iso, ev.hora, ev) }}
                    className="absolute left-0.5 right-0.5 lg:left-1 lg:right-1 rounded-lg px-1.5 lg:px-2 py-1 text-left overflow-hidden z-10 text-white hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                    style={{ ...evStyle(ev), backgroundColor: ev.color || '#2B5E3E' }}>
                    <div className="text-[10px] lg:text-[11px] font-semibold truncate">{ev.titulo}</div>
                    <div className="text-[9px] lg:text-[10px] opacity-80">{ev.hora}{ev.horaFin ? ` – ${ev.horaFin}` : ''}</div>
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
