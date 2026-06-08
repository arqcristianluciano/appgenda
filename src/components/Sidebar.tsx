import { useRef, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getSession, clearSession } from '../services/auth'
import { getSyncStatus, onSyncChange, type SyncStatus } from '../lib/storage'
import type { Vista, AppData } from '../types'
import { Home, Grid3X3, Calendar, CreditCard, TrendingUp, ShieldCheck, Users, X, Moon, Sun, LogOut, Download, Upload, Cloud, CloudOff, Loader2, Database, Bell, BellOff } from 'lucide-react'
import SyncDiagnostics from './SyncDiagnostics'
import { enablePush, disablePush, isPushEnabled, isPushConfigured } from '../services/push'

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const VISTAS: { id: Vista; label: string; icon: React.ReactNode }[] = [
  { id: 'hoy',         label: 'Hoy',               icon: <Home size={14} /> },
  { id: 'proyectos',   label: 'Lista de Tareas',   icon: <Grid3X3 size={14} /> },
  { id: 'semana',      label: 'Calendario',        icon: <Calendar size={14} /> },
  { id: 'finanzas',    label: 'Gastos fijos',      icon: <CreditCard size={14} /> },
  { id: 'inversiones', label: 'Inversiones',       icon: <TrendingUp size={14} /> },
  { id: 'datos',       label: 'Datos Importantes', icon: <ShieldCheck size={14} /> },
  { id: 'equipo',      label: 'Equipo',            icon: <Users size={14} /> },
]

function handleLogout() {
  clearSession()
  window.location.reload()
}

export default function Sidebar() {
  const { vista, setVista, data, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, importData } = useStore()
  const importRef = useRef<HTMLInputElement>(null)
  const [showDiag, setShowDiag] = useState(false)
  const [pushOn, setPushOn] = useState(isPushEnabled())
  const [pushBusy, setPushBusy] = useState(false)

  const togglePush = async () => {
    if (pushBusy) return
    setPushBusy(true)
    try {
      if (pushOn) {
        await disablePush()
        setPushOn(false)
      } else {
        const res = await enablePush()
        if (res.ok) setPushOn(true)
        else alert(res.reason ?? 'No se pudieron activar las notificaciones.')
      }
    } finally {
      setPushBusy(false)
    }
  }

  const handleExport = () => {
    const localStorageDump: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) localStorageDump[k] = localStorage.getItem(k) ?? ''
    }
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      origin: window.location.origin,
      appData: data,
      localStorage: localStorageDump,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appgenda-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)

        if (parsed?.version === 2 && parsed.appData) {
          const when = (parsed.exportedAt ?? '').slice(0, 10)
          if (!confirm(`Importar backup completo del ${when}? Sobrescribe TODO.`)) return
          if (parsed.localStorage && typeof parsed.localStorage === 'object') {
            Object.entries(parsed.localStorage as Record<string, string>).forEach(([k, v]) => {
              if (typeof v === 'string') localStorage.setItem(k, v)
            })
          }
          importData(parsed.appData as AppData)
          alert('✓ Backup restaurado. Recargando…')
          window.location.reload()
          return
        }

        if (Array.isArray(parsed?.tareas)) {
          if (confirm('¿Reemplazar todos los datos con este backup?')) {
            importData(parsed as AppData)
          }
          return
        }

        if (parsed && typeof parsed === 'object' && typeof parsed['agenda-cls-stable'] === 'string') {
          if (!confirm('Importar backup raw de localStorage? Sobrescribe TODO el almacenamiento.')) return
          Object.entries(parsed as Record<string, string>).forEach(([k, v]) => {
            if (typeof v === 'string') localStorage.setItem(k, v)
          })
          alert('✓ Restaurado. Recargando…')
          window.location.reload()
          return
        }

        throw new Error('Formato no reconocido')
      } catch (err) {
        alert('Archivo inválido o corrupto: ' + (err as Error).message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  const session = getSession()
  const now = new Date()
  const pendientes = data.tareas.filter(t => !t.done).length
  const hechas = data.tareas.filter(t => t.done).length
  const finAlerts = data.pagos.filter(p => {
    if (p.done || !p.fecha) return false
    const today = new Date(); today.setHours(0,0,0,0)
    const due = new Date(p.fecha + 'T00:00:00')
    return due <= today
  }).length

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen-safe w-60 z-[100]
        bg-sidebar flex flex-col pt-safe pb-safe lg:pt-0 lg:pb-0
        transition-transform duration-250 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-5">
            {session?.picture ? (
              <img src={session.picture} alt={session.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {session?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white text-[13px] font-bold leading-tight truncate">{session?.name ?? 'Usuario'}</div>
              <div className="text-white/35 text-[10px] mt-0.5">The House & Co</div>
            </div>
            <button onClick={toggleSidebar} className="text-white/30 hover:text-white lg:hidden flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          <div className="bg-white/5 rounded-[10px] px-4 py-3">
            <div className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1">{DIAS[now.getDay()]}</div>
            <div className="text-white font-serif text-3xl leading-none">{now.getDate()}</div>
            <div className="text-white/45 text-[11px] mt-1">{MESES[now.getMonth()]} {now.getFullYear()}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 px-2 py-3">Vistas</div>
          {VISTAS.map(v => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              className={`
                w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium
                mb-0.5 transition-all duration-150
                ${vista === v.id
                  ? 'bg-white/10 text-white border-l-2 border-accent'
                  : 'text-white/50 hover:text-white/85 hover:bg-white/5'
                }
              `}
            >
              <span className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center ${vista === v.id ? 'bg-accent' : ''}`}>
                {v.icon}
              </span>
              {v.label}
              {v.id === 'hoy' && pendientes > 0 && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${vista === v.id ? 'bg-accent text-white' : 'bg-white/10 text-white/50'}`}>
                  {pendientes}
                </span>
              )}
              {v.id === 'finanzas' && finAlerts > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/50 text-red-400">
                  {finAlerts}
                </span>
              )}
            </button>
          ))}

          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 px-2 py-3 mt-2">Lista de Tareas</div>
          {data.proyectos.map(p => {
            const tareas = data.tareas.filter(t => t.proj === p.id)
            const done = tareas.filter(t => t.done).length
            return (
              <button
                key={p.id}
                onClick={() => setVista('proyectos')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/80 hover:bg-white/5 mb-0.5 transition-all"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="truncate">{p.nombre}</span>
                <span className="ml-auto text-white/25 text-[10px]">{done}/{tareas.length}</span>
              </button>
            )
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/85 hover:bg-white/5 transition-all"
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            <span className="font-medium">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
          {isPushConfigured() && (
            <button
              onClick={togglePush}
              disabled={pushBusy}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/85 hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {pushOn ? <Bell size={14} /> : <BellOff size={14} />}
              <span className="font-medium">{pushOn ? 'Notificaciones activadas' : 'Activar notificaciones'}</span>
            </button>
          )}
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/85 hover:bg-white/5 transition-all"
          >
            <Download size={14} />
            <span className="font-medium">Exportar backup</span>
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/85 hover:bg-white/5 transition-all"
          >
            <Upload size={14} />
            <span className="font-medium">Importar backup</span>
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => setShowDiag(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/85 hover:bg-white/5 transition-all"
          >
            <Database size={14} />
            <span className="font-medium">Diagnóstico de sync</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/30 hover:text-red-400 hover:bg-white/5 transition-all mb-3"
          >
            <LogOut size={14} />
            <span className="font-medium">Cerrar sesión</span>
          </button>
          {showDiag && <SyncDiagnostics onClose={() => setShowDiag(false)} />}
          <SyncIndicator />
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="text-white text-xl font-bold leading-none">{pendientes}</div>
              <div className="text-white/30 text-[10px] mt-1">Pendientes</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="text-white text-xl font-bold leading-none">{hechas}</div>
              <div className="text-white/30 text-[10px] mt-1">Hechas</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus)
  useEffect(() => onSyncChange(setStatus), [])
  if (status === 'synced') return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 text-[10px] text-green-400/60">
      <Cloud size={12} /> Sincronizado
    </div>
  )
  if (status === 'pending') return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 text-[10px] text-amber-400/80">
      <Loader2 size={12} className="animate-spin" /> Guardando…
    </div>
  )
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 text-[10px] text-red-400/80">
      <CloudOff size={12} /> Sin sincronizar — reintentando
    </div>
  )
}
