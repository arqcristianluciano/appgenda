import { create } from 'zustand'

interface CalendarSyncStore {
  // Google
  googleBusy: boolean
  googleError: string
  googleNeedsAuth: Set<string>
  googleLoaded: Set<string>
  googleFailCount: Map<string, number>

  // iCloud
  icloudBusy: boolean
  icloudError: string
  icloudNeedsReauth: boolean
  icloudFailCount: number

  // Setters Google
  setGoogleBusy: (v: boolean) => void
  setGoogleError: (v: string) => void
  setGoogleNeedsAuth: (fn: (s: Set<string>) => Set<string>) => void
  markGoogleLoaded: (email: string) => void
  unmarkGoogleLoaded: (email: string) => void
  bumpGoogleFail: (email: string) => number
  resetGoogleFail: (email: string) => void

  // Setters iCloud
  setIcloudBusy: (v: boolean) => void
  setIcloudError: (v: string) => void
  setIcloudNeedsReauth: (v: boolean) => void
  bumpIcloudFail: () => number
  resetIcloudFail: () => void
}

export const useCalendarSyncStore = create<CalendarSyncStore>((set, get) => ({
  googleBusy: false,
  googleError: '',
  googleNeedsAuth: new Set<string>(),
  googleLoaded: new Set<string>(),
  googleFailCount: new Map<string, number>(),

  icloudBusy: false,
  icloudError: '',
  icloudNeedsReauth: false,
  icloudFailCount: 0,

  setGoogleBusy: (googleBusy) => set({ googleBusy }),
  setGoogleError: (googleError) => set({ googleError }),
  setGoogleNeedsAuth: (fn) => set(s => ({ googleNeedsAuth: fn(s.googleNeedsAuth) })),
  markGoogleLoaded: (email) => {
    const s = new Set(get().googleLoaded); s.add(email)
    set({ googleLoaded: s })
  },
  unmarkGoogleLoaded: (email) => {
    const s = new Set(get().googleLoaded); s.delete(email)
    set({ googleLoaded: s })
  },
  bumpGoogleFail: (email) => {
    const m = new Map(get().googleFailCount)
    const next = (m.get(email) ?? 0) + 1
    m.set(email, next)
    set({ googleFailCount: m })
    return next
  },
  resetGoogleFail: (email) => {
    const m = new Map(get().googleFailCount)
    m.set(email, 0)
    set({ googleFailCount: m })
  },

  setIcloudBusy: (icloudBusy) => set({ icloudBusy }),
  setIcloudError: (icloudError) => set({ icloudError }),
  setIcloudNeedsReauth: (icloudNeedsReauth) => set({ icloudNeedsReauth }),
  bumpIcloudFail: () => {
    const next = get().icloudFailCount + 1
    set({ icloudFailCount: next })
    return next
  },
  resetIcloudFail: () => set({ icloudFailCount: 0 }),
}))
