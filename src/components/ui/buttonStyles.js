const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60'

const variants = {
  primary: 'bg-green text-navy hover:brightness-95 active:brightness-90',
  secondary: 'border border-navy/20 bg-white text-navy hover:bg-navy/5',
  dark: 'bg-navy text-white hover:bg-navy/90',
  ghost: 'text-navy hover:bg-navy/5',
}

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-7 text-base',
}

/** Use on <a> / <Link> to make them look like buttons. */
export function buttonStyles({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(' ')
}
