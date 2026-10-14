import { Link } from 'react-router-dom'
import { formatPercent, formatPrice } from '@/lib/format'
import type { Quote } from '@/lib/types'

export function TickerTape({ quotes }: { quotes: Quote[] }) {
  if (!quotes.length) return <div className="h-11 border-y border-line" />
  const items = [...quotes, ...quotes] // duplicated for a seamless loop

  return (
    <div className="group relative overflow-hidden border-y border-line bg-white/[0.02] py-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max animate-marquee gap-10 group-hover:[animation-play-state:paused]">
        {items.map((q, i) => (
          <Link
            key={`${q.symbol}-${i}`}
            to={`/stock/${q.symbol}`}
            aria-hidden={i >= quotes.length}
            tabIndex={i >= quotes.length ? -1 : undefined}
            className="flex items-center gap-2 whitespace-nowrap font-mono text-sm"
          >
            <span className="font-bold">{q.symbol}</span>
            <span className="text-muted">{formatPrice(q.price)}</span>
            <span className={q.change_percent >= 0 ? 'text-up' : 'text-down'}>
              {q.change_percent >= 0 ? '▲' : '▼'} {formatPercent(q.change_percent)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
