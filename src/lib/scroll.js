// Smooth scrolling helpers. Sections use `scroll-mt-*` so the fixed navbar
// never covers the heading we scroll to.
const behavior = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: behavior(), block: 'start' })
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: behavior() })
}
