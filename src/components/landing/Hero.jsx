import { ArrowRight, MapPin } from 'lucide-react'
import heroImg from '../../assets/images/uni-img.jpg'
import { buttonStyles } from '../ui/buttonStyles'
import { scrollToId } from '../../lib/scroll'

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="bg-softWhite pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pb-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-green/40 px-3.5 py-1.5 text-xs font-bold tracking-wider text-navy">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            COMING TO OOU AND UNILESA
          </p>

          <h1 id="hero-heading" className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-navy min-[380px]:text-4xl sm:text-5xl">
            Your Campus.
            <br />
            <span className="rounded-lg bg-green/50 box-decoration-clone px-2 sm:whitespace-nowrap">Your Marketplace.</span>
          </h1>

          <div id="about" className="scroll-mt-24">
            <p className="mt-6 max-w-xl text-base leading-relaxed text-navy/80 sm:text-lg">
              Buy, sell, and discover affordable products within your university community. From hostel
              essentials and textbooks to electronics and student-owned businesses, Uniloop brings campus
              buying and selling together in one place.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-start gap-3">
            <a
              href="#waitlist"
              onClick={(e) => { e.preventDefault(); scrollToId('waitlist') }}
              className={buttonStyles({ size: 'lg', className: 'w-full sm:w-auto' })}
            >
              Join the Waitlist
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <p className="text-sm text-navy/70">Be among the first students to join the Uniloop community.</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <img
            src={heroImg}
            width="960"
            height="960"
            alt="A smiling student holding a phone and laptop in front of the OOU and University of Ilesa campus sign"
            className="aspect-square w-full rounded-3xl border border-navy/10 object-cover shadow-[0_20px_50px_-20px_rgba(16,42,67,0.35)]"
          />
        </div>
      </div>
    </section>
  )
}
