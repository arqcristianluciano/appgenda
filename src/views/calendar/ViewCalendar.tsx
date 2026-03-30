import { useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import { getAccountEmails, getTokenForEmail, fetchCalendars, fetchEvents, toLocalEvento } from '../../services/googleCalendar'
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

  const refreshGoogle = useCallback(async () => {
    const emails = getAccountEmails()
    if (emails.length === 0) return
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 6, 0)
    for (const email of emails) {
      const token = getTokenForEmail(email)
      if (!token) continue
      try {
        const cals = await fetchCalendars(token)
        for (const cal of cals) {
          const evts = await fetchEvents(token, cal.id, start.toISOString(), end.toISOString())
          mergeExternalEvents(evts.map(e => toLocalEvento(e, cal.backgroundColor || '#4285F4')), 'google')
        }
      } catch { /* token expirado */ }
    }
  }, [mergeExternalEvents])

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
    refreshGoogle()
    refreshIcloud()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const localSrc = sources.find(s => s.type === 'local')
  const showLocal = !localSrc || localSrc.enabled
  const finSrc = sources.find(s => s.type === 'finances')
  const showFinances = finSrc?.enabled ?? true
  const finColor = finSrc?.color || '#D97706'

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
    ...externalEvents.filter(e => sources.find(s => s.type === e.source)?.enabled),
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
