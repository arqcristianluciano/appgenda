import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Prioridad } from '../types'

interface Props {
  task: { id: number; txt: string; proj: string | null; prio: Prioridad; fecha: string; nota: string }
  proyectos: { id: string; nombre: string; color: string }[]
  onSave: (id: number, fields: { txt: string; proj: string | null; prio: Prioridad; fecha: string; nota: string }) => void
  onClose: () => void
}

export default function EditTaskModal({ task, proyectos, onSave, onClose }: Props) {
  const [txt, setTxt] = useState(task.txt)
  const [proj, setProj] = useState(task.proj ?? '')
  const [prio, setPrio] = useState<Prioridad>(task.prio)
  const [fecha, setFecha] = useState(task.fecha)
  const [nota, setNota] = useState(task.nota)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSave = () => {
    if (!txt.trim()) return
    onSave(task.id, { txt: txt.trim(), proj: proj || null, prio, fecha, nota })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[60] backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-t-2xl sm:rounded-2xl px-4 pt-4 pb-5 w-full sm:max-w-md shadow-2xl border border-edge"
        style={{ marginBottom: 56 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2 shrink-0"><X size={18} /></button>
          <span className="text-[15px] font-extrabold text-ink truncate mx-2">Editar tarea</span>
          <button onClick={handleSave} className="text-[14px] font-bold text-accent hover:text-accent-2 shrink-0">Guardar</button>
        </div>

        <input ref={inputRef} className="h-10 w-full px-3 mb-2 bg-surface-2 border border-edge-mid rounded-lg text-[14px] text-ink outline-none focus:border-accent"
          placeholder="Nombre de la tarea…" value={txt} onChange={e => setTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()} />

        <div className="grid grid-cols-2 gap-2 mb-2">
          <select className="h-9 px-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
            value={proj} onChange={e => setProj(e.target.value)}>
            <option value="">Sin proyecto</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="h-9 px-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
            value={prio} onChange={e => setPrio(e.target.value as Prioridad)}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <input type="date" className="h-9 w-full px-3 mb-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
          value={fecha} onChange={e => setFecha(e.target.value)} />

        <textarea className="w-full px-3 py-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent resize-none min-h-[48px]"
          placeholder="Nota…" value={nota} onChange={e => setNota(e.target.value)} />
      </div>
    </div>
  )
}
