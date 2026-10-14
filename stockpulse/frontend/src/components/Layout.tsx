import clsx from 'clsx'
import { Activity, GitCompareArrows, LayoutGrid } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LiveBadge } from './LiveBadge'
import { SearchBox } from './SearchBox'
import { Skeleton } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
]

function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 size-[34rem] animate-float rounded-full bg-violet/25 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 size-[28rem] animate-float rounded-full bg-up/10 blur-[120px] [animation-delay:-3s]" />
      <div className="absolute bottom-0 left-1/3 size-[26rem] animate-float rounded-full bg-cyan-400/10 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255_/_0.06)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" />
    </div>
  )
}

export function Layout() {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-dvh">
      <Background />
      <header className="sticky top-0 z-40 border-b border-line bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-up text-ink">
              <Activity className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              stock<span className="text-gradient">pulse</span>
            </span>
          </NavLink>

          <nav className="flex gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
                    isActive ? 'bg-white/10 text-fg' : 'text-muted hover:text-fg',
                  )
                }
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          <SearchBox
            hotkey
            className="order-last w-full sm:order-none sm:ml-auto sm:w-72"
            onSelect={(listing) => navigate(`/stock/${listing.symbol}`)}
          />
          <div className="ml-auto sm:ml-0">
            <LiveBadge />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-faint">
        built different · prices via WebSocket · ML scores are not financial advice
      </footer>
    </div>
  )
}
