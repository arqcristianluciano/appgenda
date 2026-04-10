import { useState } from 'react'
import { useTeamStore } from '../../store/useTeamStore'
import MemberAvatar from '../../components/MemberAvatar'
import InviteMemberForm from './InviteMemberForm'
import CreateTeamForm from './CreateTeamForm'
import { Crown, Shield, Eye, Trash2, Users, Pencil, Check } from 'lucide-react'
import type { TeamMember } from '../../types'

const ROLE_ICONS: Record<TeamMember['role'], React.ReactNode> = {
  admin: <Crown size={12} className="text-amber-500" />,
  editor: <Shield size={12} className="text-blue-400" />,
  viewer: <Eye size={12} className="text-ink-3" />,
}

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  admin: 'Admin', editor: 'Editor', viewer: 'Lector',
}

export default function ViewEquipo() {
  const { teams, activeTeamId, members, setActiveTeam, removeMember, updateRole, updateTeam, deleteTeam, profile } = useTeamStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editName, setEditName] = useState('')
  const [editing, setEditing] = useState(false)
  const activeTeam = teams.find(t => t.id === activeTeamId)
  const isAdmin = members.some(m => m.userId === profile?.id && m.role === 'admin')

  if (teams.length === 0) {
    return (
      <div className="max-w-md mx-auto pt-12">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Crea tu primer equipo</h2>
          <p className="text-[13px] text-ink-2">Invita miembros y colabora en tareas, proyectos y más.</p>
        </div>
        <CreateTeamForm />
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {teams.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTeam(t.id)}
            className={`h-8 px-3 rounded-full text-[12px] font-semibold border transition-all flex items-center gap-1.5
              ${t.id === activeTeamId ? 'border-accent text-accent bg-accent/10' : 'border-edge-strong text-ink-2 hover:border-accent'}`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
            {t.name}
          </button>
        ))}
        <button
          onClick={() => setShowCreate(v => !v)}
          className="h-8 px-3 rounded-full text-[12px] font-semibold border border-dashed border-ink-4 text-ink-3 hover:border-accent hover:text-accent transition-all"
        >
          + Nuevo equipo
        </button>
      </div>

      {showCreate && <div className="mb-5"><CreateTeamForm onCreated={() => setShowCreate(false)} /></div>}

      {activeTeam && (
        <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAdmin && !editing ? (
                <TeamColorPicker color={activeTeam.color} onChange={c => updateTeam(activeTeam.id, { color: c })} />
              ) : (
                <span className="w-3 h-3 rounded-full" style={{ background: activeTeam.color }} />
              )}
              {editing ? (
                <input autoFocus className="text-[15px] font-bold text-ink bg-surface-2 border border-accent rounded px-2 py-0.5 outline-none"
                  value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { updateTeam(activeTeam.id, { name: editName.trim() }); setEditing(false) } }}
                  onBlur={() => { if (editName.trim()) updateTeam(activeTeam.id, { name: editName.trim() }); setEditing(false) }}
                />
              ) : (
                <h3 className="text-[15px] font-bold text-ink">{activeTeam.name}</h3>
              )}
              <span className="text-[11px] text-ink-3 bg-surface-2 px-2 py-0.5 rounded-full">{members.length} miembros</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditName(activeTeam.name); setEditing(!editing) }}
                  className="text-ink-4 hover:text-accent transition-colors"
                  title="Editar equipo"
                >
                  {editing ? <Check size={15} /> : <Pencil size={15} />}
                </button>
                <button
                  onClick={() => { if (confirm('¿Eliminar este equipo?')) deleteTeam(activeTeam.id) }}
                  className="text-ink-4 hover:text-red-500 transition-colors"
                  title="Eliminar equipo"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-edge">
            {members.map(m => (
              <MemberRow key={m.id} member={m} isAdmin={isAdmin} currentUserId={profile?.id} onRemove={removeMember} onChangeRole={updateRole} />
            ))}
          </div>

          {isAdmin && <div className="p-4 border-t border-edge"><InviteMemberForm /></div>}
        </div>
      )}
    </div>
  )
}

const TEAM_COLORS = ['#2B5E3E', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

function TeamColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-4 h-4 rounded-full ring-2 ring-offset-1 ring-transparent hover:ring-accent transition-all" style={{ background: color }} />
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-surface border border-edge rounded-lg shadow-xl p-2 flex gap-1.5 z-50">
          {TEAM_COLORS.map(c => (
            <button key={c} onClick={() => { onChange(c); setOpen(false) }}
              className={`w-6 h-6 rounded-full transition-transform ${c === color ? 'ring-2 ring-accent scale-110' : 'hover:scale-105'}`}
              style={{ background: c }} />
          ))}
        </div>
      )}
    </div>
  )
}

function MemberRow({ member, isAdmin, currentUserId, onRemove, onChangeRole }: {
  member: TeamMember
  isAdmin: boolean
  currentUserId?: string
  onRemove: (userId: string) => void
  onChangeRole: (userId: string, role: TeamMember['role']) => void
}) {
  const isSelf = member.userId === currentUserId

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
      <MemberAvatar profile={member.profile} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink truncate">
          {member.profile?.name ?? 'Sin nombre'}
          {isSelf && <span className="text-ink-3 text-[11px] ml-1">(tú)</span>}
        </div>
        <div className="text-[11px] text-ink-3 truncate">{member.profile?.email}</div>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && !isSelf ? (
          <select
            value={member.role}
            onChange={e => onChangeRole(member.userId, e.target.value as TeamMember['role'])}
            className="h-7 px-2 bg-surface-2 border border-edge-mid rounded text-[11px] text-ink outline-none"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Lector</option>
          </select>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-ink-3">
            {ROLE_ICONS[member.role]} {ROLE_LABELS[member.role]}
          </span>
        )}

        {isAdmin && !isSelf && (
          <button
            onClick={() => { if (confirm('¿Eliminar miembro?')) onRemove(member.userId) }}
            className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
