import type { CalendarSource } from '../types'

// Tipos de fuente en los que APPgenda puede crear/editar eventos. Los calendarios
// de 'finances' y 'tasks' se derivan de otros datos y no son destinos directos.
const WRITABLE_TYPES: readonly string[] = ['local', 'google', 'icloud']

// Identidad canónica de un calendario. Cuando hay varias cuentas conectadas, el
// MISMO calendario de Google puede llegar por dos cuentas (p. ej. el calendario de
// una cuenta compartido en la otra): mismas entradas, mismo `calendarId`. Lo
// agrupamos por tipo + id de calendario real para tratarlo como uno solo. Las
// fuentes sin `calendarId` (local, finanzas, iCloud, o google previo a esta versión)
// caen en su propio `id`, así que nunca se fusionan por error.
function calendarKey(s: CalendarSource): string {
  return s.calendarId ? `${s.type}:${s.calendarId}` : s.id
}

// Cuál de las fuentes que apuntan al mismo calendario debe ganar. Preferimos la
// cuenta DUEÑA (donde el calendario es su primario: accountEmail === calendarId) y,
// en segundo lugar, una con permiso de escritura. Así las escrituras salen por la
// cuenta correcta en vez de por la copia compartida.
function sourceRank(s: CalendarSource): number {
  let r = 0
  if (s.calendarId && s.accountEmail === s.calendarId) r += 2
  if (!s.readOnly) r += 1
  return r
}

// Para cada calendario, elige su fuente canónica (la de mayor rango; ante empate,
// la primera en aparecer).
function pickCanonical(sources: CalendarSource[]): Map<string, CalendarSource> {
  const best = new Map<string, CalendarSource>()
  for (const s of sources) {
    const k = calendarKey(s)
    const cur = best.get(k)
    if (!cur || sourceRank(s) > sourceRank(cur)) best.set(k, s)
  }
  return best
}

// Colapsa las fuentes que apuntan al mismo calendario a una sola (la canónica),
// conservando el orden de primera aparición. Evita que el mismo calendario aparezca
// dos veces en el selector de destino o en la barra lateral cuando llega por más de
// una cuenta de Google.
export function dedupeSourcesByCalendar(sources: CalendarSource[]): CalendarSource[] {
  const best = pickCanonical(sources)
  const used = new Set<string>()
  const out: CalendarSource[] = []
  for (const s of sources) {
    const k = calendarKey(s)
    if (used.has(k)) continue
    used.add(k)
    out.push(best.get(k)!)
  }
  return out
}

// Mapa de cada source.id → la fuente canónica de su calendario. Permite que el
// filtro de visibilidad y el toggle del sidebar operen sobre una sola fuente por
// calendario aunque un evento se haya cargado por la cuenta no canónica.
export function canonicalSourceMap(sources: CalendarSource[]): Map<string, CalendarSource> {
  const best = pickCanonical(sources)
  const byId = new Map<string, CalendarSource>()
  for (const s of sources) byId.set(s.id, best.get(calendarKey(s))!)
  return byId
}

// ¿Es `source` la fuente canónica de su calendario? El sidebar solo lista las
// canónicas para no repetir el mismo calendario bajo cada cuenta.
export function isCanonicalSource(sources: CalendarSource[], source: CalendarSource): boolean {
  return canonicalSourceMap(sources).get(source.id)?.id === source.id
}

// Calendarios donde SÍ se puede escribir: activos, de un tipo editable y que no
// estén marcados como solo lectura. `readOnly` cubre los calendarios suscritos sin
// permiso de escritura (festivos de Google, calendarios compartidos como invitado,
// suscripciones webcal de una sola vía). Intentar guardar en ellos devuelve un 403
// `requiredAccessLevel`, así que se excluyen del selector de destino. Además se
// deduplican por calendario para no ofrecer el mismo destino una vez por cuenta.
export function selectWritableSources(sources: CalendarSource[]): CalendarSource[] {
  const writable = sources.filter(s => s.enabled && !s.readOnly && WRITABLE_TYPES.includes(s.type))
  return dedupeSourcesByCalendar(writable)
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
