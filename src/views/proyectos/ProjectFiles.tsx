import { useRef, useState } from 'react'
import { Paperclip, X, FileText, Image, File, Loader } from 'lucide-react'
import { uploadFile, deleteFile } from '../../services/fileStorage'
import type { ArchivoAdjunto } from '../../types'

function FileIcon({ tipo }: { tipo: string }) {
  if (tipo.startsWith('image/')) return <Image size={12} className="text-blue-400 flex-shrink-0" />
  if (tipo === 'application/pdf') return <FileText size={12} className="text-red-400 flex-shrink-0" />
  return <File size={12} className="text-ink-3 flex-shrink-0" />
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`
  return `${(b / 1024 / 1024).toFixed(1)}MB`
}

interface Props {
  projectId: string
  archivos: ArchivoAdjunto[]
  onAdd: (a: ArchivoAdjunto) => void
  onRemove: (id: string) => void
}

export default function ProjectFiles({ projectId, archivos, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        onAdd(await uploadFile(projectId, file))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (archivo: ArchivoAdjunto) => {
    onRemove(archivo.id)
    await deleteFile(archivo).catch(() => {})
  }

  return (
    <div className="border-t border-edge">
      <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5">
          <Paperclip size={11} className="text-ink-3" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Archivos</span>
          {archivos.length > 0 && (
            <span className="text-[10px] text-ink-4">({archivos.length})</span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[10px] text-ink-3 hover:text-accent transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader size={10} className="animate-spin" /> : '+ Adjuntar'}
        </button>
      </div>

      <input
        ref={inputRef} type="file" multiple className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <div className="px-5 pb-1.5 text-[10px] text-red-400">{error}</div>
      )}

      {archivos.map(a => (
        <div key={a.id} className="group flex items-center gap-2 px-5 py-1 hover:bg-surface-2 transition-colors">
          <FileIcon tipo={a.tipo} />
          <a
            href={a.url ?? a.dataUrl ?? '#'}
            target="_blank" rel="noreferrer"
            download={!a.url ? a.nombre : undefined}
            className="flex-1 min-w-0 text-[11.5px] text-ink-2 hover:text-accent truncate transition-colors"
          >
            {a.nombre}
          </a>
          <span className="text-[10px] text-ink-4 flex-shrink-0">{formatBytes(a.tamaño)}</span>
          <button
            onClick={() => handleRemove(a)}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-ink-4 hover:text-red-400 transition-all flex-shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      ))}

      {archivos.length === 0 && !uploading && (
        <div className="px-5 pb-2.5 text-[11px] text-ink-4">Sin archivos adjuntos</div>
      )}
    </div>
  )
}
