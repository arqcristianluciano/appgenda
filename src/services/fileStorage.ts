import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage, auth } from '../lib/firebase'
import { buildStoragePath } from './storagePath'
import type { ArchivoAdjunto } from '../types'

const MAX_SIZE = 10 * 1024 * 1024       // 10MB con Firebase Storage
const MAX_BASE64 = 1 * 1024 * 1024     // 1MB sin Firebase

export function isFileStorageAvailable(): boolean {
  return !!storage
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

  if (storage) {
    const uid = auth?.currentUser?.uid
    if (!uid) throw new Error('Sesión no válida para subir archivos')
    const path = buildStoragePath(uid, projectId, id, file.name)
    const fileRef = ref(storage, path)
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    return { ...base, url, storagePath: path }
  }

  if (file.size > MAX_BASE64) throw new Error('Sin Firebase Storage el límite es 1MB por archivo')
  const dataUrl = await toDataUrl(file)
  return { ...base, dataUrl }
}

export async function deleteFile(archivo: ArchivoAdjunto): Promise<void> {
  if (storage && archivo.storagePath) {
    try {
      await deleteObject(ref(storage, archivo.storagePath))
    } catch (e) {
      console.warn('deleteFile:', e)
    }
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
