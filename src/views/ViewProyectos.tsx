import { useState, useRef } from 'react'
import { Pencil, CalendarDays, Eye, EyeOff, User, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useCalendarStore } from '../store/useCalendarStore'
import EditTaskModal from '../components/EditTaskModal'
import AddTaskForm from '../components/AddTaskForm'
import ProjectFiles from './proyectos/ProjectFiles'
import ScopeFilter, { useScopeFilter } from '../components/ScopeFilter'
import { useCanEdit } from '../hooks/useCanEdit'
import type { Tarea, Evento, AsignacionTipo, FiltroAsignacion } from '../types'

function formatEventDate(ev: Evento): string {
  const [y, m, d] = ev.fecha.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const label = fecha.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })
  if (ev.allDay) return label
  return ev.hora ? `${label} · ${ev.hora}${ev.horaFin ? `–${ev.horaFin}` : ''}` : label
}

const PROJ_COLORS = ['#2B5E3E','#1A5A8A','#8B4513','#6B2D8B','#8B1A4A','#1A7A54','#8B7A00','#5A2D8B','#1A6B8A']

export default function ViewProyectos() {
  const { data, filtroProy, setFiltroProy, toggleTarea, toggleEvento, addProyecto, updateTarea, updateProyecto, addArchivoProyecto, removeArchivoProyecto } = useStore()
  const { openModal } = useCalendarStore()
  const canEdit = useCanEdit()
  const scopedProyectos = useScopeFilter(data.proyectos)
  const [filtroAsignacion, setFiltroAsignacion] = useState<FiltroAsignacion>('todos')
  const [newProjName, setNewProjName] = useState('')
  const [newProjAssignType, setNewProjAssignType] = useState<AsignacionTipo | ''>('')
  const [newProjAssignName, setNewProjAssignName] = useState('')
  const [showAddProj, setShowAddProj] = useState(false)
  const [editingTask, setEditingTask] = useState<Tarea | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [editingProjId, setEditingProjId] = useState<string | null>(null)
  const [editingProjName, setEditingProjName] = useState('')
  const projNameInputRef = useRef<HTMLInputElement>(null)

  let proyectos = scopedProyectos

  if (filtroAsignacion === 'personal') proyectos = proyectos.filter(p => p.assignType === 'personal')
  if (filtroAsignacion === 'equipo') proyectos = proyectos.filter(p => p.assignType === 'equipo')

  if (filtroProy === 'activos') proyectos = proyectos.filter(p => data.tareas.some(t => t.proj === p.id && !t.done))
  if (filtroProy === 'completos') proyectos = proyectos.filter(p => {
    const ts = data.tareas.filter(t => t.proj === p.id)
    return ts.length > 0 && ts.every(t => t.done)
  })

  const handleAddProj = () => {
    if (!newProjName.trim()) return
    const color = PROJ_COLORS[data.proyectos.length % PROJ_COLORS.length]
    const assignType = newProjAssignType || undefined
    const assignName = newProjAssignName.trim() || undefined
    addProyecto(newProjName.trim(), color, assignType, assignName)
    setNewProjName('')
    setNewProjAssignType('')
    setNewProjAssignName('')
    setShowAddProj(false)
  }

  const startEditProj = (id: string, nombre: string) => {
    setEditingProjId(id)
    setEditingProjName(nombre)
    setTimeout(() => projNameInputRef.current?.select(), 0)
  }

  const commitEditProj = () => {
    if (editingProjId && editingProjName.trim()) {
      updateProyecto(editingProjId, { nombre: editingProjName.trim() })
    }
    setEditingProjId(null)
  }

  return (
    <div>
      <div className="sticky -top-5 z-10 flex flex-col gap-2 mb-5 pt-5 pb-3 -mt-5 bg-surface-bg shadow-[0_4px_6px_-1px_var(--edge)]">
        <ScopeFilter />
        <div className="flex items-center gap-1 mb-1">
          {([['todos', 'Todos'], ['personal', 'Personal'], ['equipo', 'Equipo']] as [FiltroAsignacion, string][]).map(([f, l]) => (
            <button key={f} onClick={() => setFiltroAsignacion(f)}
              className={`h-7 px-3 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5
                ${filtroAsignacion === f
                  ? 'bg-accent text-white'
                  : 'text-ink-3 hover:text-ink-2 hover:bg-surface-2'}`}>
              {f === 'personal' && <User size={11} />}
              {f === 'equipo' && <Users size={11} />}
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        {[['todos','Todos'],['activos','Con pendientes'],['completos','Completos']].map(([f,l]) => (
          <button key={f} onClick={() => setFiltroProy(f as typeof filtroProy)}
            className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all
              ${filtroProy === f ? 'bg-accent border-accent text-white' : 'bg-surface border-edge-strong text-ink-2 hover:border-accent hover:text-accent'}`}>
            {l}
          </button>
        ))}
        <button
          onClick={() => setHideCompleted(v => !v)}
          className={`h-7 px-3 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition-all
            ${hideCompleted
              ? 'bg-accent border-accent text-white'
              : 'bg-surface-3 border-edge-mid text-ink-2 hover:text-ink'}`}
        >
          {hideCompleted ? <EyeOff size={12} /> : <Eye size={12} />}
          {hideCompleted ? 'Mostrar hechas' : 'Ocultar hechas'}
        </button>
        {canEdit && (
          <button onClick={() => setShowAddProj(!showAddProj)}
            className="ml-auto h-7 px-3 rounded-lg text-[11px] font-bold border border-edge-strong bg-surface text-ink-2 hover:border-accent hover:text-accent transition-all">
            + Nuevo Grupo de Tareas
          </button>
        )}
        </div>
      </div>

      {showAddProj && (
        <div className="mb-5 p-4 bg-surface border border-accent/30 rounded-xl space-y-3">
          <input autoFocus className="w-full h-9 px-3 bg-surface-2 border border-edge rounded-lg text-[13px] text-ink outline-none focus:border-accent"
            placeholder="Nombre del grupo…" value={newProjName}
            onChange={e => setNewProjName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProj()} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-3 font-medium">Asignar a:</span>
            <button onClick={() => setNewProjAssignType(newProjAssignType === 'personal' ? '' : 'personal')}
              className={`h-7 px-3 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all
                ${newProjAssignType === 'personal' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-surface-2 border-edge text-ink-3 hover:border-blue-400'}`}>
              <User size={11} /> Persona
            </button>
            <button onClick={() => setNewProjAssignType(newProjAssignType === 'equipo' ? '' : 'equipo')}
              className={`h-7 px-3 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all
                ${newProjAssignType === 'equipo' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-surface-2 border-edge text-ink-3 hover:border-purple-400'}`}>
              <Users size={11} /> Equipo
            </button>
          </div>
          {newProjAssignType && (
            <input className="w-full h-8 px-3 bg-surface-2 border border-edge rounded-lg text-[12px] text-ink outline-none focus:border-accent"
              placeholder={newProjAssignType === 'personal' ? 'Nombre de la persona…' : 'Nombre del equipo…'}
              value={newProjAssignName}
              onChange={e => setNewProjAssignName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddProj()} />
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAddProj(false); setNewProjAssignType(''); setNewProjAssignName('') }}
              className="h-8 px-3 text-[12px] text-ink-3 hover:text-ink rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleAddProj}
              className="h-8 px-4 bg-accent text-white text-[12px] font-bold rounded-lg hover:bg-accent/90 transition-colors">Crear</button>
          </div>
        </div>
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          proyectos={data.proyectos}
          onSave={(id, fields) => updateTarea(id, fields as Parameters<typeof updateTarea>[1])}
          onClose={() => setEditingTask(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proyectos.map(p => {
          const todasTareas = data.tareas.filter(t => t.proj === p.id)
          const done = todasTareas.filter(t => t.done).length
          const pct = todasTareas.length ? Math.round(done / todasTareas.length * 100) : 0
          const tareas = hideCompleted ? todasTareas.filter(t => !t.done) : todasTareas
          const eventos = data.eventos
            .filter(e => e.proj === p.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
          return (
            <div key={p.id} id={`proj-${p.id}`} className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
              <div className="group/header flex items-center justify-between px-5 py-3.5 border-b border-edge">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  {editingProjId === p.id ? (
                    <input
                      ref={projNameInputRef}
                      className="flex-1 min-w-0 font-bold text-[14px] text-ink bg-surface-2 border border-accent rounded px-1.5 py-0.5 outline-none"
                      value={editingProjName}
                      onChange={e => setEditingProjName(e.target.value)}
                      onBlur={commitEditProj}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditProj(); if (e.key === 'Escape') setEditingProjId(null) }}
                    />
                  ) : (
                    <span
                      className="font-bold text-[14px] text-ink truncate cursor-text"
                      onClick={() => startEditProj(p.id, p.nombre)}>
                      {p.nombre}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.assignType && (
                    <span className={`h-5 px-2 rounded text-[10px] font-medium flex items-center gap-1 ${
                      p.assignType === 'personal' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                    }`}>
                      {p.assignType === 'personal' ? <User size={10} /> : <Users size={10} />}
                      {p.assignName || (p.assignType === 'personal' ? 'Personal' : 'Equipo')}
                    </span>
                  )}
                  {canEdit && editingProjId !== p.id && (
                    <button
                      onClick={() => startEditProj(p.id, p.nombre)}
                      className="lg:opacity-0 lg:group-hover/header:opacity-100 w-6 h-6 lg:w-5 lg:h-5 flex items-center justify-center rounded text-ink-3 hover:text-accent hover:bg-surface-3 transition-all">
                      <Pencil size={11} />
                    </button>
                  )}
                  <span className="font-serif italic text-lg text-ink-3">{pct}%</span>
                </div>
              </div>

              <div className="h-[3px] bg-surface-3">
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: p.color }} />
              </div>

              <div className="py-1">
                {tareas.length === 0 ? (
                  <div className="px-5 py-3 text-[12px] text-ink-4">Sin tareas</div>
                ) : tareas.map(t => (
                  <div key={t.id}
                    className={`group flex items-start gap-2 px-5 py-1.5 hover:bg-surface-2 transition-colors ${t.done ? 'opacity-55' : ''}`}>
                    <button
                      onClick={() => canEdit && toggleTarea(t.id)}
                      className={`w-3.5 h-3.5 rounded-[3px] border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                        ${t.done ? 'bg-accent border-accent' : 'border-ink-4'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}>
                      {t.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[12.5px] font-medium ${t.done ? 'line-through text-ink-3' : 'text-ink-2'}`}>{t.txt}</span>
                      {t.nota && <div className="text-[11px] text-ink-3 truncate">✎ {t.nota}</div>}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setEditingTask(t)}
                        className="lg:opacity-0 lg:group-hover:opacity-100 flex-shrink-0 w-6 h-6 lg:w-5 lg:h-5 flex items-center justify-center rounded text-ink-3 hover:text-accent hover:bg-surface-3 transition-all">
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {eventos.length > 0 && (
                <div className="border-t border-edge">
                  <div className="flex items-center gap-1.5 px-5 pt-2.5 pb-1">
                    <CalendarDays size={11} className="text-ink-3" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Calendario</span>
                  </div>
                  {eventos.map(ev => (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-2 px-5 py-1.5 hover:bg-surface-2 transition-colors group ${ev.done ? 'opacity-55' : ''}`}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); canEdit && toggleEvento(ev.id) }}
                        className={`w-3.5 h-3.5 rounded-[3px] border flex-shrink-0 flex items-center justify-center transition-all
                          ${ev.done ? 'bg-accent border-accent' : 'border-ink-4 hover:border-accent'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {ev.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <button
                        onClick={() => openModal(ev.fecha, ev.hora, ev)}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left"
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ev.color || p.color }} />
                        <div className="flex-1 min-w-0">
                          <span className={`text-[12px] font-medium truncate block ${ev.done ? 'line-through text-ink-3' : 'text-ink-2'}`}>{ev.titulo}</span>
                          <span className="text-[10.5px] text-ink-3">{formatEventDate(ev)}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {canEdit && <AddTaskForm projId={p.id} />}
              <ProjectFiles
                projectId={p.id}
                archivos={p.archivos ?? []}
                onAdd={a => addArchivoProyecto(p.id, a)}
                onRemove={id => removeArchivoProyecto(p.id, id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
