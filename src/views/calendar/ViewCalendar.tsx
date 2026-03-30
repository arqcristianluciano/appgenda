import { useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import {
  getStoredIcloudUrl, getStoredIcloudColor, getStoredIcloudName,
  loadIcloudEvents,
} from '../../services/icloudCalendar'
import CalendarHeader from './CalendarHeader'
import MonthView from './MonthView'
import WeekView from './WeekView'
import EventModal from './EventModal'
import MiniCalendar from './MiniCalendar'
import CalendarSources from './CalendarSources'

export default function ViewCalendar() {
  const { data } = useStore()
  const { viewMode, showModal, sources, externalEvents, mergeExternalEvents, addSource } = useCalendarStore()

  const refreshIcloud = useCallback(async () => {
    const url = getStoredIcloudUrl()
    if (!url) return
    const color = getStoredIcloudColor()
    const name = getStoredIcloudName()
    try {
      if (!sources.some(s => s.type === 'icloud')) {
        addSource({ id: 'icloud_main', name, type: 'icloud', color, enabled: true })
      }
      const events = await loadIcloudEvents(url, color)
      mergeExternalEvents(events, 'icloud')
    } catch { /* silencioso en background */ }
  }, [sources, mergeExternalEvents, addSource])

  useEffect(() => {
    refreshIcloud()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const localSrc = sources.find(s => s.type === 'local')
  const showLocal = !localSrc || localSrc.enabled
  const finSrc = sources.find(s => s.type === 'finances')
  const showFinances = finSrc?.enabled ?? true
  const finColor = finSrc?.color || '#D97706'

  const enabledSourceIds = new Set(sources.filter(s => s.enabled).map(s => s.id))

  const taskEvents = data.tareas
    .filter(t => t.fecha && !t.done)
    .map(t => {
      const proj = data.proyectos.find(p => p.id === t.proj)
      return {
        id: `tarea_${t.id}`,
        titulo: t.txt,
        fecha: t.fecha,
        hora: '',
        nota: t.nota,
        allDay: true,
        color: proj?.color || '#6B7280',
        source: 'tasks' as const,
        proj: t.proj ?? undefined,
      }
    })

  const financeEvents = showFinances
    ? data.pagos
        .filter(p => p.fecha)
        .map(p => {
          const ob = data.obligaciones.find(o => o.id === p.oblId)
          return {
            id: `fin_${p.id}`,
            titulo: ob?.txt || 'Pago',
            fecha: p.fecha,
            hora: '',
            nota: `${ob?.tipo === 'tarjeta' ? 'Tarjeta' : 'Préstamo'} · ${p.mes}`,
            allDay: true,
            color: p.done ? '#6B7280' : finColor,
            source: 'finances' as const,
          }
        })
    : []

  const allEvents = [
    ...(showLocal
      ? data.eventos.map(e => ({
        ...e, source: (e.source || 'local') as 'local',
        color: e.color || localSrc?.color || '#2B5E3E',
      }))
      : []),
    // Google events: show if their specific calendar source is enabled
    ...externalEvents.filter(e => {
      if (e.source !== 'google') return sources.find(s => s.type === e.source)?.enabled
      // Find the specific google calendar source by calendarId embedded in event ID
      const calSource = sources.find(s => s.id === e.calendarSourceId)
      if (calSource) return calSource.enabled
      // Fallback: show if any google source is enabled
      return sources.some(s => s.type === 'google' && s.enabled)
    }),
    ...financeEvents,
    ...taskEvents,
  ]

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl lg:rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--edge)' }}>
      <CalendarHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col w-[200px] lg:w-[220px] flex-shrink-0 border-r p-3 lg:p-4 overflow-y-auto"
          style={{ borderColor: 'var(--edge)' }}>
          <MiniCalendar />
          <CalendarSources />
        </div>
        <div className="flex-1 overflow-hidden">
          {viewMode === 'month' && <MonthView events={allEvents} />}
          {(viewMode === 'week' || viewMode === 'day') && <WeekView events={allEvents} />}
        </div>
      </div>
      {showModal && <EventModal />}
    </div>
  )
}
