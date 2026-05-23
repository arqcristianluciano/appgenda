import { useEffect, useMemo, useState } from 'react'
import { X, RefreshCw, RotateCcw, Database, Copy } from 'lucide-react'
import { useStore } from '../store/useStore'
import { db, getUserId } from '../services/db'
import { reconcileLocalToRemote, type ReconcileResult } from '../lib/reconcile'
import { loadFromTables } from '../lib/storage'
import { findDuplicateTasks } from '../lib/dedupe'

interface Counts {
  tareas: { local: number; remote: number }
  proyectos: { local: number; remote: number }
  eventos: { local: number; remote: number }
  obligaciones: { local: number; remote: number }
  pagos: { local: number; remote: number }
  inversiones: { local: number; remote: number }
}

async function loadCounts(local: ReturnType<typeof useStore.getState>['data']): Promise<Counts> {
  const [tasks, projects, events, obligations, payments, investments] = await Promise.all([
    db.loadTasks(), db.loadProjects(), db.loadEvents(),
    db.loadObligations(), db.loadPayments(), db.loadInvestments(),
  ])
  return {
    tareas: { local: local.tareas.length, remote: tasks.length },
    proyectos: { local: local.proyectos.length, remote: projects.length },
    eventos: { local: local.eventos.length, remote: events.length },
    obligaciones: { local: local.obligaciones.length, remote: obligations.length },
    pagos: { local: local.pagos.length, remote: payments.length },
    inversiones: { local: local.inversiones.length, remote: investments.length },
  }
}

interface Props { onClose: () => void }

export default function SyncDiagnostics({ onClose }: Props) {
  const data = useStore(s => s.data)
  const [userId, setUserId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ReconcileResult | null>(null)

  const dupGroups = useMemo(() => findDuplicateTasks(data.tareas), [data.tareas])
  const dupRemovable = dupGroups.reduce((n, g) => n + g.remove.length, 0)

  const cleanDuplicates = async () => {
    if (dupRemovable === 0) return
    const preview = dupGroups.slice(0, 5).map(g => `· ${g.keep.txt}`).join('\n')
    const ok = confirm(
      `Se eliminarán ${dupRemovable} tarea(s) duplicada(s), conservando una copia de cada una:\n\n${preview}${dupGroups.length > 5 ? `\n…y ${dupGroups.length - 5} grupo(s) más` : ''}\n\n¿Continuar?`,
    )
    if (!ok) return
    setBusy(true)
    try {
      const toRemove = dupGroups.flatMap(g => g.remove)
      const removeIds = new Set(toRemove.map(t => t.id))
      useStore.setState(s => ({ data: { ...s.data, tareas: s.data.tareas.filter(t => !removeIds.has(t.id)) } }))
      for (const t of toRemove) await db.removeTask(t.id).catch(() => {})
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const refresh = async () => {
    setBusy(true)
    try {
      const uid = await getUserId()
      setUserId(uid)
      setCounts(await loadCounts(data))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const forceSync = async () => {
    setBusy(true)
    setResult(null)
    try {
      const r = await reconcileLocalToRemote(data)
      setResult(r)
      const fresh = await loadFromTables()
      if (fresh) useStore.setState({ data: fresh })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const hardReset = async () => {
    if (!confirm('Esto desregistrará el Service Worker y recargará. ¿Continuar?')) return
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-ink">Diagnóstico de sync</h2>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={18} /></button>
        </div>

        <div className="text-[12px] text-ink-2 mb-4">
          Usuario: <span className="font-mono text-[11px]">{userId ?? 'NO LOGUEADO'}</span>
        </div>

        <div className="border border-edge rounded-lg overflow-hidden mb-4">
          <table className="w-full text-[12px]">
            <thead className="bg-surface-2 text-ink-3">
              <tr>
                <th className="text-left px-3 py-2">Tabla</th>
                <th className="text-right px-3 py-2">Local</th>
                <th className="text-right px-3 py-2">Remoto</th>
                <th className="text-right px-3 py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {counts && Object.entries(counts).map(([k, v]) => {
                const diff = v.local - v.remote
                return (
                  <tr key={k} className="border-t border-edge">
                    <td className="px-3 py-2 font-medium text-ink">{k}</td>
                    <td className="text-right px-3 py-2 text-ink">{v.local}</td>
                    <td className="text-right px-3 py-2 text-ink">{v.remote}</td>
                    <td className={`text-right px-3 py-2 font-mono ${diff > 0 ? 'text-amber-500' : diff < 0 ? 'text-blue-500' : 'text-ink-3'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="border border-edge rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Copy size={14} className="text-ink-3" />
            <span className="text-[12px] font-bold text-ink">Tareas duplicadas</span>
          </div>
          {dupRemovable === 0 ? (
            <p className="text-[12px] text-ink-3">No se detectaron duplicados.</p>
          ) : (
            <>
              <p className="text-[12px] text-ink-2 mb-2">
                {dupRemovable} duplicada(s) en {dupGroups.length} grupo(s) (misma tarea, mismo proyecto y estado).
              </p>
              <ul className="text-[11px] text-ink-3 mb-3 space-y-0.5 max-h-24 overflow-y-auto">
                {dupGroups.slice(0, 6).map(g => (
                  <li key={g.keep.id} className="truncate">· {g.keep.txt} <span className="text-ink-3/70">×{g.remove.length + 1}</span></li>
                ))}
                {dupGroups.length > 6 && <li>…y {dupGroups.length - 6} más</li>}
              </ul>
              <button
                onClick={cleanDuplicates}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2 rounded-lg text-[12px] font-medium disabled:opacity-50"
              >
                <Copy size={13} />
                Limpiar duplicados ({dupRemovable})
              </button>
            </>
          )}
        </div>

        {result && (
          <div className="bg-surface-2 rounded-lg p-3 mb-4 text-[12px]">
            <div className="font-bold text-ink mb-2">Resultado última sync:</div>
            <div className="text-ink-2">Subidos: {result.uploaded} · Errores: {result.errors}</div>
            {result.byTable.filter(t => t.uploaded || t.errors || t.skipped).map(t => (
              <div key={t.table} className="text-[11px] text-ink-3 mt-1">
                {t.table}: ↑{t.uploaded} ✗{t.errors} ⊘{t.skipped}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={forceSync}
            disabled={busy || !userId}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            Forzar sincronización
          </button>
          <button
            onClick={hardReset}
            className="w-full flex items-center justify-center gap-2 bg-surface-2 text-ink py-2.5 rounded-lg text-[13px] font-medium border border-edge"
          >
            <RotateCcw size={14} />
            Resetear caché y recargar
          </button>
        </div>

        <p className="text-[10px] text-ink-3 mt-4 leading-relaxed">
          Δ positivo = items locales no subidos al servidor. Δ negativo = items en servidor que aún no están en este dispositivo (refresca la página).
        </p>
      </div>
    </div>
  )
}
