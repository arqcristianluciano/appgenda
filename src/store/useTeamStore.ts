import { create } from 'zustand'
import { collection, onSnapshot } from 'firebase/firestore'
import { db as fdb } from '../lib/firebase'
import { db, getUserId } from '../services/db'
import type { Team, TeamMember, Profile } from '../types'

let membersSub: (() => void) | null = null

interface TeamStore {
  teams: Team[]
  activeTeamId: string | null
  members: TeamMember[]
  profile: Profile | null
  loaded: boolean

  init: () => Promise<void>
  setActiveTeam: (id: string | null) => void
  createTeam: (name: string, color: string) => Promise<Team | null>
  updateTeam: (id: string, fields: { name?: string; color?: string }) => Promise<void>
  deleteTeam: (id: string) => Promise<void>
  inviteMember: (email: string) => Promise<{ ok: boolean; error?: string }>
  removeMember: (userId: string) => Promise<void>
  updateRole: (userId: string, role: TeamMember['role']) => Promise<void>
  searchUsers: (query: string) => Promise<Profile[]>
  getMember: (userId: string) => TeamMember | undefined
}

function watchMembers(teamId: string, onChange: (m: TeamMember[]) => void): () => void {
  if (!fdb) return () => {}
  let debounce: ReturnType<typeof setTimeout> | null = null
  const unsub = onSnapshot(collection(fdb, 'teams', teamId, 'members'), () => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(async () => {
      const m = await db.loadTeamMembers(teamId)
      onChange(m)
    }, 400)
  })
  return () => { unsub(); if (debounce) clearTimeout(debounce) }
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  activeTeamId: localStorage.getItem('activeTeamId'),
  members: [],
  profile: null,
  loaded: false,

  init: async () => {
    const userId = await getUserId()
    if (!userId) return
    const [teams, profile] = await Promise.all([
      db.loadTeams(),
      db.loadProfile(userId),
    ])
    set({ teams, profile, loaded: true })

    const savedTeam = localStorage.getItem('activeTeamId')
    let activeId: string | null = null
    if (savedTeam && teams.some(t => t.id === savedTeam)) activeId = savedTeam
    else if (teams.length > 0) activeId = teams[0].id

    if (activeId) {
      const members = await db.loadTeamMembers(activeId)
      set({ activeTeamId: activeId, members })
      localStorage.setItem('activeTeamId', activeId)
    }

    if (membersSub) membersSub()
    if (activeId) {
      membersSub = watchMembers(activeId, m => set({ members: m }))
    }
  },

  setActiveTeam: async (id) => {
    if (!id) {
      set({ activeTeamId: null, members: [] })
      localStorage.removeItem('activeTeamId')
      if (membersSub) { membersSub(); membersSub = null }
      return
    }
    localStorage.setItem('activeTeamId', id)
    set({ activeTeamId: id })
    const members = await db.loadTeamMembers(id)
    set({ members })
    if (membersSub) membersSub()
    membersSub = watchMembers(id, m => set({ members: m }))
  },

  createTeam: async (name, color) => {
    const userId = await getUserId()
    if (!userId) return null
    const team = await db.createTeam(name, color, userId)
    if (!team) return null
    const members = await db.loadTeamMembers(team.id)
    set(s => ({
      teams: [...s.teams, team],
      activeTeamId: team.id,
      members,
    }))
    localStorage.setItem('activeTeamId', team.id)
    if (membersSub) membersSub()
    membersSub = watchMembers(team.id, m => set({ members: m }))
    return team
  },

  updateTeam: async (id, fields) => {
    await db.updateTeam(id, fields)
    set(s => ({
      teams: s.teams.map(t => t.id === id ? { ...t, ...fields } : t),
    }))
  },

  deleteTeam: async (id) => {
    await db.deleteTeam(id)
    set(s => {
      const teams = s.teams.filter(t => t.id !== id)
      const next = teams[0]?.id ?? null
      if (next) localStorage.setItem('activeTeamId', next)
      else localStorage.removeItem('activeTeamId')
      return { teams, activeTeamId: next, members: [] }
    })
    const next = get().activeTeamId
    if (next) {
      const members = await db.loadTeamMembers(next)
      set({ members })
    }
  },

  inviteMember: async (email) => {
    const teamId = get().activeTeamId
    if (!teamId) return { ok: false, error: 'Sin equipo activo' }
    const profiles = await db.searchProfiles(email.toLowerCase())
    const match = profiles.find(p => p.email.toLowerCase() === email.toLowerCase())
    if (!match) return { ok: false, error: 'Usuario no registrado' }
    if (get().members.some(m => m.userId === match.id))
      return { ok: false, error: 'Ya es miembro del equipo' }
    await db.addTeamMember(teamId, match.id, 'editor')
    const members = await db.loadTeamMembers(teamId)
    set({ members })
    return { ok: true }
  },

  removeMember: async (userId) => {
    const teamId = get().activeTeamId
    if (!teamId) return
    await db.removeTeamMember(teamId, userId)
    set(s => ({ members: s.members.filter(m => m.userId !== userId) }))
  },

  updateRole: async (userId, role) => {
    const teamId = get().activeTeamId
    if (!teamId) return
    await db.updateMemberRole(teamId, userId, role)
    set(s => ({
      members: s.members.map(m =>
        m.userId === userId ? { ...m, role } : m
      ),
    }))
  },

  searchUsers: (q) => db.searchProfiles(q),

  getMember: (userId) => get().members.find(m => m.userId === userId),
}))
