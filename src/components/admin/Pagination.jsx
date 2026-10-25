import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { SelectField } from '../ui/Field'

export function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="flex flex-col gap-3 border-t border-navy/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-navy/70" aria-live="polite">
        Showing <strong className="text-navy">{from}–{to}</strong> of <strong className="text-navy">{total}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SelectField
          label="Rows per page" labelHidden size="sm"
          value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}
        >
          {[5, 10, 25].map((n) => <option key={n} value={n}>{n} per page</option>)}
        </SelectField>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-20 text-center text-sm font-semibold text-navy">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
