import type { CalendarSource } from '../types'

// Tipos de fuente en los que APPgenda puede crear/editar eventos. Los calendarios
// de 'finances' y 'tasks' se derivan de otros datos y no son destinos directos.
const WRITABLE_TYPES: readonly string[] = ['local', 'google', 'icloud']

// Calendarios donde SÍ se puede escribir: activos, de un tipo editable y que no
// estén marcados como solo lectura. `readOnly` cubre los calendarios suscritos sin
// permiso de escritura (festivos de Google, calendarios compartidos como invitado,
// suscripciones webcal de una sola vía). Intentar guardar en ellos devuelve un 403
// `requiredAccessLevel`, así que se excluyen del selector de destino.
export function selectWritableSources(sources: CalendarSource[]): CalendarSource[] {
  return sources.filter(s => s.enabled && !s.readOnly && WRITABLE_TYPES.includes(s.type))
}

// Para un evento externo ya cargado: ¿su calendario de origen es de solo lectura?
// Se usa para deshabilitar guardar/eliminar y evitar el 403 al modificarlo.
export function isSourceReadOnly(sources: CalendarSource[], calendarSourceId?: string): boolean {
  if (!calendarSourceId) return false
  return !!sources.find(s => s.id === calendarSourceId)?.readOnly
}

// Mapea el accessRole de la Google Calendar API a nuestro flag de solo lectura.
// 'owner'/'writer' permiten crear eventos; 'reader'/'freeBusyReader' no. Si Google
// no devuelve el campo lo tratamos como escribible para no bloquear de más.
export function isGoogleAccessReadOnly(accessRole?: string): boolean {
  return accessRole === 'reader' || accessRole === 'freeBusyReader'
}
