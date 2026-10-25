// Public waitlist submission, via the `submit-waitlist` Edge Function.
// The browser never writes to the database directly: the function validates the request
// server-side and uses the service-role key (which exists only on the server).
import { CONFIG_ERROR_MESSAGE, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '../lib/supabaseClient'

export class WaitlistError extends Error {
  /** @param {'validation'|'rate_limited'|'network'|'server'|'config'} kind */
  constructor(kind, message, fieldErrors = {}) {
    super(message)
    this.kind = kind
    this.fieldErrors = fieldErrors
  }
}

const TIMEOUT_MS = 15_000

/**
 * @param {{ fullName:string, email:string, university:string, intendedUse:string,
 *           interests:string[], whatsapp:string, emailConsent:boolean, website?:string }} payload
 * @returns {Promise<{ status: 'registered' | 'already_registered' }>}  resolves ONLY when the server confirms.
 */
export async function submitWaitlistEntry(payload) {
  if (!isSupabaseConfigured) throw new WaitlistError('config', CONFIG_ERROR_MESSAGE)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/submit-waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch {
    throw new WaitlistError('network', 'We couldn’t reach the server. Please check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  let data = null
  try { data = await res.json() } catch { /* non-JSON body */ }

  if (res.ok && data?.ok === true && (data.status === 'registered' || data.status === 'already_registered')) {
    return { status: data.status }
  }
  if (res.status === 400 && data?.code === 'validation_error') {
    throw new WaitlistError('validation', data.message || 'Please check the highlighted fields.', data.errors || {})
  }
  if (res.status === 429) {
    throw new WaitlistError('rate_limited', 'Too many attempts from your connection. Please wait a little while and try again.')
  }
  throw new WaitlistError('server', 'Something went wrong on our side. Please try again in a moment.')
}
