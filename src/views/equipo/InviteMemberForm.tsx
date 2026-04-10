import { useState } from 'react'
import { useTeamStore } from '../../store/useTeamStore'
import { UserPlus, Loader2 } from 'lucide-react'

export default function InviteMemberForm() {
  const { inviteMember } = useTeamStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const handleInvite = async () => {
    if (!email.trim()) return
    setLoading(true)
    setMsg(null)
    const res = await inviteMember(email.trim())
    setLoading(false)
    if (res.ok) {
      setMsg({ text: 'Miembro agregado', ok: true })
      setEmail('')
    } else {
      setMsg({ text: res.error ?? 'Error', ok: false })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-[11px] font-semibold text-ink-2 block mb-1">Invitar por email</label>
        <input
          type="email"
          placeholder="email@ejemplo.com"
          className="w-full h-9 px-3 bg-surface border border-edge-strong rounded-lg text-[13px] text-ink outline-none focus:border-accent"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleInvite()}
        />
      </div>
      <button
        onClick={handleInvite}
        disabled={loading || !email.trim()}
        className="h-9 px-4 bg-accent text-white text-[12px] font-bold rounded-lg hover:bg-accent-2 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        Invitar
      </button>
      {msg && (
        <span className={`text-[11px] font-medium ${msg.ok ? 'text-green-500' : 'text-red-500'}`}>
          {msg.text}
        </span>
      )}
    </div>
  )
}
