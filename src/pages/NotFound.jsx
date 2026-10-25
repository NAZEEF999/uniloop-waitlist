import { Link } from 'react-router-dom'
import { buttonStyles } from '../components/ui/buttonStyles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found | Uniloop')
  return (
    <main className="grid min-h-screen place-items-center bg-softWhite px-4 text-center">
      <div>
        <p className="text-sm font-bold tracking-wider text-greenDark">404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy">Page not found</h1>
        <p className="mt-2 text-navy/70">The page you’re looking for doesn’t exist.</p>
        <Link to="/" className={buttonStyles({ className: 'mt-6' })}>Back to Home</Link>
      </div>
    </main>
  )
}
