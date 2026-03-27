import { create } from 'zustand'
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
  openModal: (fecha?: string, hora?: string, event?: Evento) => void
  closeModal: () => void
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  viewMode: 'month',
  currentDate: new Date(),
  sources: [
    { id: 'local', name: 'Mi calendario', type: 'local', color: '#2B5E3E', enabled: true },
  ],
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

  removeSource: (id) => set(s => ({
    sources: s.sources.filter(src => src.id !== id),
    externalEvents: s.externalEvents.filter(e => {
      const removed = s.sources.find(src => src.id === id)
      return !removed || e.source !== removed.type
    }),
  })),

  setExternalEvents: (externalEvents) => set({ externalEvents }),

  openModal: (fecha, hora, event) => set({
    showModal: true,
    modalDate: fecha || new Date().toISOString().split('T')[0],
    modalHora: hora || '',
    selectedEvent: event || null,
  }),

  closeModal: () => set({
    showModal: false, selectedEvent: null, modalDate: '', modalHora: '',
  }),
}))
