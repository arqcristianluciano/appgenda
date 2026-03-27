import { useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import { getStoredToken, fetchCalendars, fetchEvents, toLocalEvento } from '../../services/googleCalendar'
import CalendarHeader from './CalendarHeader'
import MonthView from './MonthView'
import WeekView from './WeekView'
import EventModal from './EventModal'
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
      const hasSource = sources.some(s => s.type === 'google')
      if (!hasSource) {
        addSource({
          id: `google_${primary.id}`, name: `Google: ${primary.summary}`,
          type: 'google', color: primary.backgroundColor || '#4285F4', enabled: true,
        })
      }
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 0)
      const evts = await fetchEvents(primary.id, start.toISOString(), end.toISOString())
      setExternalEvents(evts.map(e => toLocalEvento(e, primary.backgroundColor || '#4285F4')))
    } catch {
      /* token may be expired */
    }
  }, [sources, setExternalEvents, addSource])

  useEffect(() => { refreshGoogle() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const localSource = sources.find(s => s.type === 'local')
  const localVisible = !localSource || localSource.enabled

  const allEvents = [
    ...(localVisible
      ? data.eventos.map(e => ({
        ...e,
        source: (e.source || 'local') as 'local',
        color: e.color || localSource?.color || '#2B5E3E',
      }))
      : []),
    ...externalEvents.filter(e => {
      const src = sources.find(s => s.type === e.source)
      return src?.enabled
    }),
  ]

  return (
    <div className="flex flex-col h-full -mt-2">
      <CalendarHeader />
      <div className="flex-1 overflow-hidden mt-3">
        {viewMode === 'month' && <MonthView events={allEvents} />}
        {(viewMode === 'week' || viewMode === 'day') && <WeekView events={allEvents} />}
      </div>
      <CalendarSources />
      {showModal && <EventModal />}
    </div>
  )
}
