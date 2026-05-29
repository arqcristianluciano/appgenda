import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Prioridad } from '../types'

/** Alta rápida de tarea — abierta desde el FAB móvil o el app shortcut. */
export default function QuickAddTask({ onClose }: { onClose: () => void }) {
  const { data, addTarea } = useStore()
  const [txt, setTxt] = useState('')
  const [proj, setProj] = useState('')
  const [prio, setPrio] = useState<Prioridad>('media')

  const add = () => {
    if (!txt.trim()) return
    addTarea(txt.trim(), proj || null, prio)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 pb-safe">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[460px] bg-surface rounded-2xl shadow-2xl p-5 cal-modal-in">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-ink">Nueva tarea</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-ink-3 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <input
          autoFocus
          enterKeyHint="done"
          autoCapitalize="sentences"
          className="input-field mb-2"
          placeholder="¿Qué hay que hacer?"
          value={txt}
          onChange={e => setTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <div className="flex gap-2 mb-4">
          <select className="input-field flex-1" value={proj} onChange={e => setProj(e.target.value)}>
            <option value="">Sin proyecto</option>
            {data.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="input-field flex-1" value={prio} onChange={e => setPrio(e.target.value as Prioridad)}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <button onClick={add} className="w-full h-11 bg-accent text-white font-bold rounded-xl active:bg-accent-2 transition-colors">
          Agregar tarea
        </button>
      </div>
    </div>
  )
}
