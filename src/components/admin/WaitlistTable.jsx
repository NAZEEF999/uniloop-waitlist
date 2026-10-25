import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Mail, MessageCircle, SearchX } from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { formatDate } from '../../lib/format'
import { universityShort, intendedUseShort } from '../../lib/constants'
import { mailtoHref, whatsappHref } from './contactLinks'

const iconLink =
  'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy/20 text-navy hover:bg-navy/5'

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-3 text-left whitespace-nowrap">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5 rounded font-semibold hover:text-navy">
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-navy' : 'text-navy/40'}`} aria-hidden="true" />
      </button>
    </th>
  )
}

function Actions({ record, onView, iconOnly = false }) {
  const wa = whatsappHref(record)
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" title="View details" className={iconOnly ? 'w-9 px-0' : ''} onClick={() => onView(record.id)} aria-label={`View details for ${record.fullName}`}>
        <Eye className="h-4 w-4" aria-hidden="true" />
        <span className={iconOnly ? 'sr-only' : ''}>View</span>
      </Button>
      <a href={mailtoHref(record)} className={iconLink} aria-label={`Email ${record.fullName}`} title="Send email">
        <Mail className="h-4 w-4" aria-hidden="true" />
      </a>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label={`WhatsApp ${record.fullName} (opens in a new tab)`} title="Open WhatsApp">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

export function WaitlistTable({ rows, sort, onSort, onView, onClearFilters, hasFilters }) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-softWhite text-navy/60">
          <SearchX className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-bold text-navy">No students match your search</h3>
        <p className="mt-1 text-sm text-navy/70">Try a different name or email, or adjust the filters.</p>
        {hasFilters && <Button className="mt-5" variant="secondary" onClick={onClearFilters}>Clear search and filters</Button>}
      </div>
    )
  }

  return (
    <>
      {/* Tablet / desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Waitlist students (demo data)</caption>
          <thead className="bg-softWhite text-xs uppercase tracking-wide text-navy/70">
            <tr>
              <SortHeader label="Full Name" sortKey="fullName" sort={sort} onSort={onSort} />
              <th scope="col" className="px-3 py-3 text-left font-semibold whitespace-nowrap">Email</th>
              <SortHeader label="University" sortKey="university" sort={sort} onSort={onSort} />
              <th scope="col" className="px-3 py-3 text-left font-semibold whitespace-nowrap">Intended Use</th>
              <SortHeader label="Date Joined" sortKey="joinedAt" sort={sort} onSort={onSort} />
              <SortHeader label="Follow-up Status" sortKey="status" sort={sort} onSort={onSort} />
              <th scope="col" className="sticky right-0 bg-softWhite px-3 py-3 text-left font-semibold whitespace-nowrap shadow-[-8px_0_8px_-8px_rgba(16,42,67,0.15)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {rows.map((r) => (
              <tr key={r.id} className="group hover:bg-softWhite">
                <th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-semibold text-navy">{r.fullName}</th>
                <td className="px-3 py-3">
                  <a href={mailtoHref(r)} title={r.email} className="block max-w-[200px] truncate text-greenDark underline-offset-2 hover:underline">{r.email}</a>
                </td>
                <td className="px-3 py-3">{universityShort(r.university)}</td>
                <td className="px-3 py-3">{intendedUseShort(r.intendedUse)}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatDate(r.joinedAt)}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="sticky right-0 bg-white px-3 py-3 shadow-[-8px_0_8px_-8px_rgba(16,42,67,0.15)] group-hover:bg-softWhite"><Actions record={r} onView={onView} iconOnly /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="divide-y divide-navy/10 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-navy">{r.fullName}</p>
                <a href={mailtoHref(r)} className="block truncate text-sm text-greenDark underline-offset-2 hover:underline">{r.email}</a>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-navy/60">University</dt><dd className="font-semibold text-navy">{universityShort(r.university)}</dd></div>
              <div><dt className="text-navy/60">Intended use</dt><dd className="font-semibold text-navy">{intendedUseShort(r.intendedUse)}</dd></div>
              <div><dt className="text-navy/60">Joined</dt><dd className="font-semibold text-navy">{formatDate(r.joinedAt)}</dd></div>
            </dl>
            <Actions record={r} onView={onView} />
          </li>
        ))}
      </ul>
    </>
  )
}
