import { createClient } from '@supabase/supabase-js'

// Only PUBLIC credentials are used here. The service-role key must never appear in frontend code.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)
export const supabaseUrl = url
export const supabaseAnonKey = anonKey

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

export const CONFIG_ERROR_MESSAGE =
  'The app isn’t connected to Supabase yet. Copy .env.example to .env, add your project URL and anon key, then restart the dev server.'
