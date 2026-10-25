// Shared options used by the public form AND the admin dashboard,
// so labels stay consistent everywhere (and map 1:1 to future API enums).

export const UNIVERSITIES = [
  { value: 'OOU', label: 'OOU — Olabisi Onabanjo University', short: 'OOU' },
  { value: 'UNILESA', label: 'UNILESA — University of Ilesa', short: 'UNILESA' },
]

export const USE_OPTIONS = [
  { value: 'buy', label: 'Buy products', short: 'Buy' },
  { value: 'sell', label: 'Sell products', short: 'Sell' },
  { value: 'both', label: 'Both buy and sell', short: 'Both' },
  { value: 'student_business', label: 'Promote my student business', short: 'Student Business' },
]

export const INTERESTS = [
  { value: 'hostel', label: 'Hostel and household essentials' },
  { value: 'electronics', label: 'Electronics and technology' },
  { value: 'textbooks', label: 'Textbooks and academic materials' },
  { value: 'fashion', label: 'Fashion and accessories' },
  { value: 'food', label: 'Food and student businesses' },
  { value: 'other', label: 'Other products' },
]

// Values match the database exactly (lowercase); labels are what people see.
export const STATUSES = ['new', 'contacted', 'interested', 'converted']
export const STATUS_LABELS = { new: 'New', contacted: 'Contacted', interested: 'Interested', converted: 'Converted' }
export const statusLabel = (v) => STATUS_LABELS[v] ?? v

export const universityShort = (v) => UNIVERSITIES.find((u) => u.value === v)?.short ?? v
export const universityLabel = (v) => UNIVERSITIES.find((u) => u.value === v)?.label ?? v
export const intendedUseShort = (v) => USE_OPTIONS.find((u) => u.value === v)?.short ?? v
export const intendedUseLabel = (v) => USE_OPTIONS.find((u) => u.value === v)?.label ?? v
export const interestLabel = (v) => INTERESTS.find((i) => i.value === v)?.label ?? v
