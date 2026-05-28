import { useEffect, useRef, useState } from 'react'

/**
 * Gestos táctiles para móvil: swipe horizontal entre vistas + pull-to-refresh.
 *
 * Ambos comparten un único set de listeners sobre el contenedor scrollable para
 * evitar que compitan entre sí. Se hace "lock" del eje en el primer movimiento:
 * horizontal → navegación, vertical (al tope del scroll) → refresh. Nunca se
 * llama preventDefault en horizontal, así el scroll horizontal interno (p.ej. la
 * vista de calendario) sigue funcionando.
 */

const SWIPE_THRESHOLD = 60 // px horizontales para disparar cambio de vista
const SWIPE_RATIO = 1.4 // dx debe dominar a dy para contar como swipe
const PULL_THRESHOLD = 70 // px de tirón para disparar refresh
const PULL_MAX = 110 // tope visual del indicador
const RESISTANCE = 0.5 // el contenido se mueve la mitad que el dedo
const AXIS_LOCK = 8 // px mínimos para decidir el eje del gesto

interface Options {
  enabled: boolean
  scrollRef: React.RefObject<HTMLElement | null>
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onRefresh?: () => Promise<void> | void
  canPull?: () => boolean
  canSwipe?: () => boolean
}

/** Ignora gestos que nacen sobre controles o dentro de overlays fijos (modales). */
function shouldIgnore(target: EventTarget | null, root: HTMLElement): boolean {
  let node = target as HTMLElement | null
  while (node && node !== root && node !== document.body) {
    const tag = node.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable) {
      return true
    }
    if (node.dataset?.noGesture != null) return true
    const pos = getComputedStyle(node).position
    if (pos === 'fixed' || pos === 'sticky') return true
    node = node.parentElement
  }
  return false
}

/**
 * ¿El gesto nace dentro de un contenedor con scroll horizontal real?
 * (p.ej. las tablas de Finanzas/Inversiones con overflow-x-auto). En ese caso
 * el swipe de navegación debe ceder para no robarle el scroll al contenedor.
 */
function startsInHScroll(target: EventTarget | null, root: HTMLElement): boolean {
  let node = target as HTMLElement | null
  while (node && node !== root && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const ox = getComputedStyle(node).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    node = node.parentElement
  }
  return false
}

export function useMobileGestures(opts: Options) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Mantiene las opciones más recientes sin re-suscribir los listeners.
  const optsRef = useRef(opts)
  useEffect(() => { optsRef.current = opts })

  const refreshingRef = useRef(false)

  useEffect(() => {
    const el = opts.scrollRef.current
    if (!el || !opts.enabled) return

    const st = { x0: 0, y0: 0, axis: '' as '' | 'h' | 'v', pull: 0, active: false, noSwipe: false }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || refreshingRef.current) return
      if (shouldIgnore(e.target, el)) return
      const t = e.touches[0]
      st.x0 = t.clientX
      st.y0 = t.clientY
      st.axis = ''
      st.pull = 0
      st.active = true
      // El swipe de navegación cede si el gesto nace en un scroll horizontal.
      st.noSwipe = startsInHScroll(e.target, el)
    }

    const onMove = (e: TouchEvent) => {
      if (!st.active) return
      const t = e.touches[0]
      const dx = t.clientX - st.x0
      const dy = t.clientY - st.y0
      if (!st.axis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return
        st.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (st.axis === 'v') {
        const canPull = optsRef.current.canPull?.() !== false && !!optsRef.current.onRefresh
        if (dy > 0 && el.scrollTop <= 0 && canPull) {
          st.pull = Math.min(dy * RESISTANCE, PULL_MAX)
          setPull(st.pull)
          e.preventDefault() // evita el rebote nativo mientras tiramos
        } else if (st.pull > 0) {
          st.pull = 0
          setPull(0)
        }
      }
      // Horizontal: no hacemos nada en move (no preventDefault) para no romper
      // el scroll horizontal interno; se decide en touchend.
    }

    const finish = (e: TouchEvent) => {
      if (!st.active) return
      st.active = false
      const t = e.changedTouches[0]
      const dx = t.clientX - st.x0
      const dy = t.clientY - st.y0

      if (
        st.axis === 'h' &&
        !st.noSwipe &&
        optsRef.current.canSwipe?.() !== false &&
        Math.abs(dx) > SWIPE_THRESHOLD &&
        Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO
      ) {
        if (dx < 0) optsRef.current.onSwipeLeft?.()
        else optsRef.current.onSwipeRight?.()
      }

      if (st.pull > 0) {
        if (st.pull >= PULL_THRESHOLD && optsRef.current.onRefresh) {
          refreshingRef.current = true
          setRefreshing(true)
          setPull(PULL_THRESHOLD)
          Promise.resolve(optsRef.current.onRefresh()).finally(() => {
            refreshingRef.current = false
            setRefreshing(false)
            setPull(0)
          })
        } else {
          setPull(0)
        }
        st.pull = 0
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', finish, { passive: true })
    el.addEventListener('touchcancel', finish, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', finish)
      el.removeEventListener('touchcancel', finish)
    }
  }, [opts.enabled, opts.scrollRef])

  return { pull, refreshing }
}
