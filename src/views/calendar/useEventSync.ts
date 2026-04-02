import { useState } from 'react'
import type { Evento, CalendarSource } from '../../types'
import { useStore } from '../../store/useStore'
import { useCalendarStore } from '../../store/useCalendarStore'
import { scheduleNotification, cancelNotification } from '../../services/notifications'
import { syncCreateEvent, syncUpdateEvent, syncDeleteEvent } from '../../services/calendarSync'

interface EventFields {
  titulo: string; fecha: string; hora: string; horaFin: string
  nota: string; allDay: boolean; color: string; notificacion: string
  proj: string | null
}

export function useEventSync() {
  const { addEvento, updateEvento, deleteEvento } = useStore()
  const { sources, appendExternalEvents, updateExternalEvent, removeExternalEvent, closeModal } = useCalendarStore()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  const writableSources = sources.filter(s =>
    s.enabled && ['local', 'google', 'icloud'].includes(s.type),
  ) as CalendarSource[]

  const save = async (
    fields: EventFields, selectedEvent: Evento | null,
    isExternal: boolean, isTask: boolean, targetSource: string,
  ) => {
    if (!fields.titulo.trim() || !fields.fecha || syncing) return false
    setSyncing(true)
    setSyncError('')
    try {
      if (selectedEvent && isExternal) {
        await syncUpdateEvent({ ...selectedEvent, ...fields })
        updateExternalEvent(selectedEvent.id, fields)
      } else if (selectedEvent && !isTask) {
        updateEvento(selectedEvent.id, fields)
        if (fields.notificacion) await scheduleNotification(selectedEvent.id, fields.titulo, fields.notificacion)
        else cancelNotification(selectedEvent.id)
      } else if (!selectedEvent) {
        const src = sources.find(s => s.id === targetSource)
        if (src && (src.type === 'google' || src.type === 'icloud')) {
          const created = await syncCreateEvent(fields, targetSource)
          appendExternalEvents([created])
        } else {
          const id = `ev${Date.now()}`
          addEvento(fields.titulo, fields.fecha, fields.hora, fields.nota, fields.horaFin, fields.allDay, fields.color, fields.notificacion, id, fields.proj)
          if (fields.notificacion) await scheduleNotification(id, fields.titulo, fields.notificacion)
        }
      }
      closeModal()
      return true
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Error al sincronizar')
      return false
    } finally { setSyncing(false) }
  }

  const remove = async (selectedEvent: Evento | null, isExternal: boolean, isTask: boolean) => {
    if (!selectedEvent || syncing) return false
    setSyncing(true)
    setSyncError('')
    try {
      if (isExternal) {
        await syncDeleteEvent(selectedEvent)
        removeExternalEvent(selectedEvent.id)
      } else if (!isTask) {
        cancelNotification(selectedEvent.id)
        deleteEvento(selectedEvent.id)
      }
      closeModal()
      return true
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Error al eliminar')
      return false
    } finally { setSyncing(false) }
  }

  return { syncing, syncError, setSyncError, writableSources, save, remove }
}
