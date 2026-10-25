// Server-side validation for public waitlist submissions.
// Plain ES module (no Deno/Node specifics) so it can be unit-tested with `node --test`.
// The frontend validates too, but NOTHING here trusts the client.

export const UNIVERSITIES = ['OOU', 'UNILESA']
export const INTENDED_USES = ['buy', 'sell', 'both', 'student_business']
export const INTERESTS = ['hostel', 'electronics', 'textbooks', 'fashion', 'food', 'other']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Intentionally matches control characters so they can be rejected.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/

/** Returns "+<digits>" (international) or null if the number isn't acceptable. */
export function normalizePhone(raw) {
  const s = String(raw).trim()
  if (!/^\+?[\d\s\-()]+$/.test(s)) return null
  const d = s.replace(/\D/g, '')
  if (d.startsWith('234')) return /^234[789][01]\d{8}$/.test(d) ? `+${d}` : null
  if (s.startsWith('+')) return d.length >= 8 && d.length <= 15 ? `+${d}` : null
  if (/^0[789][01]\d{8}$/.test(d)) return `+234${d.slice(1)}`
  return null
}

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

/**
 * @returns {{ ok: true, value: object } | { ok: false, errors: Record<string,string> }}
 * `value` contains ONLY the fields a visitor is allowed to supply, in database column names.
 * Privileged columns (status, admin_notes, timestamps, id) are never produced here.
 */
export function validateSubmission(body) {
  const errors = {}
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {}

  // Full name
  let fullName = ''
  if (typeof b.fullName !== 'string' || isBlank(b.fullName)) errors.fullName = 'Enter your full name.'
  else {
    fullName = b.fullName.trim().replace(/\s+/g, ' ')
    if (fullName.length < 2) errors.fullName = 'Your name looks too short. Please enter your full name.'
    else if (fullName.length > 100) errors.fullName = 'Your name is too long (100 characters maximum).'
    else if (CONTROL_CHARS.test(fullName)) errors.fullName = 'Your name contains invalid characters.'
  }

  // Email
  let email = ''
  if (typeof b.email !== 'string' || isBlank(b.email)) errors.email = 'Enter your email address.'
  else {
    email = b.email.trim().toLowerCase()
    if (email.length > 254 || !EMAIL_RE.test(email) || CONTROL_CHARS.test(email)) {
      errors.email = 'Enter a valid email address, like name@example.com.'
    }
  }

  // University / intended use (closed lists)
  if (!UNIVERSITIES.includes(b.university)) errors.university = 'Select OOU or UNILESA.'
  if (!INTENDED_USES.includes(b.intendedUse)) errors.intendedUse = 'Choose how you plan to use Uniloop.'

  // Interests (optional)
  let interests = []
  if (!isBlank(b.interests)) {
    if (!Array.isArray(b.interests) || b.interests.some((i) => typeof i !== 'string' || !INTERESTS.includes(i))) {
      errors.interests = 'One or more product interests are not valid.'
    } else {
      interests = [...new Set(b.interests)]
    }
  }

  // WhatsApp (optional)
  let whatsapp = null
  if (!isBlank(b.whatsapp)) {
    whatsapp = typeof b.whatsapp === 'string' ? normalizePhone(b.whatsapp) : null
    if (!whatsapp) errors.whatsapp = 'Enter a valid number, like 08012345678 or +2348012345678.'
  }

  // Email marketing consent (optional; must be a real boolean, defaults to false)
  let consent = false
  if (b.emailConsent !== undefined && b.emailConsent !== null) {
    if (typeof b.emailConsent !== 'boolean') errors.emailConsent = 'Invalid consent value.'
    else consent = b.emailConsent
  }

  if (Object.keys(errors).length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      full_name: fullName,
      email,
      university: b.university,
      intended_use: b.intendedUse,
      interests,
      whatsapp_number: whatsapp,
      email_marketing_consent: consent,
    },
  }
}
