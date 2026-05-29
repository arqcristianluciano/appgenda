import { useRef, useState, type ReactNode } from 'react'
import { Check, Trash2, RotateCcw } from 'lucide-react'

/**
 * Fila deslizable estilo iOS (solo táctil). Deslizar a la DERECHA dispara
 * `onComplete` (verde), a la IZQUIERDA dispara `onDelete` (rojo). En escritorio
 * no ocurre nada porque no hay eventos táctiles: la fila se renderiza normal.
 *
 * Marca el contenedor con `data-no-gesture` para que el swipe de navegación
 * entre vistas ceda (ver useMobileGestures); el pull-to-refresh vertical sigue
 * funcionando porque este componente solo actúa en el eje horizontal.
 */

const TRIGGER = 80 // px para disparar la acción
const MAX = 96 // tope visual del desplazamiento
const AXIS_LOCK = 10

interface Props {
  children: ReactNode
  onComplete?: () => void
  onDelete?: () => void
  done?: boolean // cambia el ícono/etiqueta de la acción de completar
  className?: string
}

export default function SwipeRow({ children, onComplete, onDelete, done, className }: Props) {
  const [dx, setDx] = useState(0)
  const [animate, setAnimate] = useState(false)
  // dx vive también en el ref para decidir el disparo sin depender del ciclo de render.
  const st = useRef({ x0: 0, y0: 0, axis: '' as '' | 'h' | 'v', active: false, dx: 0 })
  const justSwiped = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    st.current = { x0: t.clientX, y0: t.clientY, axis: '', active: true, dx: 0 }
    setAnimate(false)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const s = st.current
    if (!s.active) return
    const t = e.touches[0]
    const dX = t.clientX - s.x0
    const dY = t.clientY - s.y0
    if (!s.axis) {
      if (Math.abs(dX) < AXIS_LOCK && Math.abs(dY) < AXIS_LOCK) return
      s.axis = Math.abs(dX) > Math.abs(dY) ? 'h' : 'v'
    }
    if (s.axis !== 'h') return
    // Solo permite el lado que tiene acción definida.
    let next = dX
    if (dX > 0 && !onComplete) next = 0
    if (dX < 0 && !onDelete) next = 0
    s.dx = Math.max(-MAX, Math.min(MAX, next))
    setDx(s.dx)
  }

  const onTouchEnd = () => {
    const s = st.current
    s.active = false
    setAnimate(true)
    if (s.dx >= TRIGGER && onComplete) { justSwiped.current = true; onComplete() }
    else if (s.dx <= -TRIGGER && onDelete) { justSwiped.current = true; onDelete() }
    s.dx = 0
    setDx(0)
    if (justSwiped.current) setTimeout(() => { justSwiped.current = false }, 400)
  }

  // Suprime el click sintético que iOS emite tras un swipe (evita doble toggle).
  const onClickCapture = (e: React.MouseEvent) => {
    if (justSwiped.current) { e.stopPropagation(); e.preventDefault() }
  }

  return (
    <div
      data-no-gesture
      className={`relative overflow-hidden ${className ?? ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClickCapture={onClickCapture}
    >
      {/* Acción al deslizar a la derecha: completar */}
      {onComplete && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 bg-accent text-white" style={{ width: MAX }}>
          {done ? <RotateCcw size={18} /> : <Check size={18} />}
        </div>
      )}
      {/* Acción al deslizar a la izquierda: eliminar */}
      {onDelete && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-600 text-white" style={{ width: MAX }}>
          <Trash2 size={18} />
        </div>
      )}
      <div
        className="relative"
        style={{ transform: `translateX(${dx}px)`, transition: animate ? 'transform .2s ease-out' : 'none' }}
      >
        {children}
      </div>
    </div>
  )
}
