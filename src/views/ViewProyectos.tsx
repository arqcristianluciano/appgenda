import { useState, useRef } from 'react'
import { Pencil, CalendarDays, Eye, EyeOff, GripVertical } from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store/useStore'
import { useCalendarStore } from '../store/useCalendarStore'
import { useTeamStore } from '../store/useTeamStore'
import EditTaskModal from '../components/EditTaskModal'
import AddTaskForm from '../components/AddTaskForm'
import ProjectFiles from './proyectos/ProjectFiles'
import ScopeFilter, { useScopeFilter } from '../components/ScopeFilter'
import MemberSelector from '../components/MemberSelector'
import MemberAvatar from '../components/MemberAvatar'
import { useCanEdit } from '../hooks/useCanEdit'
import type { Tarea, Evento, Profile } from '../types'

function formatEventDate(ev: Evento): string {
  const [y, m, d] = ev.fecha.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const label = fecha.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })
  if (ev.allDay) return label
  return ev.hora ? `${label} · ${ev.hora}${ev.horaFin ? `–${ev.horaFin}` : ''}` : label
}

const PROJ_COLORS = ['#2B5E3E','#1A5A8A','#8B4513','#6B2D8B','#8B1A4A','#1A7A54','#8B7A00','#5A2D8B','#1A6B8A']

export default function ViewProyectos() {
  const { data, filtroProy, setFiltroProy, toggleTarea, toggleEvento, addProyecto, updateTarea, updateProyecto, reorderTareas, addArchivoProyecto, removeArchivoProyecto } = useStore()
  const { openModal } = useCalendarStore()
  const { members, teams, activeTeamId } = useTeamStore()
  const canEdit = useCanEdit()
  const scopedProyectos = useScopeFilter(data.proyectos)
  const [newProjName, setNewProjName] = useState('')
  const [newProjAssignee, setNewProjAssignee] = useState<string | null>(null)
  const [showAddProj, setShowAddProj] = useState(false)
  const [editingTask, setEditingTask] = useState<Tarea | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [editingProjId, setEditingProjId] = useState<string | null>(null)
  const [editingProjName, setEditingProjName] = useState('')
  const projNameInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    reorderTareas(String(active.id), String(over.id))
  }

  let proyectos = scopedProyectos

  if (filtroProy === 'activos') proyectos = proyectos.filter(p => data.tareas.some(t => t.proj === p.id && !t.done))
  if (filtroProy === 'completos') proyectos = proyectos.filter(p => {
    const ts = data.tareas.filter(t => t.proj === p.id)
    return ts.length > 0 && ts.every(t => t.done)
  })

  const activeTeam = teams.find(t => t.id === activeTeamId)

  const handleAddProj = () => {
    if (!newProjName.trim()) return
    const color = PROJ_COLORS[data.proyectos.length % PROJ_COLORS.length]
    addProyecto(newProjName.trim(), color, newProjAssignee)
    setNewProjName('')
    setNewProjAssignee(null)
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

  const getMemberProfile = (userId: string | null | undefined) => {
    if (!userId) return null
    return members.find(m => m.userId === userId)?.profile ?? null
  }

  return (
    <div>
      <div className="sticky -top-5 z-10 flex flex-col gap-2 mb-5 pt-5 pb-3 -mt-5 bg-surface-bg shadow-[0_4px_6px_-1px_var(--edge)]">
        <ScopeFilter />
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
          <input autoFocus enterKeyHint="done" autoCapitalize="sentences" className="w-full h-9 px-3 bg-surface-2 border border-edge rounded-lg text-[13px] text-ink outline-none focus:border-accent"
            placeholder="Nombre del grupo…" value={newProjName}
            onChange={e => setNewProjName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProj()} />
          {members.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-ink-2 block mb-1">Asignar a miembro</label>
              <MemberSelector value={newProjAssignee} onChange={setNewProjAssignee} />
            </div>
          )}
          {activeTeam && (
            <div className="text-[11px] text-ink-3">
              Se creará en el equipo <span className="font-semibold text-ink-2">{activeTeam.name}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAddProj(false); setNewProjAssignee(null) }}
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
          const todasTareas = data.tareas
            .filter(t => t.proj === p.id)
            .sort((a, b) => Number(a.done) - Number(b.done))
          const done = todasTareas.filter(t => t.done).length
          const pct = todasTareas.length ? Math.round(done / todasTareas.length * 100) : 0
          const tareas = hideCompleted ? todasTareas.filter(t => !t.done) : todasTareas
          const eventos = data.eventos
            .filter(e => e.proj === p.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
          const projTeam = teams.find(t => t.id === p.teamId)
          const projAssignee = getMemberProfile(p.assigneeId)
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
                  {projTeam && (
                    <span className="h-5 px-2 rounded bg-purple-500/15 text-purple-400 text-[10px] font-medium flex items-center gap-1">
                      {projTeam.name}
                    </span>
                  )}
                  {projAssignee && <MemberAvatar profile={projAssignee} size={22} />}
                  {canEdit && !projAssignee && members.length > 0 && (
                    <MemberSelector
                      value={p.assigneeId}
                      onChange={uid => updateProyecto(p.id, { assigneeId: uid })}
                      compact
                    />
                  )}
                  {canEdit && editingProjId !== p.id && (
                    <button
                      type="button"
                      aria-label="Editar nombre del grupo"
                      title="Editar nombre del grupo"
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
                ) : (() => {
                  const pendientes = tareas.filter(t => !t.done)
                  const hechas = tareas.filter(t => t.done)
                  return (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={pendientes.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <LayoutGroup id={`proj-${p.id}`}>
                          <AnimatePresence initial={false}>
                            {pendientes.map(t => (
                              <TaskItem
                                key={t.id}
                                task={t}
                                draggable
                                canEdit={canEdit}
                                assignee={getMemberProfile(t.assigneeId)}
                                hasMembers={members.length > 0}
                                onToggle={() => canEdit && toggleTarea(t.id)}
                                onEdit={() => setEditingTask(t)}
                                onAssign={uid => updateTarea(t.id, { assigneeId: uid })}
                              />
                            ))}
                          </AnimatePresence>
                          {pendientes.length > 0 && hechas.length > 0 && (
                            <motion.div
                              key={`divider-${p.id}`}
                              layout
                              className="flex items-center gap-2 px-5 py-1.5 mt-1"
                            >
                              <div className="flex-1 h-px bg-edge" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                                Hechas · {hechas.length}
                              </span>
                              <div className="flex-1 h-px bg-edge" />
                            </motion.div>
                          )}
                          <AnimatePresence initial={false}>
                            {hechas.map(t => (
                              <TaskItem
                                key={t.id}
                                task={t}
                                draggable={false}
                                canEdit={canEdit}
                                assignee={getMemberProfile(t.assigneeId)}
                                hasMembers={members.length > 0}
                                onToggle={() => canEdit && toggleTarea(t.id)}
                                onEdit={() => setEditingTask(t)}
                                onAssign={uid => updateTarea(t.id, { assigneeId: uid })}
                              />
                            ))}
                          </AnimatePresence>
                        </LayoutGroup>
                      </SortableContext>
                    </DndContext>
                  )
                })()}
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
                        type="button"
                        aria-label={ev.done ? 'Marcar evento como pendiente' : 'Marcar evento como completado'}
                        title={ev.done ? 'Marcar evento como pendiente' : 'Marcar evento como completado'}
                        onClick={(e) => { e.stopPropagation(); if (canEdit) toggleEvento(ev.id) }}
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

interface TaskItemProps {
  task: Tarea
  draggable: boolean
  canEdit: boolean
  assignee: Profile | null
  hasMembers: boolean
  onToggle: () => void
  onEdit: () => void
  onAssign: (uid: string | null) => void
}

function TaskItem({ task, draggable, canEdit, assignee, hasMembers, onToggle, onEdit, onAssign }: TaskItemProps) {
  const sort = useSortable({ id: task.id, disabled: !draggable || !canEdit })
  const dragStyle = draggable
    ? {
        transform: CSS.Transform.toString(sort.transform),
        transition: sort.transition,
        opacity: sort.isDragging ? 0.5 : undefined,
        zIndex: sort.isDragging ? 50 : undefined,
        position: sort.isDragging ? ('relative' as const) : undefined,
      }
    : undefined

  return (
    <motion.div
      ref={draggable ? sort.setNodeRef : undefined}
      style={dragStyle}
      layoutId={task.id}
      layout={!sort.isDragging}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`group flex items-start gap-1 px-5 py-1.5 hover:bg-surface-2 transition-colors ${task.done ? 'opacity-55' : ''}`}
    >
      {draggable && canEdit ? (
        <button
          type="button"
          {...sort.attributes}
          {...sort.listeners}
          aria-label="Arrastrar para reordenar"
          title="Arrastrar para reordenar"
          className="touch-none cursor-grab active:cursor-grabbing text-ink-4 hover:text-ink-2 mt-0.5 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={12} />
        </button>
      ) : (
        <span className="w-3 flex-shrink-0" aria-hidden />
      )}
      <button
        type="button"
        aria-label={task.done ? 'Marcar tarea como pendiente' : 'Marcar tarea como completada'}
        title={task.done ? 'Marcar tarea como pendiente' : 'Marcar tarea como completada'}
        onClick={onToggle}
        className={`w-3.5 h-3.5 rounded-[3px] border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
          ${task.done ? 'bg-accent border-accent' : 'border-ink-4'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {task.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-[12.5px] font-medium ${task.done ? 'line-through text-ink-3' : 'text-ink-2'}`}>{task.txt}</span>
        {task.nota && <div className="text-[11px] text-ink-3 truncate">✎ {task.nota}</div>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {assignee && <MemberAvatar profile={assignee} size={18} />}
        {canEdit && !assignee && hasMembers && (
          <MemberSelector
            value={task.assigneeId}
            onChange={onAssign}
            compact
          />
        )}
        {canEdit && (
          <button
            type="button"
            aria-label="Editar tarea"
            title="Editar tarea"
            onClick={onEdit}
            className="lg:opacity-0 lg:group-hover:opacity-100 w-6 h-6 lg:w-5 lg:h-5 flex items-center justify-center rounded text-ink-3 hover:text-accent hover:bg-surface-3 transition-all"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
