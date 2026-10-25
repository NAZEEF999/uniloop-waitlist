// Sensible phone handling for Nigerian students, while still allowing
// international numbers written with a leading "+".
//
// parsePhone("0801 234 5678") -> { valid: true, digits: "2348012345678" }
// `digits` is the international format without "+", which is what wa.me needs.

const ok = (digits) => ({ valid: true, empty: false, digits })
const bad = { valid: false, empty: false, digits: '' }

export function parsePhone(raw = '') {
  const s = raw.trim()
  if (!s) return { valid: true, empty: true, digits: '' }
  if (!/^\+?[\d\s\-()]+$/.test(s)) return bad

  const d = s.replace(/\D/g, '')

  if (d.startsWith('234')) {
    return /^234[789][01]\d{8}$/.test(d) ? ok(d) : bad
  }
  if (s.startsWith('+')) {
    return d.length >= 8 && d.length <= 15 ? ok(d) : bad
  }
  if (/^0[789][01]\d{8}$/.test(d)) return ok('234' + d.slice(1))
  return bad
}

export const PHONE_ERROR =
  'Enter a valid number, like 08012345678 or +2348012345678.'
