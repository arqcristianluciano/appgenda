import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useStore } from '../store/useStore'
import NotificationPicker from '../views/calendar/NotificationPicker'
import { scheduleNotification } from '../services/notifications'

interface Props {
  projId: string
}

export default function AddTaskForm({ projId }: Props) {
  const { addTarea, data } = useStore()
  const [txt, setTxt] = useState('')
  const [fecha, setFecha] = useState('')
  const [notificacion, setNotificacion] = useState('')
  const [expanded, setExpanded] = useState(false)

  const proyecto = data.proyectos.find(p => p.id === projId)

  const reset = () => {
    setTxt('')
    setFecha('')
    setNotificacion('')
    setExpanded(false)
  }

  const handleAdd = async () => {
    if (!txt.trim()) return
    addTarea(txt.trim(), projId, 'media', fecha, notificacion)
    if (notificacion && fecha) {
      const nextId = data.nextId
      await scheduleNotification(`tarea_${nextId}`, txt.trim(), notificacion)
    }
    reset()
  }

  const toggleExpand = () => {
    setExpanded(e => !e)
    if (expanded) { setFecha(''); setNotificacion('') }
  }

  return (
    <div className="px-5 py-3 border-t border-edge space-y-2">
      <div className="flex gap-1.5">
        <input
          className="flex-1 h-7 px-2.5 bg-surface-2 border border-edge-mid rounded-md text-[12px] text-ink outline-none focus:border-accent placeholder:text-ink-4"
          placeholder="+ Agregar tarea…"
          value={txt}
          onChange={e => setTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={toggleExpand}
          title="Agregar fecha"
          className={`h-7 w-7 flex items-center justify-center rounded-md border transition-all ${
            expanded
              ? 'bg-accent border-accent text-white'
              : 'bg-surface-2 border-edge-mid text-ink-3 hover:border-accent hover:text-accent'
          }`}
        >
          <CalendarDays size={13} />
        </button>
        <button
          onClick={handleAdd}
          className="h-7 px-2.5 bg-accent-light text-accent text-[11px] font-bold rounded-md hover:bg-accent hover:text-white transition-all"
        >
          Agregar
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 pt-1">
          <input
            type="date"
            className="h-8 w-full px-2.5 bg-surface-2 border border-edge-mid rounded-md text-[12px] text-ink outline-none focus:border-accent"
            value={fecha}
            onChange={e => { setFecha(e.target.value); setNotificacion('') }}
          />
          {fecha && (
            <div className="px-1">
              <NotificationPicker
                fecha={fecha}
                hora=""
                value={notificacion}
                onChange={setNotificacion}
              />
            </div>
          )}
          {fecha && proyecto && (
            <p className="text-[10.5px] text-ink-3">
              Aparecerá en el calendario bajo <span style={{ color: proyecto.color }} className="font-semibold">{proyecto.nombre}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
