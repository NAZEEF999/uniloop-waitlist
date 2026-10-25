import { useEffect, useState } from 'react'
import { AlertTriangle, GraduationCap, Loader2, School, Sparkles, Users } from 'lucide-react'
import { SummaryCard } from '../ui/SummaryCard'
import { Button } from '../ui/Button'
import { StatusBreakdown, UniversityBreakdown } from './UniversityBreakdown'
import { getSummary } from '../../services/adminWaitlistService'
import { useApiErrorHandler } from '../../hooks/useApiErrorHandler'

export function OverviewView() {
  const handleError = useApiErrorHandler()
  const [state, setState] = useState({ loading: true, error: '', summary: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getSummary()
      .then((summary) => { if (!cancelled) setState({ loading: false, error: '', summary }) })
      .catch((err) => { if (!cancelled) setState({ loading: false, error: handleError(err), summary: null }) })
    return () => { cancelled = true }
  }, [reloadKey, handleError])

  const { loading, error, summary } = state

  return (
    <div className="space-y-6">
      <p className="text-navy/70">Manage your Uniloop pre-launch waitlist.</p>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</span>
          <Button size="sm" variant="secondary" onClick={() => { setState({ loading: true, error: '', summary: null }); setReloadKey((k) => k + 1) }}>Try again</Button>
        </div>
      )}

      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-navy/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading summary…
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
        <SummaryCard icon={Users} label="Total Waitlist Signups" value={summary ? summary.total : '–'} hint="All students on the waitlist" />
        <SummaryCard icon={GraduationCap} label="OOU Signups" value={summary ? summary.oou : '–'} hint="Olabisi Onabanjo University" />
        <SummaryCard icon={School} label="UNILESA Signups" value={summary ? summary.unilesa : '–'} hint="University of Ilesa" />
        <SummaryCard icon={Sparkles} label="New Signups" value={summary ? summary.byStatus.new : '–'} hint="Not yet followed up" />
      </div>

      {summary && summary.total === 0 && (
        <p className="rounded-xl border border-navy/10 bg-white px-4 py-6 text-center text-sm text-navy/70">
          No one has joined the waitlist yet. Sign-ups from the public form will appear here.
        </p>
      )}

      {summary && summary.total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <UniversityBreakdown summary={summary} />
          <StatusBreakdown summary={summary} />
        </div>
      )}
    </div>
  )
}
