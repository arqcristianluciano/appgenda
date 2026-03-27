import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'

const COLORS = ['#2B5E3E', '#1A5A8A', '#8B4513', '#6B2D8B', '#8B1A4A', '#D97706', '#DC2626', '#0891B2']

function addHour(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function EventModal() {
  const { addEvento, updateEvento, deleteEvento } = useStore()
  const { selectedEvent, modalDate, modalHora, closeModal } = useCalendarStore()

  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [nota, setNota] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState(COLORS[0])

  const isEdit = !!selectedEvent
  const isExternal = selectedEvent?.source === 'google' || selectedEvent?.source === 'icloud'

  useEffect(() => {
    if (selectedEvent) {
      setTitulo(selectedEvent.titulo); setFecha(selectedEvent.fecha)
      setHora(selectedEvent.hora); setHoraFin(selectedEvent.horaFin || '')
      setNota(selectedEvent.nota); setAllDay(!!selectedEvent.allDay)
      setColor(selectedEvent.color || COLORS[0])
    } else {
      setFecha(modalDate); setHora(modalHora)
      setHoraFin(modalHora ? addHour(modalHora) : '')
    }
  }, [selectedEvent, modalDate, modalHora])

  const save = () => {
    if (!titulo.trim() || !fecha) return
    const h = allDay ? '' : hora
    const hf = allDay ? '' : horaFin
    if (isEdit && !isExternal) {
      updateEvento(selectedEvent!.id, { titulo: titulo.trim(), fecha, hora: h, horaFin: hf, nota, allDay, color })
    } else if (!isEdit) {
      addEvento(titulo.trim(), fecha, h, nota, hf, allDay, color)
    }
    closeModal()
  }

  const remove = () => {
    if (selectedEvent && !isExternal) deleteEvento(selectedEvent.id)
    closeModal()
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative bg-surface border border-edge rounded-2xl shadow-xl w-full max-w-md p-5 animate-in" onKeyDown={onKey}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-ink">{isEdit ? 'Editar evento' : 'Nuevo evento'}</h3>
          <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-ink-3">
            <X size={16} />
          </button>
        </div>

        {isExternal && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[12px] text-blue-700 dark:text-blue-300 font-medium">
            Evento de {selectedEvent?.source === 'google' ? 'Google Calendar' : 'iCloud'} — solo lectura
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <input className="input-field text-[15px] font-medium" placeholder="Título del evento…"
            value={titulo} onChange={e => setTitulo(e.target.value)} readOnly={isExternal} autoFocus />
          <input type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} readOnly={isExternal} />

          <label className="flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer select-none">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}
              disabled={isExternal} className="w-4 h-4 rounded accent-[var(--accent)]" />
            Todo el día
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-ink-3 mb-1 block">Inicio</label>
                <input type="time" className="input-field" value={hora} onChange={e => setHora(e.target.value)} readOnly={isExternal} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-3 mb-1 block">Fin</label>
                <input type="time" className="input-field" value={horaFin} onChange={e => setHoraFin(e.target.value)} readOnly={isExternal} />
              </div>
            </div>
          )}

          <textarea className="input-field min-h-[60px] py-2.5 resize-none" placeholder="Notas…"
            value={nota} onChange={e => setNota(e.target.value)} readOnly={isExternal} />

          {!isExternal && (
            <div>
              <label className="text-[11px] font-medium text-ink-3 mb-1.5 block">Color</label>
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c, '--tw-ring-color': c, '--tw-ring-offset-color': 'var(--surface)' } as React.CSSProperties} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-5">
          {isEdit && !isExternal ? (
            <button onClick={remove} className="h-9 px-3 text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center gap-1.5 transition-colors">
              <Trash2 size={14} /> Eliminar
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={closeModal} className="h-9 px-4 text-[13px] font-medium text-ink-2 border border-edge-mid rounded-xl hover:bg-surface-2">
              Cancelar
            </button>
            {!isExternal && (
              <button onClick={save} className="h-9 px-5 text-[13px] font-bold bg-accent text-white rounded-xl hover:bg-accent-2 active:bg-[#1E4A2E]">
                {isEdit ? 'Guardar' : 'Crear'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
