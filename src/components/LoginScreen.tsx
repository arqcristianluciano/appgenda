import { useEffect, useRef, useState } from 'react'
import { initGoogleSignIn, renderGoogleButton } from '../services/auth'
import type { Session } from '../services/auth'

interface Props {
  onLogin: (s: Session) => void
}

export default function LoginScreen({ onLogin }: Props) {
  const btnRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const attempt = () => {
      if (window.google?.accounts?.id) {
        initGoogleSignIn(onLogin, setError)
        if (btnRef.current) renderGoogleButton(btnRef.current)
        setReady(true)
      } else {
        setTimeout(attempt, 300)
      }
    }
    attempt()
  }, [onLogin])

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-sidebar relative overflow-hidden">
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
            <p className="text-white/70 text-sm font-medium">Acceso privado</p>
            <p className="text-white/35 text-xs mt-1">Solo para uso personal</p>
          </div>

          {/* Botón de Google */}
          <div className="flex flex-col items-center gap-3 w-full">
            {ready ? (
              <div ref={btnRef} className="flex justify-center" />
            ) : (
              <div className="h-11 w-[280px] rounded-full bg-white/10 animate-pulse" />
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center leading-relaxed bg-red-500/10 rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}
        </div>

        <p className="text-white/20 text-[11px] text-center">
          Solo la cuenta autorizada puede acceder
        </p>
      </div>
    </div>
  )
}
