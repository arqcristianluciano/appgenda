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
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {[['todos','Todos'],['activos','Con pendientes'],['completos','Completos']].map(([f,l]) => (
          <button key={f} onClick={() => setFiltroProy(f as typeof filtroProy)}
            className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all
              ${filtroProy === f ? 'bg-[#2B5E3E] border-[#2B5E3E] text-white' : 'bg-white border-black/[0.14] text-gray-500 hover:border-[#2B5E3E] hover:text-[#2B5E3E]'}`}>
            {l}
          </button>
        ))}
        <button onClick={() => setShowAddProj(!showAddProj)}
          className="ml-auto h-7 px-3 rounded-lg text-[11px] font-bold border border-black/[0.14] bg-white text-gray-600 hover:border-[#2B5E3E] hover:text-[#2B5E3E] transition-all">
          + Proyecto
        </button>
      </div>

      {showAddProj && (
        <div className="flex gap-2 mb-5">
          <input autoFocus className="flex-1 h-9 px-3 bg-white border border-[#2B5E3E] rounded-[10px] text-[13px] outline-none"
            placeholder="Nombre del proyecto…" value={newProjName}
            onChange={e => setNewProjName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProj()} />
          <button onClick={handleAddProj} className="h-9 px-4 bg-[#2B5E3E] text-white text-[12px] font-bold rounded-[10px]">Crear</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proyectos.map(p => {
          const tareas = data.tareas.filter(t => t.proj === p.id)
          const done = tareas.filter(t => t.done).length
          const pct = tareas.length ? Math.round(done / tareas.length * 100) : 0
          return (
            <div key={p.id} className="bg-white border border-black/[0.08] rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
                <div className="flex items-center gap-2 font-bold text-[14px] text-[#1C1A17]">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.nombre}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-serif italic text-lg text-gray-400">{pct}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-[3px] bg-gray-100">
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: p.color }} />
              </div>

              {/* Tasks */}
              <div className="py-1">
                {tareas.length === 0 ? (
                  <div className="px-5 py-3 text-[12px] text-gray-300">Sin tareas</div>
                ) : tareas.map(t => (
                  <div key={t.id}
                    onClick={() => toggleTarea(t.id)}
                    className={`flex items-start gap-2 px-5 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors ${t.done ? 'opacity-55' : ''}`}>
                    <button className={`w-3.5 h-3.5 rounded-[3px] border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                      ${t.done ? 'bg-[#2B5E3E] border-[#2B5E3E]' : 'border-gray-300'}`}>
                      {t.done && <svg width="7" height="5" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[12.5px] font-medium ${t.done ? 'line-through text-gray-400' : 'text-gray-600'}`}>{t.txt}</span>
                      {t.nota && <div className="text-[11px] text-gray-400 truncate">✎ {t.nota}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add task */}
              <div className="flex gap-1.5 px-5 py-3 border-t border-black/[0.06]">
                <input
                  className="flex-1 h-7 px-2.5 bg-gray-50 border border-gray-200 rounded-md text-[12px] outline-none focus:border-[#2B5E3E] placeholder:text-gray-300"
                  placeholder="+ Agregar tarea…"
                  value={projTasks[p.id] || ''}
                  onChange={e => setProjTasks(prev => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask(p.id)}
                />
                <button onClick={() => handleAddTask(p.id)}
                  className="h-7 px-2.5 bg-[#E8F2EC] text-[#2B5E3E] text-[11px] font-bold rounded-md hover:bg-[#2B5E3E] hover:text-white transition-all">
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
