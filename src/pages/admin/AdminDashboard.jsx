import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, UserRound } from 'lucide-react'
import { SidebarNav } from '../../components/admin/SidebarNav'
import { OverviewView } from '../../components/admin/OverviewView'
import { WaitlistView } from '../../components/admin/WaitlistView'
import { Drawer } from '../../components/ui/Drawer'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const TITLES = { overview: 'Dashboard Overview', waitlist: 'Waitlist' }

export default function AdminDashboard() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const view = params.get('view') === 'waitlist' ? 'waitlist' : 'overview'
  useDocumentTitle(`${TITLES[view]} | Uniloop Admin`)

  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    navigate('/admin/login', { replace: true })
  }

  const nav = (
    <SidebarNav view={view} onNavigate={() => setMenuOpen(false)} onLogout={handleLogout} loggingOut={loggingOut} />
  )

  return (
    <div className="min-h-screen bg-softWhite">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">{nav}</aside>

      {menuOpen && (
        <Drawer title="Menu" side="left" widthClass="max-w-xs" onClose={() => setMenuOpen(false)}>
          {nav}
        </Drawer>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy/10 bg-white px-4 sm:px-6">
          <button
            type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"
            className="grid h-11 w-11 place-items-center rounded-xl text-navy hover:bg-navy/5 lg:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold text-navy sm:text-2xl">{TITLES[view]}</h1>
          <div className="flex items-center gap-2.5 rounded-full border border-navy/10 py-1 pl-1 pr-1 sm:pr-4">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-white">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden max-w-48 truncate text-sm font-semibold text-navy sm:block" title={admin?.email}>{admin?.email}</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          {view === 'overview'
            ? <OverviewView />
            : <WaitlistView />}
        </main>
      </div>
    </div>
  )
}
