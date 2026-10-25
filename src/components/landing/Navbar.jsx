import { Logo } from '../ui/Logo'
import { buttonStyles } from '../ui/buttonStyles'
import { scrollToId, scrollToTop } from '../../lib/scroll'

// Fixed navbar, 64px tall (h-16). Target sections use scroll-mt-20 so headings
// are never hidden underneath it.
export function Navbar() {
  const go = (fn) => (e) => { e.preventDefault(); fn() }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" onClick={go(scrollToTop)} aria-label="Uniloop, back to top" className="rounded-lg">
          <Logo />
        </a>

        <div className="flex items-center gap-2 sm:gap-8">
          <ul className="hidden items-center gap-8 md:flex">
            <li>
              <a href="/" onClick={go(scrollToTop)} className="text-sm font-semibold text-navy/80 hover:text-navy">
                Home
              </a>
            </li>
            <li>
              <a href="#about" onClick={go(() => scrollToId('about'))} className="text-sm font-semibold text-navy/80 hover:text-navy">
                About Uniloop
              </a>
            </li>
          </ul>
          <a
            href="#waitlist"
            onClick={go(() => scrollToId('waitlist'))}
            className={buttonStyles({ size: 'sm', className: 'whitespace-nowrap sm:h-11 sm:px-6' })}
          >
            Join Waitlist
          </a>
        </div>
      </nav>
    </header>
  )
}
