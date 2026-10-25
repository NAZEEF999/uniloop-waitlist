// Request handler for POST /functions/v1/submit-waitlist
// Dependencies are injected so the same code runs in Deno (production) and Node (tests).
import { validateSubmission } from './validate.js'

const MAX_BODY_CHARS = 10_000
const RATE_LIMIT = 10                 // attempts ...
const RATE_WINDOW = '1 hour'          // ... per hashed IP per window

const GENERIC_ERROR = 'Something went wrong on our side. Please try again in a moment.'

function corsHeaders(req, allowedOrigins) {
  const origin = req.headers.get('origin')
  const list = (allowedOrigins ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  // No allow-list configured -> any origin may call this PUBLIC endpoint (it holds no secrets).
  const allow = list.length === 0 ? '*' : list.includes(origin ?? '') ? origin : list[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function clientIp(req) {
  const fwd = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')
  return (fwd ?? 'unknown').split(',')[0].trim() || 'unknown'
}

/**
 * @param {{ supabase: any, env: { allowedOrigins?: string, ipSalt?: string } }} deps
 *        `supabase` must be a client using the SERVICE ROLE key (server-side only).
 */
export function createHandler({ supabase, env }) {
  return async function handle(req) {
    const cors = corsHeaders(req, env.allowedOrigins)
    const json = (status, payload, extra = {}) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
      })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (req.method !== 'POST') return json(405, { ok: false, code: 'method_not_allowed', message: 'Method not allowed.' }, { Allow: 'POST, OPTIONS' })

    // ---- Parse (size-capped) -------------------------------------------------
    let body
    try {
      const declared = Number(req.headers.get('content-length') ?? 0)
      if (declared > MAX_BODY_CHARS) return json(413, { ok: false, code: 'payload_too_large', message: 'Request is too large.' })
      const text = await req.text()
      if (text.length > MAX_BODY_CHARS) return json(413, { ok: false, code: 'payload_too_large', message: 'Request is too large.' })
      body = JSON.parse(text)
    } catch {
      return json(400, { ok: false, code: 'bad_request', message: 'The request could not be read.' })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json(400, { ok: false, code: 'bad_request', message: 'The request could not be read.' })
    }

    // ---- Rate limit (salted hash of IP only; the IP itself is never stored) ---
    try {
      const ipHash = await hashIp(clientIp(req), env.ipSalt ?? '')
      const { data: allowed, error } = await supabase.rpc('record_submission_attempt', {
        p_ip_hash: ipHash, p_limit: RATE_LIMIT, p_window: RATE_WINDOW,
      })
      if (error) throw error
      if (allowed === false) {
        return json(429, { ok: false, code: 'rate_limited', message: 'Too many attempts. Please try again later.' }, { 'Retry-After': '3600' })
      }
    } catch (e) {
      console.error('rate-limit check failed', e?.code ?? 'unknown')
      return json(500, { ok: false, code: 'server_error', message: GENERIC_ERROR })
    }

    // ---- Honeypot: real people never fill this hidden field --------------------
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      // Pretend success so bots learn nothing; store nothing.
      return json(201, { ok: true, status: 'registered' })
    }

    // ---- Validate ----------------------------------------------------------------
    const result = validateSubmission(body)
    if (!result.ok) {
      return json(400, { ok: false, code: 'validation_error', message: 'Please check the highlighted fields.', errors: result.errors })
    }

    // ---- Insert (only whitelisted columns; privileged ones come from DB defaults/triggers)
    try {
      const { error } = await supabase.from('waitlist').insert(result.value)
      if (error) {
        if (error.code === '23505') {
          // Email already registered. Say nothing about the existing record.
          return json(200, { ok: true, status: 'already_registered' })
        }
        if (error.code === '23514' || error.code === '23502') {
          return json(400, { ok: false, code: 'validation_error', message: 'Please check your details and try again.', errors: {} })
        }
        throw error
      }
      return json(201, { ok: true, status: 'registered' })
    } catch (e) {
      // Log the error CODE only. Never log submitted personal details.
      console.error('waitlist insert failed', e?.code ?? 'unknown')
      return json(500, { ok: false, code: 'server_error', message: GENERIC_ERROR })
    }
  }
}
