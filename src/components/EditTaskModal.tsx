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
      <div className="bg-surface rounded-t-2xl sm:rounded-2xl p-5 pb-5 mb-14 sm:mb-0 w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-edge" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-extrabold text-ink">Editar tarea</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-3 hover:bg-surface-2"><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 min-h-0">
          <input ref={inputRef} className="h-10 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[14px] text-ink outline-none focus:border-accent"
            placeholder="Nombre de la tarea…" value={txt} onChange={e => setTxt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />

          <div className="grid grid-cols-2 gap-2">
            <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
              value={proj} onChange={e => setProj(e.target.value)}>
              <option value="">Sin proyecto</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
              value={prio} onChange={e => setPrio(e.target.value as Prioridad)}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <input type="date" className="h-9 px-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
            value={fecha} onChange={e => setFecha(e.target.value)} />

          <textarea className="px-3 py-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent resize-none min-h-[64px]"
            placeholder="Nota…" value={nota} onChange={e => setNota(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end mt-4 shrink-0">
          <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-ink-2 border border-edge-mid rounded-lg hover:bg-surface-2">Cancelar</button>
          <button onClick={handleSave} className="h-9 px-5 text-[13px] font-bold bg-accent text-white rounded-lg hover:bg-accent-2">Guardar</button>
        </div>
      </div>
    </div>
  )
}
