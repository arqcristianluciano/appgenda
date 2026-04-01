import { useState } from 'react'
import { useCalendarStore } from '../../store/useCalendarStore'
import type { Evento } from '../../types'

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const DIAS_M = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MAX_VISIBLE = 3

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function useIsMobile() {
  const [w] = useState(() => window.innerWidth)
  return w < 1024
}

interface Props { events: Evento[] }

export default function MonthView({ events }: Props) {
  const { currentDate, openModal, setCurrentDate, setViewMode } = useCalendarStore()
  const isMobile = useIsMobile()
  const today = toISO(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const [selectedDay, setSelectedDay] = useState(today)

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { date: Date; iso: string; current: boolean }[] = []
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ date: d, iso: toISO(d), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d)
    cells.push({ date: dt, iso: toISO(dt), current: true })
  }
  const rows = Math.ceil(cells.length / 7)
  while (cells.length < rows * 7) {
    const nd = cells.length - startOffset - daysInMonth + 1
    const d = new Date(year, month + 1, nd)
    cells.push({ date: d, iso: toISO(d), current: false })
  }

  const evMap = new Map<string, Evento[]>()
  events.forEach(e => { const l = evMap.get(e.fecha) || []; l.push(e); evMap.set(e.fecha, l) })

  if (isMobile) return <MobileMonth cells={cells} evMap={evMap} today={today} selectedDay={selectedDay} setSelectedDay={setSelectedDay} openModal={openModal} />

  return (
    <DesktopMonth cells={cells} rows={rows} evMap={evMap} today={today} openModal={openModal} setCurrentDate={setCurrentDate} setViewMode={setViewMode} />
  )
}

/* ── Mobile: compact grid + day agenda ── */
interface MobileProps {
  cells: { date: Date; iso: string; current: boolean }[]
  evMap: Map<string, Evento[]>
  today: string
  selectedDay: string
  setSelectedDay: (d: string) => void
  openModal: (fecha?: string, hora?: string, event?: Evento) => void
}

function MobileMonth({ cells, evMap, today, selectedDay, setSelectedDay, openModal }: MobileProps) {
  const dayEvents = evMap.get(selectedDay) || []
  const selDate = new Date(selectedDay + 'T12:00:00')
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dayLabel = `${selDate.getDate()} de ${MESES[selDate.getMonth()]}`

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 px-1 pt-1">
        {DIAS_M.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-ink-4 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-1 pb-1">
        {cells.map((cell, i) => {
          const hasEvents = (evMap.get(cell.iso) || []).length > 0
          const isToday = cell.iso === today
          const isSelected = cell.iso === selectedDay
          const colors = (evMap.get(cell.iso) || []).slice(0, 3).map(e => e.color || '#2B5E3E')
          return (
            <button key={i} onClick={() => setSelectedDay(cell.iso)}
              className="flex flex-col items-center py-1 rounded-full transition-colors">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-colors
                ${isSelected ? 'bg-accent text-white font-bold'
                  : isToday ? 'border-2 border-accent text-accent font-bold'
                  : cell.current ? 'text-ink-2' : 'text-ink-4/40'}`}>
                {cell.date.getDate()}
              </span>
              <div className="flex gap-[3px] mt-[2px] h-[5px]">
                {hasEvents && colors.map((c, j) => (
                  <span key={j} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto border-t" style={{ borderColor: 'var(--edge)' }}>
        <div className="px-3 py-2 sticky top-0 bg-surface z-10">
          <span className="text-[13px] font-semibold text-ink">{dayLabel}</span>
        </div>
        {dayEvents.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-[13px] text-ink-4">Sin eventos</p>
            <button onClick={() => openModal(selectedDay)} className="text-[13px] text-accent font-medium mt-2">
              + Crear evento
            </button>
          </div>
        )}
        <div className="px-2 pb-3 space-y-1">
          {dayEvents.map(ev => (
            <button key={ev.id} onClick={() => openModal(selectedDay, ev.hora, ev)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left">
              <div className="w-1 self-stretch rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: ev.color || '#2B5E3E' }} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink truncate">{ev.titulo}</div>
                {ev.hora ? (
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    {ev.hora}{ev.horaFin ? ` – ${ev.horaFin}` : ''}
                  </div>
                ) : (
                  <div className="text-[11px] text-ink-4 mt-0.5">Todo el día</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Desktop: full grid with event pills ── */
interface DesktopProps {
  cells: { date: Date; iso: string; current: boolean }[]
  rows: number
  evMap: Map<string, Evento[]>
  today: string
  openModal: (fecha?: string, hora?: string, event?: Evento) => void
  setCurrentDate: (d: Date) => void
  setViewMode: (m: 'day') => void
}

function DesktopMonth({ cells, rows, evMap, today, openModal, setCurrentDate, setViewMode }: DesktopProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--edge)' }}>
        {DIAS.map(d => (
          <div key={d} className="text-center py-2 text-[11px] font-medium text-ink-3 tracking-wide">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {cells.map((cell, i) => {
          const dayEvts = evMap.get(cell.iso) || []
          const isToday = cell.iso === today
          return (
            <div key={i} onClick={() => openModal(cell.iso)}
              className="border-b border-r cursor-pointer transition-colors hover:bg-surface-2/60 overflow-hidden"
              style={{ borderColor: 'var(--edge)' }}>
              <div className="pt-1.5 pl-2 mb-0.5">
                <span className={`inline-flex items-center justify-center w-6 h-6 text-[12px] rounded-full leading-none
                  ${isToday ? 'bg-accent text-white font-bold' : cell.current ? 'text-ink-2 font-medium' : 'text-ink-4'}`}>
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="px-1 pb-1 flex flex-col gap-[2px]">
                {dayEvts.slice(0, MAX_VISIBLE).map(ev => {
                  const c = ev.color || '#2B5E3E'
                  if (ev.allDay) {
                    return (
                      <button key={ev.id}
                        onClick={(e) => { e.stopPropagation(); openModal(cell.iso, ev.hora, ev) }}
                        className="w-full text-left text-[11px] font-medium px-1.5 py-[2px] rounded truncate text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: c }}>
                        {ev.titulo}
                      </button>
                    )
                  }
                  return (
                    <button key={ev.id}
                      onClick={(e) => { e.stopPropagation(); openModal(cell.iso, ev.hora, ev) }}
                      className="w-full text-left text-[11px] px-1.5 py-[2px] rounded truncate hover:bg-surface-3 transition-colors flex items-center gap-1.5"
                      style={{ color: cell.current ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                      {ev.hora && <span className="font-medium" style={{ color: c }}>{ev.hora}</span>}
                      <span className="truncate">{ev.titulo}</span>
                    </button>
                  )
                })}
                {dayEvts.length > MAX_VISIBLE && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentDate(cell.date); setViewMode('day') }}
                    className="text-[11px] font-medium text-accent hover:underline pl-1.5 text-left transition-colors">
                    +{dayEvts.length - MAX_VISIBLE} más
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
