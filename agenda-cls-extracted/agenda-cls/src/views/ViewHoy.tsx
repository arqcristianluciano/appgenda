import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Trash2, StickyNote, ChevronUp } from 'lucide-react'

const PRIO_COLORS = { alta: 'bg-red-100 text-red-700', media: 'bg-amber-100 text-amber-700', baja: 'bg-gray-100 text-gray-500' }

export default function ViewHoy() {
  const { data, filtroHoy, setFiltroHoy, toggleTarea, deleteTarea, addTarea, updateTareaNota } = useStore()
  const [newTxt, setNewTxt] = useState('')
  const [newProj, setNewProj] = useState('')
  const [newPrio, setNewPrio] = useState<'alta' | 'media' | 'baja'>('media')
  const [openNotes, setOpenNotes] = useState<Set<number>>(new Set())

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

  const toggleNote = (id: number) => {
    setOpenNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { val: pendientes, label: 'Pendientes', cls: '' },
          { val: alta, label: 'Alta prioridad', cls: 'text-red-600' },
          { val: hechas, label: 'Completadas', cls: 'text-[#2B5E3E]' },
          { val: `${pct}%`, label: 'Progreso', cls: '' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-black/[0.08] rounded-xl px-5 py-4 shadow-sm">
            <div className={`text-3xl font-extrabold tracking-tight leading-none ${s.cls}`}>{s.val}</div>
            <div className="text-[11px] text-gray-400 mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[['all','Todas'],['alta','Alta prioridad'],['pendiente','Pendientes'],['done','Completadas']].map(([f,l]) => (
          <button key={f} onClick={() => setFiltroHoy(f as typeof filtroHoy)}
            className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all
              ${filtroHoy === f ? 'bg-[#2B5E3E] border-[#2B5E3E] text-white' : 'bg-white border-black/[0.14] text-gray-500 hover:border-[#2B5E3E] hover:text-[#2B5E3E]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-1 mb-4">
        {filtered.map(t => {
          const proj = t.proj ? data.proyectos.find(p => p.id === t.proj) : null
          const noteOpen = openNotes.has(t.id)
          return (
            <div key={t.id}>
              <div className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-white border rounded-[10px] shadow-sm transition-all
                ${t.done ? 'opacity-45' : 'hover:border-black/20'}`}>
                <button
                  onClick={() => toggleTarea(t.id)}
                  className={`w-[18px] h-[18px] rounded-full border flex-shrink-0 flex items-center justify-center transition-all
                    ${t.done ? 'bg-[#2B5E3E] border-[#2B5E3E]' : 'border-gray-300 hover:border-[#2B5E3E]'}`}
                >
                  {t.done && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>

                <div className="flex-1 min-w-0">
                  <div className={`text-[13.5px] font-medium ${t.done ? 'line-through text-gray-400' : 'text-[#1C1A17]'}`}>{t.txt}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {proj && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: proj.color + '20', color: proj.color }}>{proj.nombre}</span>}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIO_COLORS[t.prio]}`}>{t.prio.charAt(0).toUpperCase() + t.prio.slice(1)}</span>
                    {t.nota && <span className="text-[11px] text-gray-400 truncate max-w-[200px]">✎ {t.nota}</span>}
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => toggleNote(t.id)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all
                      ${noteOpen || t.nota ? 'text-[#2B5E3E]' : 'text-gray-300 hover:text-gray-500'}`}>
                    {noteOpen ? <ChevronUp size={13} /> : <StickyNote size={13} />}
                  </button>
                  <button onClick={() => deleteTarea(t.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {noteOpen && (
                <div className="px-3.5 pb-2.5 pt-0 bg-white border border-t-0 rounded-b-[10px] -mt-1 shadow-sm">
                  <textarea
                    className="w-full text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 resize-none outline-none focus:border-[#2B5E3E] min-h-[36px]"
                    placeholder="Agregar nota…"
                    defaultValue={t.nota}
                    onBlur={e => updateTareaNota(t.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add task */}
      <div className="flex gap-2 flex-wrap">
        <input
          className="flex-1 min-w-[180px] h-9 px-3 bg-white border border-black/[0.14] rounded-[10px] text-[13px] text-gray-800 outline-none focus:border-[#2B5E3E] placeholder:text-gray-300"
          placeholder="Nueva tarea…"
          value={newTxt}
          onChange={e => setNewTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <select
          className="h-9 px-2 bg-white border border-black/[0.14] rounded-[10px] text-[12px] text-gray-500 outline-none"
          value={newProj}
          onChange={e => setNewProj(e.target.value)}
        >
          <option value="">Sin proyecto</option>
          {data.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select
          className="h-9 px-2 bg-white border border-black/[0.14] rounded-[10px] text-[12px] text-gray-500 outline-none"
          value={newPrio}
          onChange={e => setNewPrio(e.target.value as typeof newPrio)}
        >
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <button onClick={handleAdd}
          className="h-9 px-4 bg-[#2B5E3E] text-white text-[12px] font-bold rounded-[10px] hover:bg-[#3D7A54] transition-colors">
          + Agregar
        </button>
      </div>
    </div>
  )
}
