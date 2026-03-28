import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
      return `${MESES[mon.getMonth()]} ${y}`
    }
    return `${MESES[mon.getMonth()].slice(0, 3)} – ${MESES[sun.getMonth()].slice(0, 3)} ${sun.getFullYear()}`
  }

  return (
    <div className="flex items-center justify-between h-14 px-4 lg:px-6 border-b flex-shrink-0" style={{ borderColor: 'var(--edge)' }}>
      <div className="flex items-center gap-2 lg:gap-3">
        <button onClick={() => openModal()}
          className="hidden lg:flex items-center gap-2 h-10 px-5 rounded-2xl bg-surface border shadow-md text-ink text-[14px] font-medium hover:shadow-lg transition-shadow"
          style={{ borderColor: 'var(--edge)' }}>
          <Plus size={20} className="text-accent" />
          <span>Crear</span>
        </button>

        <button onClick={goToday}
          className="h-8 px-4 rounded-lg border text-[13px] font-medium text-ink hover:bg-surface-2 transition-colors ml-0 lg:ml-2"
          style={{ borderColor: 'var(--edge-mid)' }}>
          Hoy
        </button>

        <div className="flex items-center">
          <button onClick={goPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-3 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goNext}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-3 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <h2 className="text-[20px] lg:text-[22px] font-normal text-ink ml-1 whitespace-nowrap">{title()}</h2>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: 'var(--edge-mid)' }}>
          {VIEW_OPTS.map(o => (
            <button key={o.id} onClick={() => setViewMode(o.id)}
              className={`px-3 lg:px-4 py-1.5 text-[13px] font-medium transition-colors border-r last:border-r-0
                ${viewMode === o.id
                  ? 'bg-accent-light text-accent'
                  : 'text-ink-2 hover:bg-surface-2'
                }`}
              style={{ borderColor: 'var(--edge-mid)' }}>
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={() => openModal()}
          className="lg:hidden w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center ml-1 shadow-md hover:shadow-lg transition-shadow">
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
