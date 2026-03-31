import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Trash2, Pencil, CalendarDays } from 'lucide-react'
import EditTaskModal from '../components/EditTaskModal'
import type { Prioridad, Tarea } from '../types'

const PRIO_COLORS = {
  alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  baja: 'bg-surface-3 text-ink-2',
}

export default function ViewHoy() {
  const { data, filtroHoy, setFiltroHoy, toggleTarea, deleteTarea, addTarea, updateTarea } = useStore()
  const [newTxt, setNewTxt] = useState('')
  const [newProj, setNewProj] = useState('')
  const [newPrio, setNewPrio] = useState<Prioridad>('media')
  const [editingTask, setEditingTask] = useState<Tarea | null>(null)

  const pendientes = data.tareas.filter(t => !t.done).length
  const alta = data.tareas.filter(t => !t.done && t.prio === 'alta').length
  const hechas = data.tareas.filter(t => t.done).length
  const pct = data.tareas.length ? Math.round(hechas / data.tareas.length * 100) : 0

  let filtered = [...data.tareas]
  if (filtroHoy === 'alta') filtered = filtered.filter(t => !t.done && t.prio === 'alta')
  else if (filtroHoy === 'pendiente') filtered = filtered.filter(t => !t.done)
  else if (filtroHoy === 'done') filtered = filtered.filter(t => t.done)

  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const o = { alta: 0, media: 1, baja: 2 }
    return o[a.prio] - o[b.prio]
  })

  const handleAdd = () => {
    if (!newTxt.trim()) return
    addTarea(newTxt.trim(), newProj || null, newPrio)
    setNewTxt('')
  }

  const handleSaveEdit = (id: number, fields: { txt: string; proj: string | null; prio: Prioridad; fecha: string; nota: string; notificacion: string }) => {
    updateTarea(id, fields)
  }

  return (
    <div>
      <Stats pendientes={pendientes} alta={alta} hechas={hechas} pct={pct} />
      <Filters filtroHoy={filtroHoy} setFiltroHoy={setFiltroHoy} />

      <div className="flex flex-col gap-1 mb-4">
        {filtered.map(t => {
          const proj = t.proj ? data.proyectos.find(p => p.id === t.proj) : null
          return (
            <div key={t.id} className={`group flex items-center gap-2.5 px-3.5 py-2.5 bg-surface border border-edge rounded-[10px] shadow-sm transition-all
              ${t.done ? 'opacity-45' : 'hover:border-edge-strong'}`}>
              <button
                onClick={() => toggleTarea(t.id)}
                className={`w-[18px] h-[18px] rounded-full border flex-shrink-0 flex items-center justify-center transition-all
                  ${t.done ? 'bg-accent border-accent' : 'border-ink-4 hover:border-accent'}`}
              >
                {t.done && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditingTask(t)}>
                <div className={`text-[13.5px] font-medium ${t.done ? 'line-through text-ink-3' : 'text-ink'}`}>{t.txt}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {proj && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: proj.color + '20', color: proj.color }}>{proj.nombre}</span>}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIO_COLORS[t.prio]}`}>{t.prio.charAt(0).toUpperCase() + t.prio.slice(1)}</span>
                  {t.fecha && <span className="text-[10px] text-ink-3 flex items-center gap-0.5"><CalendarDays size={10} />{t.fecha}</span>}
                  {t.nota && <span className="text-[11px] text-ink-3 truncate max-w-[200px]">✎ {t.nota}</span>}
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditingTask(t)}
                  className="w-7 h-7 lg:w-6 lg:h-6 rounded flex items-center justify-center text-ink-4 lg:opacity-0 lg:group-hover:opacity-100 hover:text-accent hover:bg-accent-pale transition-all">
                  <Pencil size={13} />
                </button>
                <button onClick={() => { if (confirm('¿Eliminar esta tarea?')) deleteTarea(t.id) }}
                  className="w-7 h-7 lg:w-6 lg:h-6 rounded flex items-center justify-center text-ink-4 lg:opacity-0 lg:group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <AddRow
        newTxt={newTxt} setNewTxt={setNewTxt}
        newProj={newProj} setNewProj={setNewProj}
        newPrio={newPrio} setNewPrio={setNewPrio}
        proyectos={data.proyectos}
        onAdd={handleAdd}
      />

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          proyectos={data.proyectos}
          onSave={handleSaveEdit}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

function Stats({ pendientes, alta, hechas, pct }: { pendientes: number; alta: number; hechas: number; pct: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {[
        { val: pendientes, label: 'Pendientes', cls: '' },
        { val: alta, label: 'Alta prioridad', cls: 'text-red-600 dark:text-red-400' },
        { val: hechas, label: 'Completadas', cls: 'text-accent' },
        { val: `${pct}%`, label: 'Progreso', cls: '' },
      ].map(s => (
        <div key={s.label} className="bg-surface border border-edge rounded-xl px-5 py-4 shadow-sm">
          <div className={`text-3xl font-extrabold tracking-tight leading-none ${s.cls}`}>{s.val}</div>
          <div className="text-[11px] text-ink-3 mt-1 font-medium">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function Filters({ filtroHoy, setFiltroHoy }: { filtroHoy: string; setFiltroHoy: (f: 'all' | 'alta' | 'pendiente' | 'done') => void }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {([['all','Todas'],['alta','Alta prioridad'],['pendiente','Pendientes'],['done','Completadas']] as const).map(([f,l]) => (
        <button key={f} onClick={() => setFiltroHoy(f)}
          className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all
            ${filtroHoy === f ? 'bg-accent border-accent text-white' : 'bg-surface border-edge-strong text-ink-2 hover:border-accent hover:text-accent'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

function AddRow({ newTxt, setNewTxt, newProj, setNewProj, newPrio, setNewPrio, proyectos, onAdd }: {
  newTxt: string; setNewTxt: (v: string) => void
  newProj: string; setNewProj: (v: string) => void
  newPrio: Prioridad; setNewPrio: (v: Prioridad) => void
  proyectos: { id: string; nombre: string; color: string }[]
  onAdd: () => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <input
        className="flex-1 min-w-[180px] h-9 px-3 bg-surface border border-edge-strong rounded-[10px] text-[13px] text-ink outline-none focus:border-accent placeholder:text-ink-4"
        placeholder="Nueva tarea…"
        value={newTxt}
        onChange={e => setNewTxt(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
      />
      <select
        className="h-9 px-2 bg-surface border border-edge-strong rounded-[10px] text-[12px] text-ink-2 outline-none"
        value={newProj}
        onChange={e => setNewProj(e.target.value)}
      >
        <option value="">Sin proyecto</option>
        {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <select
        className="h-9 px-2 bg-surface border border-edge-strong rounded-[10px] text-[12px] text-ink-2 outline-none"
        value={newPrio}
        onChange={e => setNewPrio(e.target.value as Prioridad)}
      >
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      <button onClick={onAdd}
        className="h-9 px-4 bg-accent text-white text-[12px] font-bold rounded-[10px] hover:bg-accent-2 transition-colors">
        + Agregar
      </button>
    </div>
  )
}
