import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import CalendarHeader from './CalendarHeader'
import MonthView from './MonthView'
import WeekView from './WeekView'
import MiniCalendar from './MiniCalendar'
import CalendarSources from './CalendarSources'

export default function ViewCalendar() {
  const { data } = useStore()
  const { viewMode, sources, externalEvents } = useCalendarStore()

  const allEvents = useMemo(() => {
    const localSrc = sources.find(s => s.type === 'local')
    const showLocal = !localSrc || localSrc.enabled
    const finSrc = sources.find(s => s.type === 'finances')
    const showFinances = finSrc?.enabled ?? true
    const finColor = finSrc?.color || '#D97706'

    const taskEvts = data.tareas
      .filter(t => t.fecha && !t.done)
      .map(t => {
        const proj = data.proyectos.find(p => p.id === t.proj)
        return {
          id: `tarea_${t.id}`, titulo: t.txt, fecha: t.fecha, hora: '',
          nota: t.nota, allDay: true, color: proj?.color || '#6B7280',
          source: 'tasks' as const, proj: t.proj ?? undefined,
        }
      })

    const finEvts = showFinances
      ? data.pagos.filter(p => p.fecha).map(p => {
          const ob = data.obligaciones.find(o => o.id === p.oblId)
          return {
            id: `fin_${p.id}`, titulo: ob?.txt || 'Pago', fecha: p.fecha,
            hora: '', nota: `${ob?.tipo === 'tarjeta' ? 'Tarjeta' : 'Préstamo'} · ${p.mes}`,
            allDay: true, color: p.done ? '#6B7280' : finColor, source: 'finances' as const,
          }
        })
      : []

    const localEvts = showLocal
      ? data.eventos.map(e => ({
          ...e, source: (e.source || 'local') as 'local',
          color: e.color || localSrc?.color || '#2B5E3E',
        }))
      : []

    const extFiltered = externalEvents.filter(e => {
      if (e.calendarSourceId) {
        const cs = sources.find(s => s.id === e.calendarSourceId)
        if (cs) return cs.enabled
      }
      return sources.some(s => s.type === e.source && s.enabled)
    })

    return [...localEvts, ...extFiltered, ...finEvts, ...taskEvts]
  }, [data.tareas, data.proyectos, data.pagos, data.obligaciones, data.eventos, externalEvents, sources])

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full bg-surface rounded-xl lg:rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--edge)' }}>
      <CalendarHeader />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden lg:flex flex-col w-[220px] flex-shrink-0 border-r p-4 overflow-y-auto"
          style={{ borderColor: 'var(--edge)' }}>
          <MiniCalendar />
          <CalendarSources />
        </div>
        {/* Sync hooks on mobile (mounted but invisible) */}
        <div className="lg:hidden absolute w-0 h-0 overflow-hidden pointer-events-none">
          <CalendarSources />
        </div>
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {viewMode === 'month' && <MonthView events={allEvents} />}
          {(viewMode === 'week' || viewMode === 'day') && <WeekView events={allEvents} />}
        </div>
      </div>
    </div>
  )
}
