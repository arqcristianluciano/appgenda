import { createClient } from '@supabase/supabase-js'

const URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabase = URL && KEY ? createClient(URL, KEY) : null
