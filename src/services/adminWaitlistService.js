// Admin data access. Every call runs with the signed-in admin's JWT, so Row Level Security
// decides what is returned, with no service-role key and no bypassing in the browser.
import { supabase } from '../lib/supabaseClient'

export class AdminApiError extends Error {
  /** @param {'session_expired'|'forbidden'|'network'|'not_found'|'unknown'} code */
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function toApiError(error) {
  const msg = `${error?.message ?? ''}`
  if (error?.code === 'PGRST301' || error?.code === 'PGRST303' || error?.status === 401 || /jwt/i.test(msg)) {
    return new AdminApiError('session_expired', 'Your session has expired. Please sign in again.')
  }
  if (error?.code === '42501' || error?.status === 403) {
    return new AdminApiError('forbidden', 'You no longer have permission to view this data.')
  }
  if (error?.code === 'PGRST116') return new AdminApiError('not_found', 'That record could not be found, or you don’t have access to it.')
  if (/fetch|network|failed to/i.test(msg) || error?.name === 'TypeError') {
    return new AdminApiError('network', 'We couldn’t reach the server. Check your connection and try again.')
  }
  return new AdminApiError('unknown', 'Something went wrong. Please try again.')
}

// Database row -> shape used by the UI.
export const mapRow = (r) => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  university: r.university,
  intendedUse: r.intended_use,
  whatsapp: r.whatsapp_number ?? '',
  joinedAt: r.created_at,
  status: r.status,
  // Only present on full records (details panel / export):
  interests: r.interests ?? [],
  emailConsent: r.email_marketing_consent ?? false,
  consentRecordedAt: r.consent_recorded_at ?? null,
  notes: r.admin_notes ?? '',
  updatedAt: r.updated_at ?? null,
})

const LIST_COLUMNS = 'id, full_name, email, university, intended_use, whatsapp_number, created_at, status'
const FULL_COLUMNS = '*'
const SORT_COLUMNS = { fullName: 'full_name', university: 'university', status: 'status', joinedAt: 'created_at' }
const DAY = 24 * 60 * 60 * 1000

// Search text goes into a PostgREST `or` filter, so strip characters that have meaning there
// (and LIKE's escape/percent), then quote the pattern.
function cleanSearch(q) {
  return q.replace(/[%\\"*,()]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, 100)
}

function applyFilters(query, filters) {
  const q = cleanSearch(filters.query ?? '')
  if (q) query = query.or(`full_name.ilike."%${q}%",email.ilike."%${q}%"`)
  if (filters.university && filters.university !== 'all') query = query.eq('university', filters.university)
  if (filters.use && filters.use !== 'all') query = query.eq('intended_use', filters.use)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.date && filters.date !== 'all') {
    query = query.gte('created_at', new Date(Date.now() - Number(filters.date) * DAY).toISOString())
  }
  return query
}

function applySort(query, sort) {
  const column = SORT_COLUMNS[sort?.key] ?? 'created_at'
  return query.order(column, { ascending: sort?.dir === 'asc' }).order('id', { ascending: true })
}

/** Server-side filtered, sorted, paginated list. Returns { rows, total }. */
export async function listWaitlist({ filters, sort, page, pageSize }) {
  const from = (page - 1) * pageSize
  let query = supabase.from('waitlist').select(LIST_COLUMNS, { count: 'exact' })
  query = applySort(applyFilters(query, filters), sort).range(from, from + pageSize - 1)
  const { data, count, error } = await query
  if (error) throw toApiError(error)
  return { rows: data.map(mapRow), total: count ?? 0 }
}

/** One full record (retrieved fresh when the admin opens the details panel). */
export async function getWaitlistRecord(id) {
  const { data, error } = await supabase.from('waitlist').select(FULL_COLUMNS).eq('id', id).single()
  if (error) throw toApiError(error)
  return mapRow(data)
}

/** Returns the updated record fields ONLY if the database confirms the write. */
async function updateRecord(id, patch) {
  const { data, error } = await supabase
    .from('waitlist')
    .update(patch)
    .eq('id', id)
    .select('id, status, admin_notes, updated_at')
    .single() // 0 rows updated (e.g. RLS refusal) => PGRST116 => treated as failure
  if (error) throw toApiError(error)
  return { id: data.id, status: data.status, notes: data.admin_notes ?? '', updatedAt: data.updated_at }
}

export const updateStatus = (id, status) => updateRecord(id, { status })

export async function updateNotes(id, notes) {
  const trimmed = notes.trim()
  if (trimmed.length > 5000) throw new AdminApiError('unknown', 'Notes can be at most 5,000 characters.')
  return updateRecord(id, { admin_notes: trimmed === '' ? null : trimmed })
}

/** Counts only: no student rows are transferred. */
export async function getSummary() {
  const { data, error } = await supabase.rpc('get_waitlist_summary')
  if (error) throw toApiError(error)
  const r = Array.isArray(data) ? data[0] : data
  return {
    total: Number(r?.total ?? 0),
    oou: Number(r?.oou ?? 0),
    unilesa: Number(r?.unilesa ?? 0),
    byStatus: {
      new: Number(r?.new_count ?? 0),
      contacted: Number(r?.contacted_count ?? 0),
      interested: Number(r?.interested_count ?? 0),
      converted: Number(r?.converted_count ?? 0),
    },
  }
}

/** All records matching the current filters, fetched in pages with the admin's own session (RLS applies). */
export async function fetchAllForExport({ filters, sort }, { pageSize = 1000, maxRows = 50_000 } = {}) {
  const all = []
  for (let from = 0; from < maxRows; from += pageSize) {
    let query = supabase.from('waitlist').select(FULL_COLUMNS)
    query = applySort(applyFilters(query, filters), sort).range(from, from + pageSize - 1)
    const { data, error } = await query
    if (error) throw toApiError(error)
    all.push(...data.map(mapRow))
    if (data.length < pageSize) break
  }
  return all
}
