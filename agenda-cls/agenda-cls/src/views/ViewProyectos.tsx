import { useState } from 'react'
import { useStore } from '../store/useStore'


const PROJ_COLORS = ['#2B5E3E','#1A5A8A','#8B4513','#6B2D8B','#8B1A4A','#1A7A54','#8B7A00','#5A2D8B','#1A6B8A']

export default function ViewProyectos() {
  const { data, filtroProy, setFiltroProy, toggleTarea, addTarea, addProyecto } = useStore()
  const [newProjName, setNewProjName] = useState('')
  const [showAddProj, setShowAddProj] = useState(false)
  const [projTasks, setProjTasks] = useState<Record<string, string>>({})

  let proyectos = data.proyectos
  if (filtroProy === 'activos') proyectos = proyectos.filter(p => data.tareas.some(t => t.proj === p.id && !t.done))
  if (filtroProy === 'completos') proyectos = proyectos.filter(p => {
    const ts = data.tareas.filter(t => t.proj === p.id)
    return ts.length > 0 && ts.every(t => t.done)
  })

  const handleAddProj = () => {
    if (!newProjName.trim()) return
    addProyecto(newProjName.trim(), PROJ_COLORS[data.proyectos.length % PROJ_COLORS.length])
    setNewProjName('')
    setShowAddProj(false)
  }

  const handleAddTask = (projId: string) => {
    const txt = projTasks[projId]?.trim()
    if (!txt) return
    addTarea(txt, projId, 'media')
    setProjTasks(prev => ({ ...prev, [projId]: '' }))
  }

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {[['todos','Todos'],['activos','Con pendientes'],['completos','Completos']].map(([f,l]) => (
          <button key={f} onClick={() => setFiltroProy(f as typeof filtroProy)}
            className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all
              ${filtroProy === f ? 'bg-accent border-accent text-white' : 'bg-surface border-edge-strong text-ink-2 hover:border-accent hover:text-accent'}`}>
            {l}
          </button>
        ))}
        <button onClick={() => setShowAddProj(!showAddProj)}
          className="ml-auto h-7 px-3 rounded-lg text-[11px] font-bold border border-edge-strong bg-surface text-ink-2 hover:border-accent hover:text-accent transition-all">
          + Proyecto
        </button>
      </div>

      {showAddProj && (
        <div className="flex gap-2 mb-5">
          <input autoFocus className="flex-1 h-9 px-3 bg-surface border border-accent rounded-[10px] text-[13px] text-ink outline-none"
            placeholder="Nombre del proyecto…" value={newProjName}
            onChange={e => setNewProjName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProj()} />
          <button onClick={handleAddProj} className="h-9 px-4 bg-accent text-white text-[12px] font-bold rounded-[10px]">Crear</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proyectos.map(p => {
          const tareas = data.tareas.filter(t => t.proj === p.id)
          const done = tareas.filter(t => t.done).length
          const pct = tareas.length ? Math.round(done / tareas.length * 100) : 0
          return (
            <div key={p.id} className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-edge">
                <div className="flex items-center gap-2 font-bold text-[14px] text-ink">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.nombre}
                </div>
                <div className="flex items-center gap-2">
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
                    onClick={() => toggleTarea(t.id)}
                    className={`flex items-start gap-2 px-5 py-1.5 hover:bg-surface-2 cursor-pointer transition-colors ${t.done ? 'opacity-55' : ''}`}>
                    <button className={`w-3.5 h-3.5 rounded-[3px] border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                      ${t.done ? 'bg-accent border-accent' : 'border-ink-4'}`}>
                      {t.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[12.5px] font-medium ${t.done ? 'line-through text-ink-3' : 'text-ink-2'}`}>{t.txt}</span>
                      {t.nota && <div className="text-[11px] text-ink-3 truncate">✎ {t.nota}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5 px-5 py-3 border-t border-edge">
                <input
                  className="flex-1 h-7 px-2.5 bg-surface-2 border border-edge-mid rounded-md text-[12px] text-ink outline-none focus:border-accent placeholder:text-ink-4"
                  placeholder="+ Agregar tarea…"
                  value={projTasks[p.id] || ''}
                  onChange={e => setProjTasks(prev => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask(p.id)}
                />
                <button onClick={() => handleAddTask(p.id)}
                  className="h-7 px-2.5 bg-accent-light text-accent text-[11px] font-bold rounded-md hover:bg-accent hover:text-white transition-all">
                  Agregar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
