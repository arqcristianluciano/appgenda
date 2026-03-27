import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import { ViewHoy, ViewProyectos, ViewCalendar, ViewFinanzas, ViewInversiones } from './views'
import { Home, Grid3X3, Calendar, CreditCard, TrendingUp, Menu, Moon, Sun } from 'lucide-react'
import type { Vista } from './types'

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const VIEW_TITLES: Record<Vista, string> = {
  hoy: 'Hoy', proyectos: 'Proyectos', semana: 'Calendario',
  finanzas: 'Finanzas', inversiones: 'Inversiones'
}
const MOB_NAV = [
  { id: 'hoy' as Vista,         icon: <Home size={18} />,       label: 'Hoy' },
  { id: 'proyectos' as Vista,   icon: <Grid3X3 size={18} />,    label: 'Proyectos' },
  { id: 'semana' as Vista,      icon: <Calendar size={18} />,   label: 'Calendario' },
  { id: 'finanzas' as Vista,    icon: <CreditCard size={18} />, label: 'Finanzas' },
  { id: 'inversiones' as Vista, icon: <TrendingUp size={18} />, label: 'Inversiones' },
]

export default function App() {
  const { vista, setVista, loaded, init, toggleSidebar, darkMode, toggleDarkMode } = useStore()
  const now = new Date()
  useEffect(() => { init() }, [init])

  if (!loaded) return (
    <div className="h-screen flex items-center justify-center bg-surface-bg">
      <div className="text-center">
        <div className="text-3xl font-extrabold text-ink tracking-tight mb-2">CLS</div>
        <div className="text-xs text-ink-3">Cargando agenda…</div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 bg-sidebar flex-shrink-0" style={{height:52}}>
          <button onClick={toggleSidebar} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
            <Menu size={16} />
          </button>
          <span className="text-white text-sm font-bold">{VIEW_TITLES[vista]}</span>
          <button onClick={toggleDarkMode} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        {/* Desktop header — hidden on calendar view (CalendarHeader replaces it) */}
        {vista !== 'semana' && (
          <div className="hidden lg:flex items-center justify-between px-8 pt-7 pb-0 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">{VIEW_TITLES[vista]}</h1>
              <p className="text-xs text-ink-3 mt-0.5">{DIAS[now.getDay()]}, {now.getDate()} de {MESES[now.getMonth()]}</p>
            </div>
            <button onClick={toggleDarkMode} className="w-9 h-9 rounded-lg border border-edge flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-all">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}
        {/* Content */}
        <main className={`flex-1 pb-14 lg:pb-0 ${
          vista === 'semana'
            ? 'overflow-hidden flex flex-col p-2 lg:p-4 lg:pt-4'
            : 'overflow-y-auto px-4 lg:px-8 py-5'
        }`}>
          {vista === 'hoy'         && <ViewHoy />}
          {vista === 'proyectos'   && <ViewProyectos />}
          {vista === 'semana'      && <ViewCalendar />}
          {vista === 'finanzas'    && <ViewFinanzas />}
          {vista === 'inversiones' && <ViewInversiones />}
        </main>
        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-white/[0.08] z-50 flex" style={{height:56}}>
          {MOB_NAV.map(v => (
            <button key={v.id} onClick={() => setVista(v.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${vista === v.id ? 'text-accent' : 'text-white/35 hover:text-white/70'}`}>
              {v.icon}
              <span className="text-[8px] font-bold uppercase tracking-wide">{v.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
