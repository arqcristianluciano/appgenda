import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarStore } from '../../store/useCalendarStore'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MiniCalendar() {
  const { currentDate, setCurrentDate, setViewMode } = useCalendarStore()
  const [navDate, setNavDate] = useState(() => new Date(currentDate))
  const today = toISO(new Date())
  const selected = toISO(currentDate)

  useEffect(() => {
    setNavDate(new Date(currentDate))
  }, [currentDate.getMonth(), currentDate.getFullYear()]) // eslint-disable-line

  const year = navDate.getFullYear()
  const month = navDate.getMonth()
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
  while (cells.length % 7 !== 0) {
    const nd = cells.length - startOffset - daysInMonth + 1
    const d = new Date(year, month + 1, nd)
    cells.push({ date: d, iso: toISO(d), current: false })
  }

  const prev = () => setNavDate(new Date(year, month - 1, 1))
  const next = () => setNavDate(new Date(year, month + 1, 1))
  const pick = (d: Date) => { setCurrentDate(d); setViewMode('day') }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[13px] font-semibold text-ink">{MESES[month]} {year}</span>
        <div className="flex gap-0.5">
          <button onClick={prev} className="w-6 h-6 rounded-full flex items-center justify-center text-ink-3 hover:bg-surface-3 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button onClick={next} className="w-6 h-6 rounded-full flex items-center justify-center text-ink-3 hover:bg-surface-3 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-ink-3 py-1">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const isToday = c.iso === today
          const isSel = c.iso === selected
          return (
            <button key={i} onClick={() => pick(c.date)}
              className={`w-full aspect-square flex items-center justify-center text-[11px] rounded-full transition-all
                ${!c.current ? 'text-ink-4' : 'text-ink-2'}
                ${isToday && !isSel ? 'text-accent font-bold' : ''}
                ${isSel ? 'bg-accent text-white font-bold' : 'hover:bg-surface-3'}
              `}>
              {c.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
