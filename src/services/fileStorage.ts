import { supabase } from '../lib/supabase'
import type { ArchivoAdjunto } from '../types'

const BUCKET = 'project-files'
const MAX_SIZE = 10 * 1024 * 1024       // 10MB con Supabase
const MAX_BASE64 = 1 * 1024 * 1024     // 1MB sin Supabase

export function isSupabaseStorageAvailable(): boolean {
  return !!supabase
}

export async function uploadFile(projectId: string, file: File): Promise<ArchivoAdjunto> {
  if (file.size > MAX_SIZE) throw new Error('El archivo supera el límite de 10MB')

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const base: Omit<ArchivoAdjunto, 'url' | 'dataUrl' | 'storagePath'> = {
    id,
    nombre: file.name,
    tipo: file.type,
    tamaño: file.size,
    fecha: new Date().toISOString(),
  }

  if (supabase) {
    const path = `${projectId}/${id}-${file.name}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { ...base, url: data.publicUrl, storagePath: path }
  }

  if (file.size > MAX_BASE64) throw new Error('Sin Supabase el límite es 1MB por archivo')
  const dataUrl = await toDataUrl(file)
  return { ...base, dataUrl }
}

export async function deleteFile(archivo: ArchivoAdjunto): Promise<void> {
  if (supabase && archivo.storagePath) {
    await supabase.storage.from(BUCKET).remove([archivo.storagePath])
  }
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
