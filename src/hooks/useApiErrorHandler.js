import { useCallback } from 'react'
import { useAuth } from './useAuth'

/**
 * Turns a failed admin request into a user-facing message. If the failure means the session
 * is no longer valid (expired token, or access revoked), the admin is signed out and sent to login.
 * Returns '' when it has redirected (nothing more to show).
 */
export function useApiErrorHandler() {
  const { endSession } = useAuth()
  return useCallback((err) => {
    if (err?.code === 'session_expired') { endSession('expired'); return '' }
    if (err?.code === 'forbidden') { endSession('revoked'); return '' }
    return err?.message || 'Something went wrong. Please try again.'
  }, [endSession])
}
