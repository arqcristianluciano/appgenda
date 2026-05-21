import { useStore } from '../store/useStore'
import { useTeamStore } from '../store/useTeamStore'
import { Users, User } from 'lucide-react'
import type { FiltroScope } from '../types'

export default function ScopeFilter() {
  const { filtroScope, setFiltroScope } = useStore()
  const hasTeam = useTeamStore(s => s.teams.length > 0)

  if (!hasTeam) return null

  const items: { id: FiltroScope; label: string; icon: React.ReactNode }[] = [
    { id: 'todos', label: 'Todas', icon: null },
    { id: 'personal', label: 'Personal', icon: <User size={11} /> },
    { id: 'equipo', label: 'Equipo', icon: <Users size={11} /> },
  ]

  return (
    <div className="flex gap-1.5 mb-2">
      {items.map(i => (
        <button key={i.id} onClick={() => setFiltroScope(i.id)}
          className={`h-6 px-2.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all
            ${filtroScope === i.id ? 'bg-accent/15 text-accent' : 'text-ink-3 hover:text-ink-2'}`}>
          {i.icon}{i.label}
        </button>
      ))}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScopeFilter<T extends { teamId?: string | null }>(items: T[]): T[] {
  const filtroScope = useStore(s => s.filtroScope)
  const activeTeamId = useTeamStore(s => s.activeTeamId)

  if (filtroScope === 'personal') return items.filter(t => !t.teamId)
  if (filtroScope === 'equipo') return items.filter(t => t.teamId === activeTeamId)
  return items
}
