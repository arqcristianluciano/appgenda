import type { TipoObligacion } from '../types'

// Etiquetas legibles para cada tipo de gasto fijo.
export const TIPO_LABELS: Record<TipoObligacion, string> = {
  tarjeta: 'Tarjeta',
  prestamo: 'Préstamo',
  servicio: 'Servicio',
  mantenimiento: 'Mantenimiento',
  otro: 'Otro',
}

// Colores de la etiqueta de cada tipo (modo claro / oscuro).
export const TIPO_BADGE: Record<TipoObligacion, string> = {
  tarjeta: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  prestamo: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  servicio: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  mantenimiento: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  otro: 'bg-surface-3 text-ink-2',
}
