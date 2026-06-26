import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useStore } from './store/useStore'
import { useCalendarStore } from './store/useCalendarStore'
import { restoreNotifications } from './services/notifications'
import { initDatosStore } from './store/useDatosStore'
import { getSession, clearSession, isAuthValid } from './services/auth'
import type { Session } from './services/auth'
import { getAccountEmails, storeAccessToken, getValidToken, TOKEN_REFRESH_MS } from './services/googleCalendar'
import Sidebar from './components/Sidebar'
import LoginScreen from './components/LoginScreen'
import ViewHoy from './views/ViewHoy'

// Vistas cargadas bajo demanda — la vista de calendario arrastra los servicios
// de sync de Google/iCloud, así que diferirla reduce el bundle inicial.
// (ViewHoy se importa directo, no vía el barrel ./views, que re-exporta todas
// las vistas estáticamente y las arrastraría al chunk inicial.)
const ViewProyectos = lazy(() => import('./views/ViewProyectos'))
const ViewCalendar = lazy(() => import('./views/calendar/ViewCalendar'))
const ViewFinanzas = lazy(() => import('./views/ViewFinanzas'))
const ViewInversiones = lazy(() => import('./views/ViewInversiones'))
const ViewDatos = lazy(() => import('./views/datos/ViewDatos'))
const ViewEquipo = lazy(() => import('./views/equipo/ViewEquipo'))
const EventModal = lazy(() => import('./views/calendar/EventModal'))
import { useTeamStore } from './store/useTeamStore'
import { Home, Grid3X3, Calendar, CreditCard, TrendingUp, ShieldCheck, Users, Menu, Moon, Sun, Loader2, Plus } from 'lucide-react'
import QuickAddTask from './components/QuickAddTask'
import { useIsMobile } from './lib/useIsMobile'
import { useMobileGestures } from './lib/useMobileGestures'
import type { Vista } from './types'

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const VIEW_TITLES: Record<Vista, string> = {
  hoy: 'Hoy', proyectos: 'Lista de Tareas', semana: 'Calendario',
  finanzas: 'Gastos fijos', inversiones: 'Inversiones', datos: 'Datos Importantes',
  equipo: 'Equipo',
}
const MOB_NAV = [
  { id: 'hoy' as Vista,         icon: <Home size={18} />,        label: 'Hoy' },
  { id: 'proyectos' as Vista,   icon: <Grid3X3 size={18} />,     label: 'Tareas' },
  { id: 'semana' as Vista,      icon: <Calendar size={18} />,    label: 'Cal.' },
  { id: 'finanzas' as Vista,    icon: <CreditCard size={18} />,  label: 'Gastos' },
  { id: 'inversiones' as Vista, icon: <TrendingUp size={18} />,  label: 'Inv.' },
  { id: 'datos' as Vista,       icon: <ShieldCheck size={18} />, label: 'Datos' },
  { id: 'equipo' as Vista,      icon: <Users size={18} />,       label: 'Equipo' },
]
// Orden de las vistas para el swipe horizontal (coincide con la bottom nav)
const VIEW_ORDER: Vista[] = MOB_NAV.map(v => v.id)

export default function App() {
  const { vista, setVista, loaded, init, refresh, toggleSidebar, sidebarOpen, darkMode, toggleDarkMode } = useStore()
  const { showModal } = useCalendarStore()
  const [session, setSession] = useState<Session | null>(() => getSession())
  const now = new Date()

  const syncedRef = useRef(false)
  const mainRef = useRef<HTMLElement>(null)
  const isMobile = useIsMobile()
  const [quickAdd, setQuickAdd] = useState(false)
  const deepLinkHandled = useRef(false)

  // App shortcuts (long-press del icono) + deep links: /?view=… y /?action=new-task.
  // Se procesa una sola vez y solo con sesión activa, para no perder la intención
  // si el shortcut se abre estando deslogueado.
  useEffect(() => {
    if (deepLinkHandled.current || !session) return
    deepLinkHandled.current = true
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view') as Vista | null
    const action = params.get('action')
    if (view && VIEW_ORDER.includes(view)) setVista(view)
    if (action === 'new-task') setQuickAdd(true)
    if (view || action) window.history.replaceState({}, '', '/')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const goRelative = (dir: number) => {
    const i = VIEW_ORDER.indexOf(vista)
    const next = i + dir
    if (next >= 0 && next < VIEW_ORDER.length) setVista(VIEW_ORDER[next])
  }

  const { pull, refreshing } = useMobileGestures({
    enabled: isMobile,
    scrollRef: mainRef,
    onSwipeLeft: () => goRelative(1),
    onSwipeRight: () => goRelative(-1),
    onRefresh: () => refresh(),
    canPull: () => vista !== 'semana',
    canSwipe: () => vista !== 'semana' && !showModal && !sidebarOpen,
  })

  useEffect(() => {
    if (!session) return
    let cancelled = false
    isAuthValid().then(valid => {
      if (cancelled) return
      if (!valid) {
        console.warn('Sesión Firebase expirada, forzando re-login')
        clearSession()
        setSession(null)
        return
      }
      init().then(() => { restoreNotifications(); initDatosStore(); useTeamStore.getState().init() })
    })
    return () => { cancelled = true }
  }, [session, init])

  useEffect(() => {
    if (!loaded || syncedRef.current) return
    syncedRef.current = true

    const cloudSources = useStore.getState().data.calendarConfig?.calendarSources
    if (cloudSources?.length) {
      useCalendarStore.setState({ sources: cloudSources })
    }

    const cfg = useStore.getState().data.calendarConfig ?? {}
    const googleEmails = cfg.googleEmails ?? []
    const cloudTokens = cfg.googleTokens ?? {}
    const localEmails = getAccountEmails()
    googleEmails.filter(e => !localEmails.includes(e) && cloudTokens[e]).forEach(email => {
      storeAccessToken(email, cloudTokens[email])
    })

    const refreshAllTokens = () => {
      const emails = useStore.getState().data.calendarConfig?.googleEmails ?? []
      emails.forEach(email => {
        getValidToken(email)
          .then((token: string) => {
            storeAccessToken(email, token)
            const cur = useStore.getState().data.calendarConfig?.googleTokens ?? {}
            if (cur[email] !== token) {
              useStore.getState().updateCalendarConfig({ googleTokens: { ...cur, [email]: token } })
            }
          })
          .catch(() => {})
      })
    }

    refreshAllTokens()
    const refreshInterval = setInterval(refreshAllTokens, TOKEN_REFRESH_MS)

    const unsub = useCalendarStore.subscribe((state, prev) => {
      if (state.sources !== prev.sources) {
        useStore.getState().updateCalendarConfig({ calendarSources: state.sources })
      }
    })

    return () => { clearInterval(refreshInterval); unsub() }
  }, [loaded])

  if (!session) return <LoginScreen onLogin={setSession} />

  if (!loaded) return (
    <div className="h-screen-safe flex items-center justify-center bg-surface-bg">
      <div className="text-center">
        <div className="text-3xl font-extrabold text-ink tracking-tight mb-2">CLS</div>
        <div className="text-xs text-ink-3">Cargando agenda…</div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen-safe overflow-hidden bg-surface-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="mobile-topbar lg:hidden flex items-center justify-between px-4 bg-sidebar flex-shrink-0">
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
          <div className="hidden lg:flex items-center justify-between px-8 pt-5 pb-0 flex-shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-ink tracking-tight leading-tight">{VIEW_TITLES[vista]}</h1>
              <p className="text-xs text-ink-3 mt-0.5">{DIAS[now.getDay()]}, {now.getDate()} de {MESES[now.getMonth()]}</p>
            </div>
            <button onClick={toggleDarkMode} className="w-9 h-9 rounded-lg border border-edge flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-all">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          {/* Indicador de pull-to-refresh (solo móvil) */}
          {isMobile && (pull > 0 || refreshing) && (
            <div
              className="lg:hidden absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-20"
              style={{
                transform: `translateY(${Math.max(pull - 38, refreshing ? 8 : -38)}px)`,
                transition: refreshing ? 'transform .15s ease-out' : 'none',
              }}
            >
              <div className="mt-2 w-9 h-9 rounded-full bg-surface shadow-lg border border-edge flex items-center justify-center">
                <Loader2
                  size={16}
                  className={`text-accent ${refreshing ? 'animate-spin' : ''}`}
                  style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)`, opacity: Math.min(pull / 70, 1) }}
                />
              </div>
            </div>
          )}
          <main ref={mainRef} className={`h-full min-h-0 pb-bottomnav lg:pb-0 ${
            vista === 'semana'
              ? 'overflow-hidden flex flex-col p-2 lg:p-4 lg:pt-4'
              : 'overflow-y-auto px-4 lg:px-8 py-5'
          }`}>
            <Suspense fallback={<ViewFallback />}>
              {vista === 'hoy'         && <ViewHoy />}
              {vista === 'proyectos'   && <ViewProyectos />}
              {vista === 'semana'      && <ViewCalendar />}
              {vista === 'finanzas'    && <ViewFinanzas />}
              {vista === 'inversiones' && <ViewInversiones />}
              {vista === 'datos'       && <ViewDatos />}
              {vista === 'equipo'      && <ViewEquipo />}
            </Suspense>
          </main>
        </div>
        {showModal && (
          <Suspense fallback={null}>
            <EventModal />
          </Suspense>
        )}
        {/* FAB de alta rápida de tarea (solo móvil, salvo en el calendario) */}
        {isMobile && vista !== 'semana' && (
          <button
            onClick={() => setQuickAdd(true)}
            aria-label="Nueva tarea"
            className="lg:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-lg shadow-black/20 flex items-center justify-center active:scale-95 transition-transform"
            style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)' }}
          >
            <Plus size={24} />
          </button>
        )}
        {quickAdd && <QuickAddTask onClose={() => setQuickAdd(false)} />}
        {/* Mobile bottom nav */}
        <nav className="mobile-bottomnav lg:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-white/[0.08] z-50 flex overflow-x-auto scrollbar-hide">
          {MOB_NAV.map(v => (
            <button key={v.id} onClick={() => setVista(v.id)}
              className={`min-w-[56px] flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-white/10 ${vista === v.id ? 'text-accent' : 'text-white/35 hover:text-white/70'}`}>
              {v.icon}
              <span className="text-[7px] font-bold uppercase tracking-wide whitespace-nowrap">{v.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-xs text-ink-3">Cargando…</div>
    </div>
  )
}
