import { statusLabel } from '../../lib/constants'

const styles = {
  new: 'bg-navy/10 text-navy ring-navy/20',
  contacted: 'bg-amber-100 text-amber-900 ring-amber-300',
  interested: 'bg-sky-100 text-sky-900 ring-sky-300',
  converted: 'bg-green/40 text-emerald-950 ring-emerald-500/40',
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] ?? styles.new}`}>
      {statusLabel(status)}
    </span>
  )
}
