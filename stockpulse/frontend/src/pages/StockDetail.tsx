import { motion } from 'framer-motion'
import { ArrowLeft, GitCompareArrows } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChangePill } from '@/components/ChangePill'
import { LivePrice } from '@/components/LivePrice'
import { PredictionPanel } from '@/components/PredictionPanel'
import { PriceChart } from '@/components/PriceChart'
import { RangeTabs } from '@/components/RangeTabs'
import { Card, ErrorState, Skeleton } from '@/components/ui'
import { useHistory, useQuote } from '@/hooks/queries'
import { useLiveQuote } from '@/hooks/useLiveQuotes'
import { formatCompact, formatPercent, formatPrice, formatSigned } from '@/lib/format'
import type { HistoryRange } from '@/lib/types'

export function StockDetail() {
  const symbol = (useParams().symbol ?? '').toUpperCase()
  return <StockView key={symbol} symbol={symbol} />
}

function StockView({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<HistoryRange>('1mo')
  const { data: initial, error, refetch } = useQuote(symbol)
  const live = useLiveQuote(symbol)
  const quote = live ?? initial
  const history = useHistory(symbol, range)

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />

  const candles = history.data?.candles ?? []
  const rangeChange = candles.length && quote ? (quote.price / candles[0].close - 1) * 100 : 0

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> back
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">{quote?.market_state ?? '…'}</p>
          <h1 className="font-display text-5xl font-bold tracking-tighter">{symbol}</h1>
          {quote ? <p className="text-muted">{quote.name}</p> : <Skeleton className="h-4 w-40" />}
        </div>
        <div className="text-right">
          {quote ? (
            <>
              <LivePrice value={quote.price} className="text-4xl font-bold sm:text-5xl" />
              <div className="mt-2 flex items-center justify-end gap-2 font-mono text-sm">
                <span className={quote.change >= 0 ? 'text-up' : 'text-down'}>{formatSigned(quote.change)}</span>
                <ChangePill value={quote.change_percent} size="lg" />
                <span className="text-faint">today</span>
              </div>
            </>
          ) : (
            <Skeleton className="h-12 w-48" />
          )}
        </div>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted">
                {range.toUpperCase()} move:{' '}
                <span className={rangeChange >= 0 ? 'font-mono text-up' : 'font-mono text-down'}>
                  {formatPercent(rangeChange)}
                </span>
              </div>
              <RangeTabs value={range} onChange={setRange} />
            </div>
            {history.error ? (
              <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
            ) : candles.length ? (
              <div className={history.isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                <PriceChart candles={candles} range={range} livePrice={range === '1d' ? quote?.price : undefined} />
              </div>
            ) : (
              <Skeleton className="h-72 sm:h-80" />
            )}
          </Card>

          {quote && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Prev close', formatPrice(quote.previous_close)],
                ['Day high', quote.day_high != null ? formatPrice(quote.day_high) : '—'],
                ['Day low', quote.day_low != null ? formatPrice(quote.day_low) : '—'],
                ['Volume', formatCompact(quote.volume)],
              ].map(([label, value]) => (
                <Card key={label} className="p-4">
                  <dt className="text-xs text-faint">{label}</dt>
                  <dd className="mt-1 font-mono font-bold tabular-nums">{value}</dd>
                </Card>
              ))}
            </dl>
          )}

          <Link
            to={`/compare?s=${symbol}`}
            className="glass flex items-center justify-between rounded-3xl p-5 transition hover:bg-white/[0.06]"
          >
            <span>
              <span className="font-display font-bold">Compare {symbol}</span>
              <span className="block text-sm text-muted">see how it stacks up against the competition</span>
            </span>
            <GitCompareArrows className="size-6 text-up" aria-hidden />
          </Link>
        </div>

        <PredictionPanel symbol={symbol} />
      </div>
    </div>
  )
}
