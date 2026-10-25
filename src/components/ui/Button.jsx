import { Loader2 } from 'lucide-react'
import { buttonStyles } from './buttonStyles'

export function Button({
  variant, size, className, loading = false, disabled, type = 'button', children, ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
