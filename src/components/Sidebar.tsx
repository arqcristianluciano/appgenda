import { useRef } from 'react'
import { useStore } from '../store/useStore'
import { getSession, clearSession } from '../services/auth'
import type { Vista, AppData } from '../types'
import { Home, Grid3X3, Calendar, CreditCard, TrendingUp, X, Moon, Sun, LogOut, Download, Upload } from 'lucide-react'

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const VISTAS: { id: Vista; label: string; icon: React.ReactNode }[] = [
  { id: 'hoy',         label: 'Hoy',         icon: <Home size={14} /> },
  { id: 'proyectos',   label: 'Proyectos',   icon: <Grid3X3 size={14} /> },
  { id: 'semana',      label: 'Calendario',  icon: <Calendar size={14} /> },
  { id: 'finanzas',    label: 'Finanzas',    icon: <CreditCard size={14} /> },
  { id: 'inversiones', label: 'Inversiones', icon: <TrendingUp size={14} /> },
]

function handleLogout() {
  clearSession()
  window.location.reload()
}

export default function Sidebar() {
  const { vista, setVista, data, sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, importData } = useStore()
  const importRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
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
        const parsed = JSON.parse(ev.target?.result as string) as AppData
        if (!Array.isArray(parsed.tareas)) throw new Error('Formato inválido')
        if (confirm('¿Reemplazar todos los datos con este backup?')) {
          importData(parsed)
        }
      } catch {
        alert('Archivo inválido o corrupto')
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
        fixed lg:sticky top-0 left-0 h-screen w-60 z-[100]
        bg-sidebar flex flex-col
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

          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 px-2 py-3 mt-2">Proyectos</div>
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
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-white/30 hover:text-red-400 hover:bg-white/5 transition-all mb-3"
          >
            <LogOut size={14} />
            <span className="font-medium">Cerrar sesión</span>
          </button>
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
