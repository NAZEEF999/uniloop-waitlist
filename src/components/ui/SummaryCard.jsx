export function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-navy/70">{label}</p>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green/30 text-navy">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums text-navy">{value}</p>
      <p className="mt-1 text-xs text-navy/60">{hint}</p>
    </div>
  )
}
