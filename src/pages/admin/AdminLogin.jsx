import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { TextField } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { CONFIG_ERROR_MESSAGE, isSupabaseConfigured } from '../../lib/supabaseClient'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function AdminLogin() {
  useDocumentTitle('Admin Login | Uniloop')
  const { admin, loading: authLoading, notice, login, clearNotice } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  if (admin) return <Navigate to="/admin/dashboard" replace />
  if (authLoading) return null

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Enter your admin email address.'
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.'
    if (!password) e.password = 'Enter your password.'
    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    if (loading) return
    setFormError('')
    clearNotice()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => ev.target.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setLoading(true)
    try {
      await login({ email, password })
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setFormError(err.message || 'We couldn’t sign you in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-softWhite px-4 py-10">
      <Link to="/" aria-label="Uniloop home"><Logo textClass="text-2xl" /></Link>

      <main className="mt-8 w-full max-w-md rounded-3xl border border-navy/10 bg-white p-6 shadow-[0_10px_40px_-18px_rgba(16,42,67,0.25)] sm:p-8">
        <h1 className="text-2xl font-extrabold text-navy">Admin Login</h1>
        <p className="mt-1.5 text-sm text-navy/70">Sign in to manage the Uniloop waitlist.</p>

        {!isSupabaseConfigured && (
          <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{CONFIG_ERROR_MESSAGE}</span>
          </div>
        )}

        {notice && !formError && (
          <div role="status" className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {formError && (
          <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate aria-busy={loading} className="mt-6 space-y-5">
          <TextField
            label="Admin email" type="email" required autoComplete="username" inputMode="email"
            value={email} error={errors.email} disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password" required autoComplete="current-password"
            type={showPassword ? 'text' : 'password'}
            value={password} error={errors.password} disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-navy/70 hover:bg-navy/5 hover:text-navy"
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            }
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </main>

      <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy/80 hover:text-navy hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to website
      </Link>
    </div>
  )
}
