import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'
import type { CalendarViewMode } from '../../types'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const VIEW_OPTS: { id: CalendarViewMode; label: string }[] = [
  { id: 'month', label: 'Mes' },
  { id: 'week', label: 'Sem' },
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
      return `${currentDate.getDate()} ${MESES[currentDate.getMonth()].toLowerCase().slice(0, 3)} ${y}`
    }
    const mon = getMondayOf(currentDate)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    if (mon.getMonth() === sun.getMonth()) return `${MESES[mon.getMonth()]} ${y}`
    return `${MESES[mon.getMonth()].slice(0, 3)} – ${MESES[sun.getMonth()].slice(0, 3)} ${sun.getFullYear()}`
  }

  return (
    <div className="flex items-center justify-between h-12 lg:h-14 px-2 lg:px-6 border-b flex-shrink-0" style={{ borderColor: 'var(--edge)' }}>
      <div className="flex items-center gap-1 lg:gap-3 min-w-0">
        <button onClick={() => openModal()}
          className="hidden lg:flex items-center gap-2 h-10 px-5 rounded-2xl bg-surface border shadow-md text-ink text-[14px] font-medium hover:shadow-lg transition-shadow"
          style={{ borderColor: 'var(--edge)' }}>
          <Plus size={20} className="text-accent" />
          <span>Crear</span>
        </button>

        <button onClick={goToday}
          className="h-7 lg:h-8 px-2.5 lg:px-4 rounded-lg border text-[12px] lg:text-[13px] font-medium text-ink hover:bg-surface-2 transition-colors"
          style={{ borderColor: 'var(--edge-mid)' }}>
          Hoy
        </button>

        <div className="flex items-center">
          <button onClick={goPrev}
            className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-3 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goNext}
            className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-3 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <h2 className="text-[15px] lg:text-[22px] font-normal text-ink truncate">{title()}</h2>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: 'var(--edge-mid)' }}>
          {VIEW_OPTS.map(o => (
            <button key={o.id} onClick={() => setViewMode(o.id)}
              className={`px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-[13px] font-medium transition-colors border-r last:border-r-0
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
          className="lg:hidden w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center ml-1 shadow-md">
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}
