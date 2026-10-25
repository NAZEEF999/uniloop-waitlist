import { Link } from 'react-router-dom'
import { LayoutDashboard, LogOut, Users } from 'lucide-react'
import { Logo } from '../ui/Logo'

const items = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'waitlist', label: 'Waitlist', icon: Users },
]

const itemClass = (active) =>
  `flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${
    active ? 'bg-green text-navy' : 'text-white/80 hover:bg-white/10 hover:text-white'
  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`

export function SidebarNav({ view, onNavigate, onLogout, loggingOut }) {
  return (
    <div className="flex h-full flex-col bg-navy p-4 text-white">
      <div className="mb-8 mt-1 rounded-xl bg-white px-3.5 py-2.5">
        <Logo />
      </div>
      <nav aria-label="Admin" className="flex-1">
        <ul className="space-y-1">
          {items.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <Link
                to={`/admin/dashboard?view=${id}`}
                onClick={onNavigate}
                aria-current={view === id ? 'page' : undefined}
                className={itemClass(view === id)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" onClick={onLogout} disabled={loggingOut} className={`${itemClass(false)} disabled:opacity-60`}>
        <LogOut className="h-5 w-5" aria-hidden="true" />
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    </div>
  )
}
