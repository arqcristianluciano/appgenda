import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CalendarViewMode, CalendarSource, Evento } from '../types'

interface CalendarStore {
  viewMode: CalendarViewMode
  currentDate: Date
  sources: CalendarSource[]
  externalEvents: Evento[]
  selectedEvent: Evento | null
  showModal: boolean
  modalDate: string
  modalHora: string

  setViewMode: (m: CalendarViewMode) => void
  setCurrentDate: (d: Date) => void
  goToday: () => void
  goPrev: () => void
  goNext: () => void
  toggleSource: (id: string) => void
  addSource: (s: CalendarSource) => void
  removeSource: (id: string) => void
  setExternalEvents: (evts: Evento[]) => void
  mergeExternalEvents: (evts: Evento[], source: 'google' | 'icloud') => void
  appendExternalEvents: (evts: Evento[]) => void
  clearExternalEvents: (source: 'google' | 'icloud') => void
  openModal: (fecha?: string, hora?: string, event?: Evento) => void
  closeModal: () => void
}

const DEFAULT_SOURCES: CalendarSource[] = [
  { id: 'local', name: 'Mi calendario', type: 'local', color: '#2B5E3E', enabled: true },
  { id: 'finances', name: 'Finanzas', type: 'finances', color: '#D97706', enabled: true },
]

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      viewMode: 'month',
      currentDate: new Date(),
      sources: DEFAULT_SOURCES,
      externalEvents: [],
      selectedEvent: null,
      showModal: false,
      modalDate: '',
      modalHora: '',

      setViewMode: (viewMode) => set({ viewMode }),
      setCurrentDate: (currentDate) => set({ currentDate }),
      goToday: () => set({ currentDate: new Date() }),

      goPrev: () => {
        const { viewMode, currentDate } = get()
        const d = new Date(currentDate)
        if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
        else if (viewMode === 'week') d.setDate(d.getDate() - 7)
        else d.setDate(d.getDate() - 1)
        set({ currentDate: d })
      },

      goNext: () => {
        const { viewMode, currentDate } = get()
        const d = new Date(currentDate)
        if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
        else if (viewMode === 'week') d.setDate(d.getDate() + 7)
        else d.setDate(d.getDate() + 1)
        set({ currentDate: d })
      },

      toggleSource: (id) => set(s => ({
        sources: s.sources.map(src => src.id === id ? { ...src, enabled: !src.enabled } : src),
      })),

      addSource: (source) => set(s => ({ sources: [...s.sources, source] })),

      removeSource: (id) => set(s => {
        const removed = s.sources.find(src => src.id === id)
        const newSources = s.sources.filter(src => src.id !== id)
        const typeStillExists = removed
          ? newSources.some(src => src.type === removed.type)
          : true
        return {
          sources: newSources,
          externalEvents: typeStillExists || !removed
            ? s.externalEvents
            : s.externalEvents.filter(e => e.source !== removed.type),
        }
      }),

      setExternalEvents: (externalEvents) => set({ externalEvents }),

      mergeExternalEvents: (evts, source) => set(s => ({
        externalEvents: [
          ...s.externalEvents.filter(e => e.source !== source),
          ...evts,
        ],
      })),

      appendExternalEvents: (evts) => set(s => {
        const newIds = new Set(evts.map(e => e.id))
        return {
          externalEvents: [
            ...s.externalEvents.filter(e => !newIds.has(e.id)),
            ...evts,
          ],
        }
      }),

      clearExternalEvents: (source) => set(s => ({
        externalEvents: s.externalEvents.filter(e => e.source !== source),
      })),

      openModal: (fecha, hora, event) => set({
        showModal: true,
        modalDate: fecha || new Date().toISOString().split('T')[0],
        modalHora: hora || '',
        selectedEvent: event || null,
      }),

      closeModal: () => set({
        showModal: false, selectedEvent: null, modalDate: '', modalHora: '',
      }),
    }),
    {
      name: 'calendar-sources-cls',
      partialize: (state) => ({
        sources: state.sources,
        viewMode: state.viewMode,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<CalendarStore>),
        sources: mergeSources(
          DEFAULT_SOURCES,
          (persisted as Partial<CalendarStore>)?.sources,
        ),
      }),
    }
  )
)

function mergeSources(defaults: CalendarSource[], saved?: CalendarSource[]): CalendarSource[] {
  if (!saved?.length) return defaults
  const savedMap = new Map(saved.map(s => [s.id, s]))
  const merged = defaults.map(d => savedMap.get(d.id) ?? d)
  saved.forEach(s => { if (!defaults.some(d => d.id === s.id)) merged.push(s) })
  return merged
}
