// Supabase Edge Function: submit-waitlist
// Public endpoint for the waitlist form. Uses the SERVICE ROLE key, which exists only in this
// server-side environment (Supabase injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically).
//
// Optional secrets (set with `supabase secrets set`):
//   RATE_LIMIT_SALT   random string used to hash IPs for rate limiting (strongly recommended)
//   ALLOWED_ORIGINS   comma-separated list of site origins allowed to call this function
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHandler } from './handler.js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

Deno.serve(
  createHandler({
    supabase,
    env: {
      allowedOrigins: Deno.env.get('ALLOWED_ORIGINS') ?? '',
      ipSalt: Deno.env.get('RATE_LIMIT_SALT') ?? '',
    },
  }),
)
