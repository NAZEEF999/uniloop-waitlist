import { useId } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

const control =
  'w-full rounded-xl border bg-white text-navy placeholder:text-navy/40 transition focus:border-navy focus:outline-none focus:ring-4 focus:ring-green/40 disabled:opacity-60'
const sizes = { md: 'h-12 px-4 text-base', sm: 'h-10 px-3 text-sm' }

export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function Label({ htmlFor, hidden, required, optional, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={hidden ? 'sr-only' : 'mb-1.5 block text-sm font-semibold text-navy'}
    >
      {children}
      {required && <span aria-hidden="true" className="text-red-700"> *</span>}
      {optional && <span className="font-normal text-navy/60"> (optional)</span>}
    </label>
  )
}

const border = (error) => (error ? 'border-red-600' : 'border-navy/20')

export function TextField({
  label, error, hint, required, optional, labelHidden, size = 'md',
  startIcon: StartIcon, endAdornment, className = '', ...props
}) {
  const id = useId()
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <Label htmlFor={id} hidden={labelHidden} required={required} optional={optional}>{label}</Label>
      <div className="relative">
        {StartIcon && (
          <StartIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/50" aria-hidden="true" />
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={`${control} ${sizes[size]} ${border(error)} ${StartIcon ? 'pl-9' : ''} ${endAdornment ? 'pr-12' : ''}`}
          {...props}
        />
        {endAdornment}
      </div>
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-navy/60">{hint}</p>}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}

export function SelectField({
  label, error, hint, required, optional, labelHidden, size = 'md',
  children, className = '', ...props
}) {
  const id = useId()
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <Label htmlFor={id} hidden={labelHidden} required={required} optional={optional}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={`${control} ${sizes[size]} ${border(error)} cursor-pointer appearance-none pr-10`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/60" aria-hidden="true" />
      </div>
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-navy/60">{hint}</p>}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}

export function TextAreaField({ label, error, hint, required, optional, labelHidden, className = '', ...props }) {
  const id = useId()
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <Label htmlFor={id} hidden={labelHidden} required={required} optional={optional}>{label}</Label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${control} ${border(error)} min-h-24 resize-y px-3 py-2.5 text-sm`}
        {...props}
      />
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-navy/60">{hint}</p>}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}
