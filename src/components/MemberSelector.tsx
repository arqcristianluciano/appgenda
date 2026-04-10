import { useTeamStore } from '../store/useTeamStore'
import MemberAvatar from './MemberAvatar'

interface Props {
  value: string | null | undefined
  onChange: (userId: string | null) => void
  compact?: boolean
}

export default function MemberSelector({ value, onChange, compact }: Props) {
  const { members } = useTeamStore()

  if (members.length === 0) return null

  if (compact) {
    const selected = members.find(m => m.userId === value)
    return (
      <div className="relative group">
        <button
          type="button"
          className="w-7 h-7 rounded-full border border-dashed border-ink-4 flex items-center justify-center hover:border-accent transition-colors"
          title={selected?.profile?.name ?? 'Asignar miembro'}
        >
          {selected?.profile ? (
            <MemberAvatar profile={selected.profile} size={24} />
          ) : (
            <span className="text-ink-4 text-[10px] font-bold">+</span>
          )}
        </button>
        <DropdownList value={value} members={members} onChange={onChange} />
      </div>
    )
  }

  return (
    <select
      className="h-9 px-2 bg-surface-2 border border-edge-mid rounded-lg text-[13px] text-ink outline-none"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
    >
      <option value="">Sin asignar</option>
      {members.map(m => (
        <option key={m.userId} value={m.userId}>
          {m.profile?.name ?? m.userId.slice(0, 8)}
        </option>
      ))}
    </select>
  )
}

function DropdownList({ value, members, onChange }: {
  value: string | null | undefined
  members: ReturnType<typeof useTeamStore.getState>['members']
  onChange: (userId: string | null) => void
}) {
  return (
    <div className="absolute right-0 top-full mt-1 bg-surface border border-edge rounded-lg shadow-xl py-1 min-w-[180px] z-50 hidden group-hover:block">
      <button
        onClick={() => onChange(null)}
        className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-2 transition-colors
          ${!value ? 'text-accent font-semibold' : 'text-ink-2'}`}
      >
        Sin asignar
      </button>
      {members.map(m => (
        <button
          key={m.userId}
          onClick={() => onChange(m.userId)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-surface-2 transition-colors
            ${value === m.userId ? 'text-accent font-semibold' : 'text-ink'}`}
        >
          <MemberAvatar profile={m.profile} size={20} />
          <span className="truncate">{m.profile?.name ?? m.userId.slice(0, 8)}</span>
          <span className="ml-auto text-[10px] text-ink-3">{m.role}</span>
        </button>
      ))}
    </div>
  )
}
