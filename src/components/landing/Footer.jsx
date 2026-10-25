import { Logo } from '../ui/Logo'
import { scrollToId, scrollToTop } from '../../lib/scroll'

// Only links that have real destinations are shown. Contact, Privacy Policy and
// Terms are intentionally omitted until those pages / addresses exist.
const YEAR = new Date().getFullYear()

export function Footer() {
  const go = (fn) => (e) => { e.preventDefault(); fn() }

  return (
    <footer className="border-t border-navy/10 bg-softWhite">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-sm font-semibold text-navy">Your Campus. Your Marketplace.</p>
            <p className="mt-1 text-sm text-navy/70">Launching at OOU and UNILESA.</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex gap-6 text-sm font-semibold">
              <li><a href="/" onClick={go(scrollToTop)} className="text-navy/80 hover:text-navy hover:underline">Home</a></li>
              <li><a href="#waitlist" onClick={go(() => scrollToId('waitlist'))} className="text-navy/80 hover:text-navy hover:underline">Join Waitlist</a></li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-navy/10 pt-6 text-xs text-navy/60">
          © {YEAR} Uniloop. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
