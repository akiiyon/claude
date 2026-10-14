import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-8xl font-bold text-gradient">404</p>
      <p className="mt-4 text-muted">this page got rugged 💀</p>
      <Link to="/" className="mt-8 inline-block rounded-full bg-up px-6 py-3 font-semibold text-ink">
        take me home
      </Link>
    </div>
  )
}
