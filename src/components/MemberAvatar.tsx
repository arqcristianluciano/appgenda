import type { Profile } from '../types'

interface Props {
  profile?: Profile | null
  size?: number
  className?: string
}

export default function MemberAvatar({ profile, size = 24, className = '' }: Props) {
  if (!profile) return null

  const initials = profile.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        title={profile.name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      title={profile.name}
      className={`rounded-full bg-accent flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
}
