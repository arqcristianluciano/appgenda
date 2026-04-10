import { useTeamStore } from '../store/useTeamStore'

export function useCanEdit(): boolean {
  const { members, profile, activeTeamId } = useTeamStore()
  if (!activeTeamId) return true
  const member = members.find(m => m.userId === profile?.id)
  return member?.role !== 'viewer'
}
