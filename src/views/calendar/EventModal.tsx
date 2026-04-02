import { useState, useEffect } from 'react'
import { X, Trash2, Clock, CalendarDays, AlignLeft, FolderOpen, Loader2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import NotificationPicker from './NotificationPicker'
import { useEventSync } from './useEventSync'

const COLORS = [
  '#2B5E3E', '#039BE5', '#D50000', '#8E24AA',
  '#F4511E', '#33B679', '#3F51B5', '#E67C73',
  '#7986CB', '#616161',
]

function addHour(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function EventModal() {
  const { data } = useStore()
  const { selectedEvent, modalDate, modalHora, closeModal } = useCalendarStore()
  const { syncing, syncError, setSyncError, writableSources, save, remove } = useEventSync()

  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [nota, setNota] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const [notificacion, setNotificacion] = useState('')
  const [proj, setProj] = useState<string | null>(null)
  const [targetSource, setTargetSource] = useState('local')

  const isEdit = !!selectedEvent
  const isTask = selectedEvent?.source === 'tasks'
  const isExternal = selectedEvent?.source === 'google' || selectedEvent?.source === 'icloud'

  useEffect(() => {
    setSyncError('')
    if (selectedEvent) {
      setTitulo(selectedEvent.titulo); setFecha(selectedEvent.fecha)
      setHora(selectedEvent.hora); setHoraFin(selectedEvent.horaFin || '')
      setNota(selectedEvent.nota); setAllDay(!!selectedEvent.allDay)
      setColor(selectedEvent.color || COLORS[0]); setNotificacion(selectedEvent.notificacion || '')
      setProj(selectedEvent.proj ?? null)
      setTargetSource(selectedEvent.calendarSourceId || 'local')
    } else {
      setTitulo(''); setNota(''); setAllDay(false); setColor(COLORS[0]); setNotificacion(''); setProj(null)
      setFecha(modalDate); setHora(modalHora); setHoraFin(modalHora ? addHour(modalHora) : '')
      setTargetSource('local')
    }
  }, [selectedEvent, modalDate, modalHora, setSyncError])

  const handleSave = () => {
    const h = allDay ? '' : hora
    const hf = allDay ? '' : horaFin
    const notif = allDay ? '' : notificacion
    save({ titulo: titulo.trim(), fecha, hora: h, horaFin: hf, nota, allDay, color, notificacion: notif, proj }, selectedEvent, isExternal, isTask, targetSource)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] p-4">
      <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-[460px] cal-modal-in overflow-hidden" onKeyDown={onKey}>
        <div className="h-2 w-full" style={{ backgroundColor: color }} />
        <div className="p-5">
          {isTask && <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[12px] text-blue-700 dark:text-blue-300 font-medium">Tarea — edítala desde Proyectos</div>}
          {isExternal && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[12px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedEvent?.color }} />
              {selectedEvent?.source === 'google' ? 'Google Calendar' : 'iCloud'}
            </div>
          )}
          {syncError && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-[12px] text-red-600 dark:text-red-400 font-medium">{syncError}</div>}

          <input className="w-full text-[22px] font-normal text-ink bg-transparent outline-none border-b-2 pb-2 mb-4 placeholder:text-ink-4 focus:border-accent transition-colors"
            style={{ borderColor: 'var(--edge-mid)' }} placeholder="Añadir título" value={titulo}
            onChange={e => setTitulo(e.target.value)} readOnly={isTask} autoFocus />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-ink-3 flex-shrink-0" />
              <input type="date" className="input-field flex-1" value={fecha} onChange={e => setFecha(e.target.value)} readOnly={isTask} />
              <label className="flex items-center gap-1.5 text-[13px] text-ink-2 cursor-pointer select-none whitespace-nowrap">
                <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} disabled={isTask} className="w-4 h-4 rounded accent-[var(--accent)]" />
                Todo el día
              </label>
            </div>

            {!allDay && (
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-ink-3 flex-shrink-0" />
                <input type="time" className="input-field flex-1" value={hora} onChange={e => setHora(e.target.value)} readOnly={isTask} />
                <span className="text-ink-3">–</span>
                <input type="time" className="input-field flex-1" value={horaFin} onChange={e => setHoraFin(e.target.value)} readOnly={isTask} />
              </div>
            )}

            <div className="flex items-start gap-3">
              <AlignLeft size={18} className="text-ink-3 flex-shrink-0 mt-2.5" />
              <textarea className="input-field min-h-[60px] py-2.5 resize-none flex-1" placeholder="Añadir descripción"
                value={nota} onChange={e => setNota(e.target.value)} readOnly={isTask} />
            </div>

            {!isTask && data.proyectos.length > 0 && (
              <div className="flex items-center gap-3">
                <FolderOpen size={18} className="text-ink-3 flex-shrink-0" />
                <select className="input-field flex-1 text-[13px]" value={proj ?? ''} onChange={e => setProj(e.target.value || null)}>
                  <option value="">Sin proyecto</option>
                  {data.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}

            {!isTask && !isExternal && !allDay && (
              <div className="flex items-start gap-3">
                <div className="w-[18px] flex-shrink-0 mt-0.5" />
                <div className="flex-1"><NotificationPicker fecha={fecha} hora={hora} value={notificacion} onChange={setNotificacion} /></div>
              </div>
            )}

            {!isEdit && writableSources.length > 1 && (
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-ink-3 flex-shrink-0" />
                <select className="input-field flex-1 text-[13px]" value={targetSource} onChange={e => setTargetSource(e.target.value)}>
                  {writableSources.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.type !== 'local' ? ` (${s.type === 'google' ? 'Google' : 'iCloud'})` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {!isTask && !isExternal && (
              <div className="flex items-center gap-3">
                <div className="w-[18px] h-[18px] rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c, '--tw-ring-color': c, '--tw-ring-offset-color': 'var(--surface)' } as React.CSSProperties} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--edge)' }}>
          {isEdit && !isTask ? (
            <button onClick={() => remove(selectedEvent, isExternal, isTask)} disabled={syncing}
              className="text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors disabled:opacity-50">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={closeModal} disabled={syncing} className="px-4 py-2 text-[13px] font-medium text-ink-2 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50">Cancelar</button>
            {!isTask && (
              <button onClick={handleSave} disabled={syncing}
                className="px-5 py-2 text-[13px] font-semibold bg-accent text-white rounded-lg hover:bg-accent-2 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {syncing && <Loader2 size={14} className="animate-spin" />} Guardar
              </button>
            )}
          </div>
        </div>

        <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center text-ink-3 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
