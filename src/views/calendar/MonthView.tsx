import { useCalendarStore } from '../../store/useCalendarStore'
import type { Evento } from '../../types'

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MAX_VISIBLE = 3

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props { events: Evento[] }

export default function MonthView({ events }: Props) {
  const { currentDate, openModal, setCurrentDate, setViewMode } = useCalendarStore()
  const today = toISO(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

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

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--edge)' }}>
        {DIAS.map(d => (
          <div key={d} className="text-center py-2 text-[11px] font-medium text-ink-3 tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {cells.map((cell, i) => {
          const dayEvts = evMap.get(cell.iso) || []
          const isToday = cell.iso === today
          return (
            <div key={i}
              onClick={() => openModal(cell.iso)}
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
