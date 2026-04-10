import { useState } from 'react'
import { useTeamStore } from '../../store/useTeamStore'
import { Plus, Loader2 } from 'lucide-react'

const COLORS = ['#2B5E3E', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function CreateTeamForm({ onCreated }: { onCreated?: () => void }) {
  const { createTeam } = useTeamStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    await createTeam(name.trim(), color)
    setLoading(false)
    setName('')
    onCreated?.()
  }

  return (
    <div className="bg-surface border border-edge rounded-xl p-4 shadow-sm">
      <h3 className="text-[14px] font-bold text-ink mb-3">Crear equipo</h3>
      <input
        className="w-full h-9 px-3 mb-3 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none focus:border-accent"
        placeholder="Nombre del equipo"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
      />
      <div className="flex gap-2 mb-3">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-accent scale-110 dark:ring-offset-surface-bg' : 'hover:scale-105'}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <button
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        className="h-9 px-4 bg-accent text-white text-[12px] font-bold rounded-lg hover:bg-accent-2 transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Crear equipo
      </button>
    </div>
  )
}
