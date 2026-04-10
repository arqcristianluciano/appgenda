import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import CalendarHeader from './CalendarHeader'
import MonthView from './MonthView'
import WeekView from './WeekView'
import MiniCalendar from './MiniCalendar'
import CalendarSources from './CalendarSources'
import ScopeFilter from '../../components/ScopeFilter'

export default function ViewCalendar() {
  const { data, filtroScope } = useStore()
  const activeTeamId = useTeamStore(s => s.activeTeamId)
  const { viewMode, sources, externalEvents } = useCalendarStore()

  const allEvents = useMemo(() => {
    const localSrc = sources.find(s => s.type === 'local')
    const showLocal = !localSrc || localSrc.enabled
    const finSrc = sources.find(s => s.type === 'finances')
    const showFinances = finSrc?.enabled ?? true
    const finColor = finSrc?.color || '#D97706'

    const byScope = <T extends { teamId?: string | null }>(items: T[]) => {
      if (filtroScope === 'personal') return items.filter(t => !t.teamId)
      if (filtroScope === 'equipo') return items.filter(t => t.teamId === activeTeamId)
      return items
    }

    const taskEvts = byScope(data.tareas)
      .filter(t => t.fecha && !t.done)
      .map(t => {
        const proj = data.proyectos.find(p => p.id === t.proj)
        return {
          id: `tarea_${t.id}`, titulo: t.txt, fecha: t.fecha, hora: '',
          nota: t.nota, allDay: true, color: proj?.color || '#6B7280',
          source: 'tasks' as const, proj: t.proj ?? undefined,
        }
      })

    const scopedOblIds = new Set(byScope(data.obligaciones).map(o => o.id))

    const finEvts = showFinances
      ? data.pagos.filter(p => p.fecha && scopedOblIds.has(p.oblId)).map(p => {
          const ob = data.obligaciones.find(o => o.id === p.oblId)
          return {
            id: `fin_${p.id}`, titulo: ob?.txt || 'Pago', fecha: p.fecha,
            hora: '', nota: `${ob?.tipo === 'tarjeta' ? 'Tarjeta' : 'Préstamo'} · ${p.mes}`,
            allDay: true, color: p.done ? '#6B7280' : finColor, source: 'finances' as const,
          }
        })
      : []

    const localEvts = showLocal
      ? byScope(data.eventos).map(e => ({
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
  }, [data.tareas, data.proyectos, data.pagos, data.obligaciones, data.eventos, externalEvents, sources, filtroScope, activeTeamId])

  return (
    <>
      {/* Mount sync hooks on mobile (invisible, out of layout flow) */}
      <div className="lg:hidden fixed invisible pointer-events-none" aria-hidden="true">
        <CalendarSources />
      </div>
      <div className="flex flex-col flex-1 min-h-0 w-full bg-surface rounded-xl lg:rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--edge)' }}>
        <div className="lg:hidden px-3 pt-2"><ScopeFilter /></div>
        <CalendarHeader />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="hidden lg:flex flex-col w-[220px] flex-shrink-0 border-r p-4 overflow-y-auto"
            style={{ borderColor: 'var(--edge)' }}>
            <ScopeFilter />
            <MiniCalendar />
            <CalendarSources />
          </div>
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            {viewMode === 'month' && <MonthView events={allEvents} />}
            {(viewMode === 'week' || viewMode === 'day') && <WeekView events={allEvents} />}
          </div>
        </div>
      </div>
    </>
  )
}
