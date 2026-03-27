import { useCalendarStore } from '../../store/useCalendarStore'
import type { Evento } from '../../types'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
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

  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { date: Date; iso: string; current: boolean }[] = []
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ date: d, iso: toISO(d), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    cells.push({ date, iso: toISO(date), current: true })
  }
  const totalRows = Math.ceil(cells.length / 7)
  while (cells.length < totalRows * 7) {
    const nd = cells.length - startOffset - daysInMonth + 1
    const d = new Date(year, month + 1, nd)
    cells.push({ date: d, iso: toISO(d), current: false })
  }

  const evMap = new Map<string, Evento[]>()
  events.forEach(e => {
    const list = evMap.get(e.fecha) || []
    list.push(e)
    evMap.set(e.fecha, list)
  })

  return (
    <div className="h-full flex flex-col bg-surface rounded-xl border border-edge overflow-hidden">
      <div className="grid grid-cols-7 border-b border-edge">
        {DIAS.map(d => (
          <div key={d} className="text-center py-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">
            {d}
          </div>
        ))}
      </div>
      <div className={`flex-1 grid grid-cols-7`} style={{ gridTemplateRows: `repeat(${totalRows}, 1fr)` }}>
        {cells.map((cell, i) => {
          const dayEvts = evMap.get(cell.iso) || []
          const isToday = cell.iso === today
          return (
            <div key={i}
              onClick={() => openModal(cell.iso)}
              className={`border-b border-r border-edge p-1 cursor-pointer transition-colors min-h-[72px] lg:min-h-0 overflow-hidden
                hover:bg-accent/[0.04]
                ${!cell.current ? 'bg-surface-2/40' : ''}
                ${isToday ? 'bg-accent/[0.06]' : ''}`}>
              <div className="text-right mb-0.5">
                <span className={`inline-flex items-center justify-center w-6 h-6 text-[12px] rounded-full font-medium
                  ${isToday ? 'bg-accent text-white font-bold' : cell.current ? 'text-ink' : 'text-ink-4'}`}>
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-px">
                {dayEvts.slice(0, MAX_VISIBLE).map(ev => (
                  <button key={ev.id}
                    onClick={(e) => { e.stopPropagation(); openModal(cell.iso, ev.hora, ev) }}
                    className="w-full text-left text-[10px] font-medium px-1.5 py-[3px] rounded truncate transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: (ev.color || '#2B5E3E') + '22',
                      color: ev.color || '#2B5E3E',
                      borderLeft: `2px solid ${ev.color || '#2B5E3E'}`,
                    }}>
                    {ev.hora && <span className="opacity-60 mr-0.5">{ev.hora}</span>}
                    {ev.titulo}
                  </button>
                ))}
                {dayEvts.length > MAX_VISIBLE && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentDate(cell.date); setViewMode('day') }}
                    className="text-[10px] font-bold text-ink-3 hover:text-accent pl-1.5 transition-colors">
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
