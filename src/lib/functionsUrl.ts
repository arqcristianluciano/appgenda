const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export function getFunctionUrl(name: string): string {
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL no configurado')
  return `${SUPABASE_URL}/functions/v1/${name}`
}

export function getFunctionHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' }
  if (SUPABASE_ANON_KEY) {
    base['apikey'] = SUPABASE_ANON_KEY
    base['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
  }
  return { ...base, ...extra }
}
