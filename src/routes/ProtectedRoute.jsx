import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// UI-only gate (a convenience, NOT the security boundary). The real protection is Row Level
// Security in the database: even with this removed, non-admins cannot read any waitlist data.
export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div role="status" className="grid min-h-screen place-items-center bg-softWhite text-navy">
        <span className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Checking your session…
        </span>
      </div>
    )
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location }} />
  return children
}
