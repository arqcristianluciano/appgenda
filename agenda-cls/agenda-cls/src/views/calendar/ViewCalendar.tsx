import { useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import { getStoredToken, fetchCalendars, fetchEvents, toLocalEvento } from '../../services/googleCalendar'
import CalendarHeader from './CalendarHeader'
import MonthView from './MonthView'
import WeekView from './WeekView'
import EventModal from './EventModal'
import MiniCalendar from './MiniCalendar'
import CalendarSources from './CalendarSources'

export default function ViewCalendar() {
  const { data } = useStore()
  const { viewMode, showModal, sources, externalEvents, setExternalEvents, addSource } = useCalendarStore()

  const refreshGoogle = useCallback(async () => {
    const token = getStoredToken()
    if (!token) return
    try {
      const cals = await fetchCalendars()
      const primary = cals.find(c => c.primary) || cals[0]
      if (!primary) return
      if (!sources.some(s => s.type === 'google')) {
        addSource({
          id: `google_${primary.id}`, name: primary.summary,
          type: 'google', color: primary.backgroundColor || '#4285F4', enabled: true,
        })
      }
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 0)
      const evts = await fetchEvents(primary.id, start.toISOString(), end.toISOString())
      setExternalEvents(evts.map(e => toLocalEvento(e, primary.backgroundColor || '#4285F4')))
    } catch { /* token expired */ }
  }, [sources, setExternalEvents, addSource])

  useEffect(() => { refreshGoogle() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const localSrc = sources.find(s => s.type === 'local')
  const showLocal = !localSrc || localSrc.enabled

  const allEvents = [
    ...(showLocal
      ? data.eventos.map(e => ({
        ...e, source: (e.source || 'local') as 'local',
        color: e.color || localSrc?.color || '#2B5E3E',
      }))
      : []),
    ...externalEvents.filter(e => sources.find(s => s.type === e.source)?.enabled),
  ]

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl lg:rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--edge)' }}>
      <CalendarHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:flex flex-col w-[220px] flex-shrink-0 border-r p-4 overflow-y-auto"
          style={{ borderColor: 'var(--edge)' }}>
          <MiniCalendar />
          <CalendarSources />
        </div>

        {/* Main calendar */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'month' && <MonthView events={allEvents} />}
          {(viewMode === 'week' || viewMode === 'day') && <WeekView events={allEvents} />}
        </div>
      </div>
      {showModal && <EventModal />}
    </div>
  )
}
