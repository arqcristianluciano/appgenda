import { useStore } from '../store/useStore'
import type { Vista } from '../types'
import { Home, Grid3X3, Calendar, CreditCard, TrendingUp, X } from 'lucide-react'

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const VISTAS: { id: Vista; label: string; icon: React.ReactNode }[] = [
  { id: 'hoy',         label: 'Hoy',         icon: <Home size={14} /> },
  { id: 'proyectos',   label: 'Proyectos',   icon: <Grid3X3 size={14} /> },
  { id: 'semana',      label: 'Semana',      icon: <Calendar size={14} /> },
  { id: 'finanzas',    label: 'Finanzas',    icon: <CreditCard size={14} /> },
  { id: 'inversiones', label: 'Inversiones', icon: <TrendingUp size={14} /> },
]

export default function Sidebar() {
  const { vista, setVista, data, sidebarOpen, toggleSidebar } = useStore()
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-60 z-[100]
        bg-[#1C1A17] flex flex-col
        transition-transform duration-250 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#2B5E3E] flex items-center justify-center text-white text-xs font-bold">CL</div>
            <div>
              <div className="text-white text-[13px] font-bold leading-tight">Cristian Luciano</div>
              <div className="text-white/35 text-[10px] mt-0.5">The House & Co</div>
            </div>
            <button onClick={toggleSidebar} className="ml-auto text-white/30 hover:text-white lg:hidden">
              <X size={16} />
            </button>
          </div>

          {/* Date */}
          <div className="bg-white/5 rounded-[10px] px-4 py-3">
            <div className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1">{DIAS[now.getDay()]}</div>
            <div className="text-white font-serif text-3xl leading-none">{now.getDate()}</div>
            <div className="text-white/45 text-[11px] mt-1">{MESES[now.getMonth()]} {now.getFullYear()}</div>
          </div>
        </div>

        {/* Nav */}
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
                  ? 'bg-white/10 text-white border-l-2 border-[#2B5E3E]'
                  : 'text-white/50 hover:text-white/85 hover:bg-white/5'
                }
              `}
            >
              <span className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center ${vista === v.id ? 'bg-[#2B5E3E]' : ''}`}>
                {v.icon}
              </span>
              {v.label}
              {v.id === 'hoy' && pendientes > 0 && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${vista === v.id ? 'bg-[#2B5E3E] text-white' : 'bg-white/10 text-white/50'}`}>
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

        {/* Bottom stats */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
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
