// Admin authentication via Supabase Auth (email + password).
// There is NO public sign-up. Admin users are created by a project administrator
// (Supabase dashboard -> Authentication -> Users) and then added to `admin_users`.
//
// Signing in is not enough: after authenticating we confirm the user has an ACTIVE row in
// `admin_users`. That check is for a good UX only: Row Level Security independently
// blocks every private query for anyone who isn't an active admin.
import { CONFIG_ERROR_MESSAGE, isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export class AuthError extends Error {
  /** @param {'config'|'invalid_credentials'|'not_admin'|'inactive'|'network'|'rate_limited'|'unknown'} code */
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const isNetworkError = (e) =>
  e?.name === 'AuthRetryableFetchError' || e?.name === 'TypeError' || /fetch|network/i.test(e?.message ?? '')

/** Checks the signed-in user against admin_users. Throws AuthError if not an active admin. */
export async function verifyAdmin(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (isNetworkError(error)) throw new AuthError('network', 'We couldn’t reach the server. Check your connection and try again.')
    throw new AuthError('unknown', 'We couldn’t verify your admin access. Please try again.')
  }
  if (!data || data.role !== 'admin') throw new AuthError('not_admin', 'This account isn’t authorized to use the admin dashboard.')
  if (!data.is_active) throw new AuthError('inactive', 'This admin account has been deactivated. Contact a project administrator.')
}

export async function signInAdmin({ email, password }) {
  if (!isSupabaseConfigured) throw new AuthError('config', CONFIG_ERROR_MESSAGE)

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    if (isNetworkError(error)) throw new AuthError('network', 'We couldn’t reach the server. Check your connection and try again.')
    if (error.status === 429) throw new AuthError('rate_limited', 'Too many sign-in attempts. Please wait a few minutes and try again.')
    if (error.status === 400 || error.status === 401 || error.code === 'invalid_credentials') {
      throw new AuthError('invalid_credentials', 'Invalid email or password.')
    }
    throw new AuthError('unknown', 'We couldn’t sign you in. Please try again.')
  }

  try {
    await verifyAdmin(data.user.id)
  } catch (e) {
    await supabase.auth.signOut({ scope: 'local' }) // never leave a non-admin session around
    throw e
  }
  return { id: data.user.id, email: data.user.email }
}

export async function signOutAdmin() {
  if (!supabase) return
  // 'local' guarantees the browser session is cleared even if the network call fails.
  await supabase.auth.signOut({ scope: 'local' })
  try { await supabase.auth.signOut() } catch { /* already signed out locally */ }
}
