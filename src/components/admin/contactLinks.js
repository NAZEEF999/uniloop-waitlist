import { parsePhone } from '../../lib/phone'

// Contact links are always built from the selected record's own data.
export const mailtoHref = (record) =>
  `mailto:${record.email}?subject=${encodeURIComponent('Your Uniloop waitlist sign-up')}`

export function whatsappHref(record) {
  const { valid, digits } = parsePhone(record.whatsapp)
  return valid && digits ? `https://wa.me/${digits}` : null
}
