import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from './auth-context'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { signInAdmin, signOutAdmin, verifyAdmin } from '../services/authService'

const NOTICES = {
  expired: 'Your session has expired. Please sign in again.',
  revoked: 'You no longer have access to the admin dashboard.',
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured) // restoring a saved session
  const [notice, setNotice] = useState('')
  const manualLogout = useRef(false)

  // Restore a saved session (and re-verify admin access) when the app loads.
  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (user) {
        try {
          await verifyAdmin(user.id)
          if (active) setAdmin({ id: user.id, email: user.email })
        } catch (e) {
          if (e.code === 'not_admin' || e.code === 'inactive') {
            await supabase.auth.signOut({ scope: 'local' })
            if (active) setNotice(NOTICES.revoked)
          }
          // network error: stay signed out of the UI but keep the saved session for a retry
        }
      }
      if (active) setLoading(false)
    })

    // Fires when the session ends (sign-out in another tab, refresh token rejected, etc.).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAdmin(null)
        if (!manualLogout.current) setNotice(NOTICES.expired)
        manualLogout.current = false
      }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const login = useCallback(async (credentials) => {
    const user = await signInAdmin(credentials)
    setNotice('')
    setAdmin(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    manualLogout.current = true
    await signOutAdmin()
    manualLogout.current = false
    setAdmin(null)
    setNotice('')
  }, [])

  // Called by data screens when the server says the session is no longer valid.
  const endSession = useCallback(async (reason = 'expired') => {
    manualLogout.current = true
    await signOutAdmin()
    manualLogout.current = false
    setAdmin(null)
    setNotice(NOTICES[reason] ?? NOTICES.expired)
  }, [])

  const clearNotice = useCallback(() => setNotice(''), [])

  const value = useMemo(
    () => ({ admin, loading, notice, login, logout, endSession, clearNotice }),
    [admin, loading, notice, login, logout, endSession, clearNotice],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
