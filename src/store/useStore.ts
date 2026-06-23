import { create } from 'zustand'
import type { AppData, Tarea, Inversion, Vista, FiltroHoy, FiltroProy, FiltroInv, FiltroScope, CalendarConfig, ArchivoAdjunto, Obligacion, TipoObligacion } from '../types'
import { DEFAULT_DATA, SK } from '../lib/defaults'
import { loadData, localSave, subscribeToChanges, forceSync } from '../lib/storage'
import { ensureMonths } from '../lib/merge'
import { db, getUserId } from '../services/db'

let cachedUserId: string | null = null
async function uid(): Promise<string> {
  if (!cachedUserId) cachedUserId = await getUserId() ?? ''
  return cachedUserId
}

function activeTeamId(): string | null {
  try {
    // Lazy import to avoid circular deps
    return localStorage.getItem('activeTeamId')
  } catch { return null }
}

interface AppStore {
  data: AppData
  loaded: boolean
  vista: Vista
  filtroHoy: FiltroHoy
  filtroProy: FiltroProy
  filtroInv: FiltroInv
  filtroScope: FiltroScope
  sidebarOpen: boolean
  darkMode: boolean

  init: () => Promise<void>
  refresh: () => Promise<void>
  persist: () => void

  setVista: (v: Vista) => void
  setFiltroHoy: (f: FiltroHoy) => void
  setFiltroProy: (f: FiltroProy) => void
  setFiltroInv: (f: FiltroInv) => void
  setFiltroScope: (f: FiltroScope) => void
  toggleSidebar: () => void
  toggleDarkMode: () => void

  toggleTarea: (id: string) => void
  deleteTarea: (id: string) => void
  addTarea: (txt: string, proj: string | null, prio: 'alta' | 'media' | 'baja', fecha?: string, notificacion?: string) => string
  updateTarea: (id: string, fields: Partial<Pick<Tarea, 'txt' | 'proj' | 'prio' | 'nota' | 'fecha' | 'notificacion' | 'assigneeId'>>) => void
  reorderTareas: (fromId: string, toId: string) => void

  importData: (data: AppData) => void

  addProyecto: (nombre: string, color: string, assigneeId?: string | null) => void
  updateProyecto: (id: string, fields: Partial<Pick<import('../types').Proyecto, 'nombre' | 'color' | 'assigneeId'>>) => void
  addArchivoProyecto: (projId: string, archivo: ArchivoAdjunto) => void
  removeArchivoProyecto: (projId: string, archivoId: string) => void
  addArchivoTarea: (tareaId: string, archivo: ArchivoAdjunto) => void
  removeArchivoTarea: (tareaId: string, archivoId: string) => void

  togglePago: (id: string) => void
  setPagoFecha: (id: string, fecha: string) => void
  addObligacion: (txt: string, tipo: TipoObligacion, dia?: string) => void
  updateObligacion: (id: string, fields: Partial<Pick<Obligacion, 'txt' | 'tipo'>>) => void
  deleteObligacion: (id: string) => void

  addEvento: (titulo: string, fecha: string, hora: string, nota: string, horaFin?: string, allDay?: boolean, color?: string, notificacion?: string, id?: string, proj?: string | null) => void
  updateEvento: (id: string, fields: Partial<Pick<import('../types').Evento, 'titulo' | 'fecha' | 'hora' | 'horaFin' | 'nota' | 'allDay' | 'color' | 'notificacion' | 'proj' | 'done'>>) => void
  toggleEvento: (id: string) => void
  deleteEvento: (id: string) => void

  addInversion: (inv: Omit<Inversion, 'id'>) => void
  updateInversion: (id: string, inv: Partial<Inversion>) => void
  deleteInversion: (id: string) => void

  setCalendarConfig: (config: CalendarConfig) => void
  updateCalendarConfig: (patch: Partial<CalendarConfig>) => void
}

let isRemoteUpdate = false

export const useStore = create<AppStore>((set, get) => ({
  data: { ...DEFAULT_DATA },
  loaded: false,
  vista: (localStorage.getItem('vista') as Vista) || 'hoy',
  filtroHoy: 'all',
  filtroProy: 'todos',
  filtroInv: 'todas',
  filtroScope: 'todos',
  sidebarOpen: false,
  darkMode: localStorage.getItem('darkMode') === 'true',

  init: async () => {
    const dark = localStorage.getItem('darkMode') === 'true'
    document.documentElement.classList.toggle('dark', dark)
    cachedUserId = await getUserId()
    const loaded = ensureMonths(await loadData())
    set({ data: loaded, loaded: true })

    subscribeToChanges((fresh) => {
      if (JSON.stringify(fresh) === JSON.stringify(get().data)) return
      isRemoteUpdate = true
      forceSync(fresh)
      set({ data: ensureMonths(fresh) })
      isRemoteUpdate = false
    })

    window.addEventListener('beforeunload', () => localSave(SK, JSON.stringify(get().data)))
  },

  refresh: async () => {
    // Re-lee desde Firestore (con reconciliación) — usado por pull-to-refresh.
    try {
      const raw = await loadData()
      // loadData() devuelve DEFAULT_DATA (datos semilla) como sentinela cuando la
      // carga remota falla. No pisar los datos del usuario con la semilla.
      if (JSON.stringify(raw) === JSON.stringify(DEFAULT_DATA)) return
      const fresh = ensureMonths(raw)
      isRemoteUpdate = true
      forceSync(fresh)
      set({ data: fresh })
      isRemoteUpdate = false
    } catch {
      // Mantener los datos actuales ante cualquier fallo.
    }
  },

  persist: () => { localSave(SK, JSON.stringify(get().data)) },

  setVista: (vista) => { localStorage.setItem('vista', vista); set({ vista, sidebarOpen: false }) },
  setFiltroHoy: (filtroHoy) => set({ filtroHoy }),
  setFiltroProy: (filtroProy) => set({ filtroProy }),
  setFiltroInv: (filtroInv) => set({ filtroInv }),
  setFiltroScope: (filtroScope) => set({ filtroScope }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleDarkMode: () => set(s => {
    const next = !s.darkMode
    localStorage.setItem('darkMode', String(next))
    document.documentElement.classList.toggle('dark', next)
    return { darkMode: next }
  }),

  toggleTarea: (id) => {
    const tarea = get().data.tareas.find(t => t.id === id)
    if (!tarea) return
    const updated = { ...tarea, done: !tarea.done }
    set(s => ({ data: { ...s.data, tareas: s.data.tareas.map(t => t.id === id ? updated : t) } }))
    get().persist()
    uid().then(u => db.upsertTask(updated, u)).catch(() => {})
  },

  deleteTarea: (id) => {
    set(s => ({ data: { ...s.data, tareas: s.data.tareas.filter(t => t.id !== id) } }))
    get().persist()
    db.removeTask(id).catch(() => {})
  },

  addTarea: (txt, proj, prio, fecha = '', notificacion = '') => {
    const id = crypto.randomUUID()
    const teamId = activeTeamId()
    const tarea: Tarea = { id, txt, done: false, proj, prio, fecha, nota: '', notificacion, teamId }
    set(s => ({ data: { ...s.data, tareas: [tarea, ...s.data.tareas] } }))
    get().persist()
    uid().then(u => db.upsertTask(tarea, u)).catch(() => {})
    return id
  },

  updateTarea: (id, fields) => {
    set(s => ({ data: { ...s.data, tareas: s.data.tareas.map(t => t.id === id ? { ...t, ...fields } : t) } }))
    get().persist()
    const updated = get().data.tareas.find(t => t.id === id)
    if (updated) uid().then(u => db.upsertTask(updated, u)).catch(() => {})
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

  addProyecto: (nombre, color, assigneeId) => {
    const id = crypto.randomUUID()
    const teamId = activeTeamId()
    const proyecto = {
      id, nombre, color, teamId,
      ...(assigneeId ? { assigneeId } : {}),
    }
    set(s => ({ data: { ...s.data, proyectos: [...s.data.proyectos, proyecto] } }))
    get().persist()
    uid().then(u => db.upsertProject(proyecto, u)).catch(() => {})
  },

  updateProyecto: (id, fields) => {
    set(s => ({ data: { ...s.data, proyectos: s.data.proyectos.map(p => p.id === id ? { ...p, ...fields } : p) } }))
    get().persist()
    const updated = get().data.proyectos.find(p => p.id === id)
    if (updated) uid().then(u => db.upsertProject(updated, u)).catch(() => {})
  },

  addArchivoProyecto: (projId, archivo) => {
    set(s => ({
      data: { ...s.data, proyectos: s.data.proyectos.map(p => p.id === projId ? { ...p, archivos: [...(p.archivos ?? []), archivo] } : p) }
    }))
    get().persist()
  },

  removeArchivoProyecto: (projId, archivoId) => {
    set(s => ({
      data: { ...s.data, proyectos: s.data.proyectos.map(p => p.id === projId ? { ...p, archivos: (p.archivos ?? []).filter(a => a.id !== archivoId) } : p) }
    }))
    get().persist()
  },

  addArchivoTarea: (tareaId, archivo) => {
    set(s => ({
      data: { ...s.data, tareas: s.data.tareas.map(t => t.id === tareaId ? { ...t, archivos: [...(t.archivos ?? []), archivo] } : t) }
    }))
    get().persist()
  },

  removeArchivoTarea: (tareaId, archivoId) => {
    set(s => ({
      data: { ...s.data, tareas: s.data.tareas.map(t => t.id === tareaId ? { ...t, archivos: (t.archivos ?? []).filter(a => a.id !== archivoId) } : t) }
    }))
    get().persist()
  },

  togglePago: (id) => {
    const pago = get().data.pagos.find(p => p.id === id)
    if (!pago) return
    const updated = { ...pago, done: !pago.done }
    set(s => {
      const pagos = s.data.pagos.map(p => p.id === id ? updated : p)
      return { data: ensureMonths({ ...s.data, pagos }) }
    })
    get().persist()
    db.upsertPayment(updated).catch(() => {})
  },

  setPagoFecha: (id, fecha) => {
    const pago = get().data.pagos.find(p => p.id === id)
    if (!pago) return
    const updated = { ...pago, fecha }
    set(s => ({ data: { ...s.data, pagos: s.data.pagos.map(p => p.id === id ? updated : p) } }))
    get().persist()
    db.upsertPayment(updated).catch(() => {})
  },

  addObligacion: (txt, tipo, dia) => {
    const id = crypto.randomUUID()
    const teamId = activeTeamId()
    const obligacion: Obligacion = { id, txt, tipo, teamId }
    set(s => {
      // ensureMonths genera los pagos del mes actual y el siguiente para la
      // nueva obligación. Si se indicó un día de pago, lo aplicamos a esos pagos.
      let data = ensureMonths({ ...s.data, obligaciones: [...s.data.obligaciones, obligacion] })
      const day = dia ? parseInt(dia, 10) : NaN
      if (!isNaN(day) && day >= 1 && day <= 31) {
        const fechaFor = (mes: string) => {
          const [y, m] = mes.split('-').map(Number)
          const lastDay = new Date(y, m, 0).getDate()
          return `${mes}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
        }
        data = { ...data, pagos: data.pagos.map(p => (p.oblId === id && !p.fecha) ? { ...p, fecha: fechaFor(p.mes) } : p) }
      }
      return { data }
    })
    get().persist()
    uid().then(u => db.upsertObligation(obligacion, u)).catch(() => {})
    get().data.pagos.filter(p => p.oblId === id).forEach(p => db.upsertPayment(p).catch(() => {}))
  },

  updateObligacion: (id, fields) => {
    set(s => ({ data: { ...s.data, obligaciones: s.data.obligaciones.map(o => o.id === id ? { ...o, ...fields } : o) } }))
    get().persist()
    const updated = get().data.obligaciones.find(o => o.id === id)
    if (updated) uid().then(u => db.upsertObligation(updated, u)).catch(() => {})
  },

  deleteObligacion: (id) => {
    const pagoIds = get().data.pagos.filter(p => p.oblId === id).map(p => p.id)
    set(s => ({ data: { ...s.data,
      obligaciones: s.data.obligaciones.filter(o => o.id !== id),
      pagos: s.data.pagos.filter(p => p.oblId !== id),
    } }))
    get().persist()
    db.remove('obligations', id).catch(() => {})
    pagoIds.forEach(pid => db.remove('payments', pid).catch(() => {}))
  },

  addEvento: (titulo, fecha, hora, nota, horaFin, allDay, color, notificacion, id, proj) => {
    const teamId = activeTeamId()
    const evento = {
      id: id ?? crypto.randomUUID(), titulo, fecha, hora, nota, teamId,
      ...(horaFin ? { horaFin } : {}),
      ...(allDay != null ? { allDay } : {}),
      ...(color ? { color } : {}),
      ...(notificacion ? { notificacion } : {}),
      ...(proj != null ? { proj } : {}),
      source: 'local' as const,
    }
    set(s => ({ data: { ...s.data, eventos: [...s.data.eventos, evento] } }))
    get().persist()
    uid().then(u => db.upsertEvent(evento, u)).catch(() => {})
  },

  updateEvento: (id, fields) => {
    set(s => ({ data: { ...s.data, eventos: s.data.eventos.map(e => e.id === id ? { ...e, ...fields } : e) } }))
    get().persist()
    const updated = get().data.eventos.find(e => e.id === id)
    if (updated) uid().then(u => db.upsertEvent(updated, u)).catch(() => {})
  },

  toggleEvento: (id) => {
    const evento = get().data.eventos.find(e => e.id === id)
    if (!evento) return
    const updated = { ...evento, done: !evento.done }
    set(s => ({ data: { ...s.data, eventos: s.data.eventos.map(e => e.id === id ? updated : e) } }))
    get().persist()
    uid().then(u => db.upsertEvent(updated, u)).catch(() => {})
  },

  deleteEvento: (id) => {
    set(s => ({ data: { ...s.data, eventos: s.data.eventos.filter(e => e.id !== id) } }))
    get().persist()
    db.removeEvent(id).catch(() => {})
  },

  addInversion: (inv) => {
    const id = crypto.randomUUID()
    const teamId = activeTeamId()
    const full = { ...inv, id, teamId }
    set(s => ({ data: { ...s.data, inversiones: [...s.data.inversiones, full] } }))
    get().persist()
    uid().then(u => db.upsertInvestment(full, u)).catch(() => {})
  },

  updateInversion: (id, inv) => {
    set(s => ({ data: { ...s.data, inversiones: s.data.inversiones.map(i => i.id === id ? { ...i, ...inv } : i) } }))
    get().persist()
    const updated = get().data.inversiones.find(i => i.id === id)
    if (updated) uid().then(u => db.upsertInvestment(updated, u)).catch(() => {})
  },

  deleteInversion: (id) => {
    set(s => ({ data: { ...s.data, inversiones: s.data.inversiones.filter(i => i.id !== id) } }))
    get().persist()
    db.removeInvestment(id).catch(() => {})
  },

  importData: (data) => {
    set({ data })
    get().persist()
  },

  setCalendarConfig: (config) => {
    set(s => ({ data: { ...s.data, calendarConfig: config } }))
    get().persist()
    uid().then(u => db.saveCalendarConfig(u, config)).catch(() => {})
  },

  updateCalendarConfig: (patch) => {
    set(s => ({ data: { ...s.data, calendarConfig: { ...s.data.calendarConfig, ...patch } } }))
    get().persist()
    const full = get().data.calendarConfig
    if (full) uid().then(u => db.saveCalendarConfig(u, full)).catch(() => {})
  },
}))

useStore.subscribe((state, prev) => {
  if (state.loaded && state.data !== prev.data && !isRemoteUpdate) {
    localSave(SK, JSON.stringify(state.data))
  }
})
