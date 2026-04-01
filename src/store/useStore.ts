import { create } from 'zustand'
import type { AppData, Tarea, Inversion, Vista, FiltroHoy, FiltroProy, FiltroInv, CalendarConfig } from '../types'
import { DEFAULT_DATA, SK } from '../lib/defaults'
import { loadData, saveData, localSave, subscribeToChanges } from '../lib/storage'
import { ensureMonths } from '../lib/merge'

interface AppStore {
  data: AppData
  loaded: boolean
  vista: Vista
  filtroHoy: FiltroHoy
  filtroProy: FiltroProy
  filtroInv: FiltroInv
  sidebarOpen: boolean
  darkMode: boolean

  // Init
  init: () => Promise<void>
  persist: () => Promise<void>

  // Vista
  setVista: (v: Vista) => void
  setFiltroHoy: (f: FiltroHoy) => void
  setFiltroProy: (f: FiltroProy) => void
  setFiltroInv: (f: FiltroInv) => void
  toggleSidebar: () => void
  toggleDarkMode: () => void

  // Tareas
  toggleTarea: (id: number) => void
  deleteTarea: (id: number) => void
  addTarea: (txt: string, proj: string | null, prio: 'alta' | 'media' | 'baja', fecha?: string, notificacion?: string) => void
  updateTarea: (id: number, fields: Partial<Pick<Tarea, 'txt' | 'proj' | 'prio' | 'nota' | 'fecha' | 'notificacion'>>) => void
  reorderTareas: (fromId: number, toId: number) => void

  // Data
  importData: (data: AppData) => void

  // Proyectos
  addProyecto: (nombre: string, color: string) => void
  updateProyecto: (id: string, fields: Partial<Pick<import('../types').Proyecto, 'nombre' | 'color'>>) => void

  // Pagos
  togglePago: (id: string) => void
  setPagoFecha: (id: string, fecha: string) => void

  // Eventos
  addEvento: (titulo: string, fecha: string, hora: string, nota: string, horaFin?: string, allDay?: boolean, color?: string, notificacion?: string, id?: string, proj?: string | null) => void
  updateEvento: (id: string, fields: Partial<Pick<import('../types').Evento, 'titulo' | 'fecha' | 'hora' | 'horaFin' | 'nota' | 'allDay' | 'color' | 'notificacion' | 'proj' | 'done'>>) => void
  toggleEvento: (id: string) => void
  deleteEvento: (id: string) => void

  // Inversiones
  addInversion: (inv: Omit<Inversion, 'id'>) => void
  updateInversion: (id: string, inv: Partial<Inversion>) => void
  deleteInversion: (id: string) => void

  // Calendar config (synced via Supabase)
  setCalendarConfig: (config: CalendarConfig) => void
  updateCalendarConfig: (patch: Partial<CalendarConfig>) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: AppData | null = null
let isRemoteUpdate = false

export const useStore = create<AppStore>((set, get) => ({
  data: { ...DEFAULT_DATA },
  loaded: false,
  vista: 'hoy',
  filtroHoy: 'all',
  filtroProy: 'todos',
  filtroInv: 'todas',
  sidebarOpen: false,
  darkMode: localStorage.getItem('darkMode') === 'true',

  init: async () => {
    const dark = localStorage.getItem('darkMode') === 'true'
    document.documentElement.classList.toggle('dark', dark)
    set({ data: ensureMonths(await loadData()), loaded: true })

    const applyRemote = (fresh: AppData) => {
      if (JSON.stringify(fresh) === JSON.stringify(get().data)) return
      isRemoteUpdate = true
      set({ data: ensureMonths(fresh) })
      isRemoteUpdate = false
    }

    subscribeToChanges(applyRemote)

    const flushPending = () => {
      const d = pendingData ?? get().data
      try { localSave(SK, JSON.stringify(d)) } catch (_) {}
    }

    window.addEventListener('beforeunload', flushPending)
    window.addEventListener('pagehide', flushPending)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPending()
      if (document.visibilityState === 'visible') {
        loadData().then(applyRemote).catch(() => {})
      }
    })
  },

  persist: async () => {
    const data = get().data
    pendingData = data
    localSave(SK, JSON.stringify(data))
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      if (pendingData) await saveData(pendingData)
      pendingData = null
    }, 500)
  },

  setVista: (vista) => set({ vista, sidebarOpen: false }),
  setFiltroHoy: (filtroHoy) => set({ filtroHoy }),
  setFiltroProy: (filtroProy) => set({ filtroProy }),
  setFiltroInv: (filtroInv) => set({ filtroInv }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleDarkMode: () => set(s => {
    const next = !s.darkMode
    localStorage.setItem('darkMode', String(next))
    document.documentElement.classList.toggle('dark', next)
    return { darkMode: next }
  }),

  toggleTarea: (id) => {
    set(s => ({
      data: {
        ...s.data,
        tareas: s.data.tareas.map(t => t.id === id ? { ...t, done: !t.done } : t)
      }
    }))
    get().persist()
  },

  deleteTarea: (id) => {
    const isDefault = DEFAULT_DATA.tareas.some(t => t.id === id)
    set(s => ({
      data: {
        ...s.data,
        tareas: s.data.tareas.filter(t => t.id !== id),
        deletedTaskIds: isDefault
          ? [...new Set([...s.data.deletedTaskIds, id])]
          : s.data.deletedTaskIds,
      }
    }))
    get().persist()
  },

  addTarea: (txt, proj, prio, fecha = '', notificacion = '') => {
    set(s => ({
      data: {
        ...s.data,
        nextId: s.data.nextId + 1,
        tareas: [...s.data.tareas, { id: s.data.nextId, txt, done: false, proj, prio, fecha, nota: '', notificacion }]
      }
    }))
    get().persist()
  },

  updateTarea: (id, fields) => {
    set(s => ({
      data: { ...s.data, tareas: s.data.tareas.map(t => t.id === id ? { ...t, ...fields } : t) }
    }))
    get().persist()
  },

  reorderTareas: (fromId, toId) => {
    set(s => {
      const tareas = [...s.data.tareas]
      const fi = tareas.findIndex(t => t.id === fromId)
      const ti = tareas.findIndex(t => t.id === toId)
      if (fi < 0 || ti < 0) return s
      tareas.splice(ti, 0, ...tareas.splice(fi, 1))
      return { data: { ...s.data, tareas } }
    })
    get().persist()
  },

  addProyecto: (nombre, color) => {
    set(s => ({
      data: {
        ...s.data,
        proyectos: [...s.data.proyectos, { id: `p${Date.now()}`, nombre, color }]
      }
    }))
    get().persist()
  },

  updateProyecto: (id, fields) => {
    set(s => ({
      data: {
        ...s.data,
        proyectos: s.data.proyectos.map(p => p.id === id ? { ...p, ...fields } : p)
      }
    }))
    get().persist()
  },

  togglePago: (id) => {
    set(s => {
      const pagos = s.data.pagos.map(p => p.id === id ? { ...p, done: !p.done } : p)
      const withMonths = ensureMonths({ ...s.data, pagos })
      return { data: withMonths }
    })
    get().persist()
  },

  setPagoFecha: (id, fecha) => {
    set(s => ({
      data: { ...s.data, pagos: s.data.pagos.map(p => p.id === id ? { ...p, fecha } : p) }
    }))
    get().persist()
  },

  addEvento: (titulo, fecha, hora, nota, horaFin, allDay, color, notificacion, id, proj) => {
    set(s => ({
      data: {
        ...s.data,
        eventos: [...s.data.eventos, {
          id: id ?? `ev${Date.now()}`, titulo, fecha, hora, nota,
          ...(horaFin ? { horaFin } : {}),
          ...(allDay != null ? { allDay } : {}),
          ...(color ? { color } : {}),
          ...(notificacion ? { notificacion } : {}),
          ...(proj != null ? { proj } : {}),
          source: 'local' as const,
        }],
      },
    }))
    get().persist()
  },
  updateEvento: (id, fields) => {
    set(s => ({ data: { ...s.data, eventos: s.data.eventos.map(e => e.id === id ? { ...e, ...fields } : e) } }))
    get().persist()
  },
  toggleEvento: (id) => {
    set(s => ({
      data: { ...s.data, eventos: s.data.eventos.map(e => e.id === id ? { ...e, done: !e.done } : e) }
    }))
    get().persist()
  },
  deleteEvento: (id) => {
    set(s => ({ data: { ...s.data, eventos: s.data.eventos.filter(e => e.id !== id) } }))
    get().persist()
  },

  addInversion: (inv) => {
    set(s => ({
      data: {
        ...s.data,
        nextInvId: s.data.nextInvId + 1,
        inversiones: [...s.data.inversiones, { ...inv, id: `inv${s.data.nextInvId}` }]
      }
    }))
    get().persist()
  },

  updateInversion: (id, inv) => {
    set(s => ({
      data: {
        ...s.data,
        inversiones: s.data.inversiones.map(i => i.id === id ? { ...i, ...inv } : i)
      }
    }))
    get().persist()
  },

  deleteInversion: (id) => {
    set(s => ({ data: { ...s.data, inversiones: s.data.inversiones.filter(i => i.id !== id) } }))
    get().persist()
  },

  importData: (data) => {
    set({ data })
    get().persist()
  },

  setCalendarConfig: (config) => {
    set(s => ({ data: { ...s.data, calendarConfig: config } }))
    get().persist()
  },

  updateCalendarConfig: (patch) => {
    set(s => ({
      data: { ...s.data, calendarConfig: { ...s.data.calendarConfig, ...patch } },
    }))
    get().persist()
  },
}))

useStore.subscribe((state, prev) => {
  if (state.loaded && state.data !== prev.data) {
    localSave(SK, JSON.stringify(state.data))
    if (isRemoteUpdate) return
    pendingData = state.data
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      if (pendingData) await saveData(pendingData)
      pendingData = null
    }, 500)
  }
})
