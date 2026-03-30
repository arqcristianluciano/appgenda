import { Bell, BellOff, Smartphone } from 'lucide-react'
import { getNotifSupport } from '../../services/notifications'

interface Props {
  fecha: string
  hora: string
  value: string  // ISO datetime "YYYY-MM-DDTHH:mm" o vacío
  onChange: (v: string) => void
}

const OPCIONES = [
  { label: 'Al inicio',       mins: 0 },
  { label: '15 min antes',    mins: -15 },
  { label: '30 min antes',    mins: -30 },
  { label: '1 h antes',       mins: -60 },
  { label: '1 día antes',     mins: -1440 },
]

function addMins(fecha: string, hora: string, mins: number): string {
  const base = new Date(`${fecha}T${hora || '09:00'}:00`)
  base.setMinutes(base.getMinutes() + mins)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = base.getFullYear()
  const mo = pad(base.getMonth() + 1)
  const d = pad(base.getDate())
  const h = pad(base.getHours())
  const m = pad(base.getMinutes())
  return `${y}-${mo}-${d}T${h}:${m}`
}

export default function NotificationPicker({ fecha, hora, value, onChange }: Props) {
  const support = getNotifSupport()
  const enabled = !!value
  const notifDate = value ? value.split('T')[0] : ''
  const notifTime = value ? (value.split('T')[1] ?? '').slice(0, 5) : ''

  if (support === 'none') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-ink-3">
        <Smartphone size={14} />
        <span>
          Para recibir notificaciones, abre esta página en Safari y usa
          {' '}<strong>Compartir → Añadir a la pantalla de inicio</strong>.
        </span>
      </div>
    )
  }

  function toggle() {
    if (enabled) {
      onChange('')
    } else {
      onChange(fecha ? addMins(fecha, hora, 0) : '')
    }
  }

  function applyOption(mins: number) {
    if (!fecha) return
    onChange(addMins(fecha, hora, mins))
  }

  function setDate(d: string) {
    onChange(`${d}T${notifTime || '09:00'}`)
  }

  function setTime(t: string) {
    if (!notifDate) return
    onChange(`${notifDate}T${t}`)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 text-[13px] transition-colors"
        style={{ color: enabled ? 'var(--accent)' : 'var(--ink-2)' }}
      >
        {enabled
          ? <Bell size={16} />
          : <BellOff size={16} />
        }
        {enabled ? 'Notificación activa' : 'Añadir notificación'}
      </button>

      {enabled && (
        <div className="ml-6 space-y-2">
          {support === 'foreground' && (
            <p className="text-[11px] text-ink-3">
              En iPhone, las notificaciones solo aparecen mientras la app está abierta.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {OPCIONES.map(o => (
              <button
                key={o.label}
                type="button"
                onClick={() => applyOption(o.mins)}
                className="px-2.5 py-1 text-[11px] rounded-md bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink transition-colors"
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={notifDate}
              onChange={e => setDate(e.target.value)}
              className="input-field text-[12px] flex-1"
            />
            <input
              type="time"
              value={notifTime}
              onChange={e => setTime(e.target.value)}
              className="input-field text-[12px] flex-1"
            />
          </div>
        </div>
      )}
    </div>
  )
}
