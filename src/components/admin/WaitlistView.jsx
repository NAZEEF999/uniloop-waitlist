import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, Loader2, Search, X } from 'lucide-react'
import { TextField, SelectField } from '../ui/Field'
import { Button } from '../ui/Button'
import { WaitlistTable } from './WaitlistTable'
import { Pagination } from './Pagination'
import { StudentPanel } from './StudentPanel'
import {
  STATUSES, UNIVERSITIES, USE_OPTIONS, intendedUseShort, interestLabel, statusLabel, universityShort,
} from '../../lib/constants'
import { downloadCsv, toCsv } from '../../lib/csv'
import { formatDate } from '../../lib/format'
import { fetchAllForExport, listWaitlist } from '../../services/adminWaitlistService'
import { useApiErrorHandler } from '../../hooks/useApiErrorHandler'

const DEFAULT_FILTERS = { query: '', university: 'all', use: 'all', status: 'all', date: 'all' }

const CSV_COLUMNS = [
  { header: 'Full Name', value: (r) => r.fullName },
  { header: 'Email', value: (r) => r.email },
  { header: 'University', value: (r) => universityShort(r.university) },
  { header: 'Intended Use', value: (r) => intendedUseShort(r.intendedUse) },
  { header: 'WhatsApp', value: (r) => r.whatsapp },
  { header: 'Product Interests', value: (r) => r.interests.map(interestLabel).join('; ') },
  { header: 'Email Marketing Consent', value: (r) => (r.emailConsent ? 'Yes' : 'No') },
  { header: 'Consent Recorded At (UTC)', value: (r) => r.consentRecordedAt ?? '' },
  { header: 'Date Joined', value: (r) => formatDate(r.joinedAt) },
  { header: 'Joined At (UTC)', value: (r) => r.joinedAt },
  { header: 'Follow-up Status', value: (r) => statusLabel(r.status) },
  { header: 'Internal Notes', value: (r) => r.notes },
]

export function WaitlistView() {
  const handleError = useApiErrorHandler()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState({ key: 'joinedAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [data, setData] = useState({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [selected, setSelected] = useState(null)
  const changedWhileOpen = useRef(false)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const { university, use, status, date } = filters
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(filters.query), 300)
    return () => clearTimeout(t)
  }, [filters.query])

  // Server-side search / filter / sort / pagination.
  useEffect(() => {
    let cancelled = false
    listWaitlist({ filters: { query: debouncedQuery, university, use, status, date }, sort, page, pageSize })
      .then((res) => { if (!cancelled) { setData(res); setError(''); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(handleError(err)); setLoading(false) } })
    return () => { cancelled = true }
  }, [debouncedQuery, university, use, status, date, sort, page, pageSize, reloadKey, handleError])

  const startLoading = () => { setLoading(true); setError('') }
  const retry = () => { startLoading(); setReloadKey((k) => k + 1) }

  const setFilter = (key) => (e) => {
    startLoading(); setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1)
  }
  const clearFilters = () => { startLoading(); setFilters(DEFAULT_FILTERS); setDebouncedQuery(''); setPage(1) }
  const onSort = (key) => {
    startLoading()
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'joinedAt' ? 'desc' : 'asc' }))
    setPage(1)
  }
  const goToPage = (n) => { startLoading(); setPage(n) }
  const changePageSize = (n) => { startLoading(); setPageSize(n); setPage(1) }

  // Keep the table row in sync once the database confirmed a change made in the panel.
  const onRecordChange = useCallback(({ id, status: newStatus }) => {
    changedWhileOpen.current = true
    setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, status: newStatus } : r)) }))
  }, [])

  const closePanel = () => {
    setSelected(null)
    if (changedWhileOpen.current) { changedWhileOpen.current = false; setReloadKey((k) => k + 1) } // re-apply filters/sort
  }

  const exportCsv = async () => {
    setExporting(true); setExportError('')
    try {
      const rows = await fetchAllForExport({ filters: { ...filters }, sort })
      if (rows.length === 0) { setExportError('There are no records to export for the current filters.'); return }
      const stamp = new Date().toISOString().slice(0, 10)
      downloadCsv(`uniloop-waitlist-${stamp}.csv`, toCsv(CSV_COLUMNS, rows))
    } catch (err) {
      const msg = handleError(err)
      if (msg) setExportError(`Export failed. ${msg}`)
    } finally {
      setExporting(false)
    }
  }

  const firstLoad = loading && data.rows.length === 0 && !error

  return (
    <div className="space-y-5">
      <p className="text-navy/70">View and manage students interested in joining Uniloop.</p>

      <section aria-label="Waitlist records" className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <div className="space-y-4 border-b border-navy/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <TextField
              className="flex-1" label="Search by name or email" labelHidden size="sm" type="search"
              startIcon={Search} placeholder="Search by name or email" maxLength={100}
              value={filters.query}
              onChange={(e) => { startLoading(); setFilters((f) => ({ ...f, query: e.target.value })); setPage(1) }}
            />
            <Button variant="dark" size="sm" onClick={exportCsv} loading={exporting} className="h-10 lg:shrink-0">
              {!exporting && <Download className="h-4 w-4" aria-hidden="true" />}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>

          {exportError && (
            <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {exportError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SelectField label="University" size="sm" value={filters.university} onChange={setFilter('university')}>
              <option value="all">All</option>
              {UNIVERSITIES.map((u) => <option key={u.value} value={u.value}>{u.short}</option>)}
            </SelectField>
            <SelectField label="Intended use" size="sm" value={filters.use} onChange={setFilter('use')}>
              <option value="all">All</option>
              {USE_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.short}</option>)}
            </SelectField>
            <SelectField label="Follow-up status" size="sm" value={filters.status} onChange={setFilter('status')}>
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </SelectField>
            <SelectField label="Date joined" size="sm" value={filters.date} onChange={setFilter('date')}>
              <option value="all">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </SelectField>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-navy/70" aria-live="polite">
                {loading ? 'Updating…' : `${data.total} ${data.total === 1 ? 'student matches' : 'students match'} your filters`}
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden="true" /> Clear
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-10 text-sm text-red-900">
            <span className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />{error}</span>
            <Button size="sm" variant="secondary" onClick={retry}>Try again</Button>
          </div>
        )}

        {firstLoad && (
          <p role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm font-semibold text-navy/70">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading waitlist…
          </p>
        )}

        {!error && !firstLoad && (
          <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {data.total === 0 && !hasFilters && !loading ? (
              <div className="px-6 py-16 text-center">
                <h3 className="text-lg font-bold text-navy">No one has joined yet</h3>
                <p className="mt-1 text-sm text-navy/70">Sign-ups from the public waitlist form will show up here.</p>
              </div>
            ) : (
              <WaitlistTable
                rows={data.rows} sort={sort} onSort={onSort} onView={(id) => setSelected(data.rows.find((r) => r.id === id))}
                hasFilters={hasFilters} onClearFilters={clearFilters}
              />
            )}
          </div>
        )}

        {!error && data.total > 0 && (
          <Pagination page={page} pageSize={pageSize} total={data.total} onPage={goToPage} onPageSize={changePageSize} />
        )}
      </section>

      {selected && <StudentPanel row={selected} onClose={closePanel} onRecordChange={onRecordChange} />}
    </div>
  )
}
