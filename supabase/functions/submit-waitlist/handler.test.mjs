// Unit tests: `node --test supabase/functions/submit-waitlist/`
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSubmission, normalizePhone } from './validate.js'
import { createHandler } from './handler.js'

const good = { fullName: ' Ada  Okafor ', email: ' ADA@Example.com ', university: 'OOU', intendedUse: 'buy' }

// ---- validate.js -----------------------------------------------------------
test('valid minimal submission is normalised and defaults consent to false', () => {
  const r = validateSubmission(good)
  assert.equal(r.ok, true)
  assert.deepEqual(r.value, {
    full_name: 'Ada Okafor', email: 'ada@example.com', university: 'OOU', intended_use: 'buy',
    interests: [], whatsapp_number: null, email_marketing_consent: false,
  })
})
test('only whitelisted columns are produced (privileged fields cannot be set)', () => {
  const r = validateSubmission({ ...good, status: 'converted', admin_notes: 'x', id: 'abc', created_at: '2000-01-01', consent_recorded_at: 'x', role: 'admin' })
  assert.equal(r.ok, true)
  for (const k of ['status', 'admin_notes', 'id', 'created_at', 'consent_recorded_at', 'role', 'updated_at']) assert.equal(k in r.value, false, k)
})
test('required fields are enforced', () => {
  const r = validateSubmission({})
  assert.equal(r.ok, false)
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'fullName', 'intendedUse', 'university'])
})
test('invalid university / intended use / email rejected', () => {
  assert.ok(validateSubmission({ ...good, university: 'LASU' }).errors.university)
  assert.ok(validateSubmission({ ...good, intendedUse: 'business' }).errors.intendedUse) // old frontend value is not valid
  assert.ok(validateSubmission({ ...good, email: 'nope' }).errors.email)
  assert.ok(validateSubmission({ ...good, email: 'a@b' }).errors.email)
})
test('non-string values are rejected, not coerced', () => {
  assert.ok(validateSubmission({ ...good, fullName: 123 }).errors.fullName)
  assert.ok(validateSubmission({ ...good, email: ['a@b.co'] }).errors.email)
  assert.ok(validateSubmission({ ...good, university: ['OOU'] }).errors.university)
})
test('interests: optional, validated, deduplicated', () => {
  assert.deepEqual(validateSubmission({ ...good, interests: ['food', 'food', 'fashion'] }).value.interests, ['food', 'fashion'])
  assert.ok(validateSubmission({ ...good, interests: ['guns'] }).errors.interests)
  assert.ok(validateSubmission({ ...good, interests: 'food' }).errors.interests)
  assert.equal(validateSubmission({ ...good, interests: [] }).ok, true)
})
test('whatsapp: optional; normalised to +234 form; bad numbers rejected', () => {
  assert.equal(validateSubmission({ ...good, whatsapp: '' }).ok, true)
  assert.equal(validateSubmission({ ...good, whatsapp: '0801 234 5678' }).value.whatsapp_number, '+2348012345678')
  assert.equal(validateSubmission({ ...good, whatsapp: '+2348012345678' }).value.whatsapp_number, '+2348012345678')
  assert.equal(validateSubmission({ ...good, whatsapp: '+14155552671' }).value.whatsapp_number, '+14155552671')
  assert.ok(validateSubmission({ ...good, whatsapp: '123' }).errors.whatsapp)
  assert.ok(validateSubmission({ ...good, whatsapp: 'call me' }).errors.whatsapp)
  assert.equal(normalizePhone('0612345678'), null)
})
test('consent must be a real boolean', () => {
  assert.equal(validateSubmission({ ...good, emailConsent: true }).value.email_marketing_consent, true)
  assert.equal(validateSubmission({ ...good, emailConsent: false }).value.email_marketing_consent, false)
  assert.ok(validateSubmission({ ...good, emailConsent: 'true' }).errors.emailConsent)
  assert.ok(validateSubmission({ ...good, emailConsent: 1 }).errors.emailConsent)
})
test('name length / control characters', () => {
  assert.ok(validateSubmission({ ...good, fullName: 'A' }).errors.fullName)
  assert.ok(validateSubmission({ ...good, fullName: 'x'.repeat(101) }).errors.fullName)
  assert.ok(validateSubmission({ ...good, fullName: 'Ada\u0000Okafor' }).errors.fullName)
})

// ---- handler.js (with a fake Supabase client) ------------------------------
function fakeSupabase({ allowed = true, insertError = null, rpcError = null } = {}) {
  const calls = { inserts: [], rpc: [] }
  return {
    calls,
    rpc: async (name, args) => { calls.rpc.push({ name, args }); return rpcError ? { data: null, error: rpcError } : { data: allowed, error: null } },
    from: (table) => ({ insert: async (row) => { calls.inserts.push({ table, row }); return { error: insertError } } }),
  }
}
const req = (body, { method = 'POST', headers = {}, raw } = {}) =>
  new Request('http://x/functions/v1/submit-waitlist', {
    method, headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: method === 'POST' ? (raw ?? JSON.stringify(body)) : undefined,
  })
const make = (sb) => createHandler({ supabase: sb, env: { ipSalt: 'salt', allowedOrigins: '' } })

test('201 on success; inserts only whitelisted columns into waitlist', async () => {
  const sb = fakeSupabase(); const res = await make(sb)(req({ ...good, status: 'converted', admin_notes: 'hi' }))
  assert.equal(res.status, 201); assert.deepEqual(await res.json(), { ok: true, status: 'registered' })
  assert.equal(sb.calls.inserts.length, 1); assert.equal(sb.calls.inserts[0].table, 'waitlist')
  assert.equal('status' in sb.calls.inserts[0].row, false); assert.equal('admin_notes' in sb.calls.inserts[0].row, false)
})
test('rate limit receives a salted hash, never the raw IP', async () => {
  const sb = fakeSupabase(); await make(sb)(req(good))
  const h = sb.calls.rpc[0].args.p_ip_hash
  assert.match(h, /^[0-9a-f]{64}$/); assert.ok(!h.includes('203.0.113.7'))
})
test('duplicate email -> friendly 200 already_registered, no details leaked', async () => {
  const res = await make(fakeSupabase({ insertError: { code: '23505', message: 'duplicate key value violates unique constraint "waitlist_email_unique"', details: 'Key (email)=(ada@example.com) already exists.' } }))(req(good))
  assert.equal(res.status, 200); const j = await res.json()
  assert.deepEqual(j, { ok: true, status: 'already_registered' })
})
test('validation failure -> 400 with field errors and nothing inserted', async () => {
  const sb = fakeSupabase(); const res = await make(sb)(req({ ...good, university: 'LASU', email: 'bad' }))
  assert.equal(res.status, 400); const j = await res.json()
  assert.equal(j.code, 'validation_error'); assert.ok(j.errors.university && j.errors.email); assert.equal(sb.calls.inserts.length, 0)
})
test('honeypot filled -> fake success, nothing stored', async () => {
  const sb = fakeSupabase(); const res = await make(sb)(req({ ...good, website: 'http://spam.example' }))
  assert.equal(res.status, 201); assert.equal(sb.calls.inserts.length, 0)
})
test('rate limited -> 429 and nothing stored', async () => {
  const sb = fakeSupabase({ allowed: false }); const res = await make(sb)(req(good))
  assert.equal(res.status, 429); assert.equal((await res.json()).code, 'rate_limited'); assert.equal(sb.calls.inserts.length, 0)
})
test('database error -> generic 500 with no internals', async () => {
  const res = await make(fakeSupabase({ insertError: { code: 'XX000', message: 'SECRET internal detail', details: 'table waitlist' } }))(req(good))
  assert.equal(res.status, 500); const text = JSON.stringify(await res.json())
  assert.ok(!/SECRET|waitlist|XX000/.test(text))
})
test('rate-limit infrastructure failure fails closed (500), nothing stored', async () => {
  const sb = fakeSupabase({ rpcError: { code: '42883', message: 'function missing' } }); const res = await make(sb)(req(good))
  assert.equal(res.status, 500); assert.equal(sb.calls.inserts.length, 0)
})
test('bad JSON, arrays, oversized bodies, wrong method', async () => {
  const h = make(fakeSupabase())
  assert.equal((await h(req(null, { raw: '{not json' }))).status, 400)
  assert.equal((await h(req(null, { raw: '[1,2]' }))).status, 400)
  assert.equal((await h(req(null, { raw: JSON.stringify({ ...good, junk: 'x'.repeat(20000) }) }))).status, 413)
  assert.equal((await h(req(null, { method: 'GET' }))).status, 405)
})
test('CORS: preflight 204; allow-list respected', async () => {
  const h = createHandler({ supabase: fakeSupabase(), env: { allowedOrigins: 'https://uniloop.example', ipSalt: 's' } })
  const pre = await h(new Request('http://x/', { method: 'OPTIONS', headers: { origin: 'https://uniloop.example' } }))
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), 'https://uniloop.example')
  const evil = await h(new Request('http://x/', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }))
  assert.equal(evil.headers.get('access-control-allow-origin'), 'https://uniloop.example')
})
