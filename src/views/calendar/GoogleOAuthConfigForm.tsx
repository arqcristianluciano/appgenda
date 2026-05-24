import { useState } from 'react'
import { Loader2, ChevronDown, ExternalLink, Check, KeyRound } from 'lucide-react'

export default function GoogleOAuthConfigForm({ configured, onSave }: {
  configured: boolean
  onSave: (clientId: string, clientSecret: string) => Promise<void>
}) {
  // Si no hay credenciales, arranca abierto para guiar la configuración inicial.
  const [show, setShow] = useState(!configured)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!clientId.trim() || !clientSecret.trim() || busy) return
    setBusy(true); setError(''); setSaved(false)
    try {
      await onSave(clientId.trim(), clientSecret.trim())
      setSaved(true)
      setClientSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <button onClick={() => setShow(f => !f)}
        className="flex items-center gap-2 text-[12px] font-medium text-ink-3 hover:text-accent py-1.5 px-1 rounded-lg hover:bg-surface-2 transition-colors w-full">
        <KeyRound size={14} className="text-accent" />
        {configured ? 'Cambiar credenciales de Google' : 'Configurar Google (credenciales OAuth)'}
        <ChevronDown size={12} className={`ml-auto transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>

      {show && (
        <div className="mt-2 space-y-2 px-1">
          <p className="text-[10px] text-ink-3 leading-relaxed">
            Crea un{' '}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
              className="text-accent inline-flex items-center gap-0.5 hover:underline">
              cliente OAuth 2.0 <ExternalLink size={9} />
            </a>
            {' '}(tipo "Aplicación web") y pega aquí su Client ID y Client Secret. Agregá este dominio
            como origen autorizado.
          </p>
          <input value={clientId} onChange={e => { setClientId(e.target.value); setSaved(false) }}
            placeholder="Client ID (…apps.googleusercontent.com)"
            className="w-full text-[11px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink font-mono"
            style={{ borderColor: 'var(--edge)' }} />
          <input value={clientSecret} onChange={e => { setClientSecret(e.target.value); setSaved(false) }}
            type="password" placeholder="Client Secret"
            className="w-full text-[11px] bg-surface-2 border rounded-md px-2 py-1.5 outline-none focus:border-accent text-ink font-mono"
            style={{ borderColor: 'var(--edge)' }} />
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          {saved && (
            <p className="text-[11px] text-green-600 flex items-center gap-1">
              <Check size={11} /> Guardado. Ahora conectá tu cuenta de Google.
            </p>
          )}
          <button onClick={save} disabled={!clientId.trim() || !clientSecret.trim() || busy}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium bg-accent text-white py-1.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity">
            {busy && <Loader2 size={12} className="animate-spin" />}
            {busy ? 'Guardando…' : 'Guardar credenciales'}
          </button>
        </div>
      )}
    </div>
  )
}
