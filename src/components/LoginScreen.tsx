import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { signInWithGoogle, completeRedirectSignIn } from '../services/auth'
import type { Session } from '../services/auth'

interface Props {
  onLogin: (s: Session) => void
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

export default function LoginScreen({ onLogin }: Props) {
  const [error, setError] = useState('')
  // Arranca ocupado mientras comprobamos si volvemos de un login por redirect.
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    let cancelled = false
    completeRedirectSignIn()
      .then(session => { if (!cancelled && session) onLogin(session) })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [onLogin])

  const handleLogin = async () => {
    setError('')
    setBusy(true)
    try {
      const session = await signInWithGoogle()
      if (session) { onLogin(session); return }
      // null = el usuario canceló, o se está redirigiendo a Google (la página navega)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.')
    }
    setBusy(false)
  }

  return (
    <div className="h-screen-safe flex flex-col items-center justify-center bg-sidebar relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full bg-accent/5 blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-sm w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
            <span className="text-white text-2xl font-extrabold tracking-tight">CL</span>
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-extrabold tracking-tight">APPgenda</h1>
            <p className="text-white/35 text-sm mt-1">Agenda personal</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center gap-6 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-white/70 text-sm font-medium">Inicia sesión</p>
            <p className="text-white/35 text-xs mt-1">Accede con tu cuenta de Google</p>
          </div>

          {/* Botón de Google */}
          <button
            onClick={handleLogin}
            disabled={busy}
            className="w-[280px] h-11 rounded-full bg-white text-[#3c4043] text-sm font-medium flex items-center justify-center gap-3 shadow-sm hover:shadow transition active:scale-[.99] disabled:opacity-70 disabled:cursor-default"
          >
            {busy
              ? <Loader2 size={18} className="animate-spin text-gray-500" />
              : <GoogleIcon />}
            <span>{busy ? 'Conectando…' : 'Continuar con Google'}</span>
          </button>

          {error && (
            <p className="text-red-400 text-xs text-center leading-relaxed bg-red-500/10 rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}
        </div>

        <p className="text-white/20 text-[11px] text-center">
          Gestiona tareas, finanzas y calendario con tu equipo
        </p>
      </div>
    </div>
  )
}
