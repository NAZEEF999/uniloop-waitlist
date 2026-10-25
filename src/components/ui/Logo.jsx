import markSrc from '../../assets/images/uniloop-mark.png'

// Uses the real Uniloop logo mark (cropped from the supplied logo file)
// beside a text wordmark.
export function Logo({ className = '', textClass = 'text-xl' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src={markSrc} alt="" width="40" height="25" className="h-6 w-auto" />
      <span className={`${textClass} font-extrabold tracking-tight text-navy`}>Uniloop</span>
    </span>
  )
}
