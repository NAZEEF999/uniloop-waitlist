import { STATUSES, UNIVERSITIES } from '../../lib/constants'
import { StatusBadge } from '../ui/StatusBadge'

export function UniversityBreakdown({ summary }) {
  const total = summary.total
  const counts = { OOU: summary.oou, UNILESA: summary.unilesa }
  return (
    <section aria-labelledby="uni-breakdown" className="rounded-2xl border border-navy/10 bg-white p-5">
      <h3 id="uni-breakdown" className="text-base font-bold text-navy">Signups by university</h3>
      <ul className="mt-5 space-y-4">
        {UNIVERSITIES.map((u) => {
          const count = counts[u.value] ?? 0
          const pct = total ? Math.round((count / total) * 100) : 0
          return (
            <li key={u.value}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-semibold text-navy">{u.short}</span>
                <span className="tabular-nums text-navy/70">{count} ({pct}%)</span>
              </div>
              <div role="img" aria-label={`${u.short}: ${count} of ${total} signups`} className="h-3 overflow-hidden rounded-full bg-navy/10">
                <div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function StatusBreakdown({ summary }) {
  return (
    <section aria-labelledby="status-breakdown" className="rounded-2xl border border-navy/10 bg-white p-5">
      <h3 id="status-breakdown" className="text-base font-bold text-navy">Follow-up progress</h3>
      <ul className="mt-5 grid grid-cols-2 gap-3">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center justify-between rounded-xl bg-softWhite px-3.5 py-3">
            <StatusBadge status={s} />
            <span className="text-lg font-extrabold tabular-nums text-navy">{summary.byStatus[s] ?? 0}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
