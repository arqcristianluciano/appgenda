import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import type { CalendarViewMode } from '../../types'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const VIEW_OPTS: { id: CalendarViewMode; label: string }[] = [
  { id: 'month', label: 'Mes' },
  { id: 'week', label: 'Semana' },
  { id: 'day', label: 'Día' },
]

function getMondayOf(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export default function CalendarHeader() {
  const { viewMode, setViewMode, currentDate, goToday, goPrev, goNext, openModal } = useCalendarStore()

  const title = () => {
    const y = currentDate.getFullYear()
    if (viewMode === 'month') return `${MESES[currentDate.getMonth()]} ${y}`
    if (viewMode === 'day') {
      return `${currentDate.getDate()} de ${MESES[currentDate.getMonth()].toLowerCase()} ${y}`
    }
    const mon = getMondayOf(currentDate)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()} – ${sun.getDate()} de ${MESES[mon.getMonth()].toLowerCase()} ${y}`
    }
    return `${mon.getDate()} ${MESES[mon.getMonth()].toLowerCase().slice(0, 3)} – ${sun.getDate()} ${MESES[sun.getMonth()].toLowerCase().slice(0, 3)} ${sun.getFullYear()}`
  }

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <button onClick={goPrev} className="w-8 h-8 rounded-lg border border-edge hover:bg-surface-2 flex items-center justify-center text-ink-2 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button onClick={goNext} className="w-8 h-8 rounded-lg border border-edge hover:bg-surface-2 flex items-center justify-center text-ink-2 transition-colors">
          <ChevronRight size={16} />
        </button>
        <button onClick={goToday} className="h-8 px-3 rounded-lg border border-edge hover:bg-surface-2 text-[12px] font-bold text-ink-2 transition-colors ml-1">
          Hoy
        </button>
        <h2 className="text-lg font-bold text-ink ml-2 hidden sm:block">{title()}</h2>
        <h2 className="text-[15px] font-bold text-ink ml-2 sm:hidden">{title()}</h2>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex bg-surface-2 rounded-lg border border-edge p-0.5">
          {VIEW_OPTS.map(o => (
            <button key={o.id} onClick={() => setViewMode(o.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-all ${
                viewMode === o.id ? 'bg-surface shadow-sm text-ink' : 'text-ink-3 hover:text-ink-2'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={() => openModal()}
          className="h-8 px-4 rounded-xl text-[12px] font-bold bg-accent text-white hover:bg-accent-2 transition-colors">
          + Evento
        </button>
      </div>
    </div>
  )
}
