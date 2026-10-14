import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useHistory, usePrediction } from '@/hooks/queries'
import { trendOf } from '@/lib/format'
import type { Quote } from '@/lib/types'
import { ChangePill } from './ChangePill'
import { LivePrice } from './LivePrice'
import { SignalBadge } from './SignalBadge'
import { Sparkline } from './Sparkline'
import { Skeleton } from './ui'

export function StockCard({ quote, index }: { quote: Quote; index: number }) {
  const { data: history } = useHistory(quote.symbol, '1d')
  const { data: prediction } = usePrediction(quote.symbol)
  const closes = history?.candles.map((c) => c.close) ?? []
  if (closes.length) closes[closes.length - 1] = quote.price

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
    >
      <Link
        to={`/stock/${quote.symbol}`}
        className="glass group block rounded-3xl p-5 transition-shadow hover:shadow-[0_0_40px_-10px_rgb(198_255_61_/_0.35)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-faint">#{index + 1}</span>
              <h3 className="font-display text-xl font-bold tracking-tight">{quote.symbol}</h3>
            </div>
            <p className="truncate text-sm text-muted">{quote.name}</p>
          </div>
          {prediction ? (
            <SignalBadge signal={prediction.signal} score={prediction.score} />
          ) : (
            <Skeleton className="h-6 w-20 rounded-full" />
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <LivePrice value={quote.price} className="text-2xl font-bold" />
            <div className="mt-1">
              <ChangePill value={quote.change_percent} />
            </div>
          </div>
          <Sparkline values={closes} trend={trendOf(quote.change)} />
        </div>
      </Link>
    </motion.div>
  )
}
