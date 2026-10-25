import { Navbar } from '../components/landing/Navbar'
import { Hero } from '../components/landing/Hero'
import { WaitlistForm } from '../components/landing/WaitlistForm'
import { Footer } from '../components/landing/Footer'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

// Public landing page: exactly four sections: Navbar, Hero, Waitlist form, Footer.
export default function WaitlistPage() {
  useDocumentTitle('Uniloop | Your Campus. Your Marketplace.')
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <section id="waitlist" aria-labelledby="waitlist-heading" className="scroll-mt-20 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="text-center">
              <h2 id="waitlist-heading" className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
                Get Early Access to Uniloop
              </h2>
              <p className="mt-3 text-navy/75">
                Join the waitlist and be among the first to discover a new way to buy and sell within your
                university community.
              </p>
            </div>
            <div className="mt-8 rounded-3xl border border-navy/10 bg-white p-5 shadow-[0_10px_40px_-18px_rgba(16,42,67,0.25)] sm:p-8">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
