import { motion } from 'framer-motion'
import { Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChangePill } from '@/components/ChangePill'
import { StockCard } from '@/components/StockCard'
import { TickerTape } from '@/components/TickerTape'
import { Card, ErrorState, SectionTitle, Skeleton } from '@/components/ui'
import { useTopStocks } from '@/hooks/queries'
import { useAllLiveQuotes } from '@/hooks/useLiveQuotes'
import type { Quote } from '@/lib/types'

function useTopQuotes(): { quotes: Quote[]; isPending: boolean; error: Error | null; refetch: () => void } {
  const { data, isPending, error, refetch } = useTopStocks()
  const live = useAllLiveQuotes()
  const quotes = useMemo(() => (data ?? []).map((q) => live[q.symbol] ?? q), [data, live])
  return { quotes, isPending, error, refetch }
}

function MarketVibe({ quotes }: { quotes: Quote[] }) {
  const sorted = [...quotes].sort((a, b) => b.change_percent - a.change_percent)
  const gainers = quotes.filter((q) => q.change_percent > 0).length
  const avg = quotes.reduce((sum, q) => sum + q.change_percent, 0) / (quotes.length || 1)
  const best = sorted[0]
  const worst = sorted.at(-1)
  const vibe = avg > 0.5 ? 'we are so back 🔥' : avg < -0.5 ? "it's so over 💀" : 'mid market, touch grass 🌱'

  const tiles = [
    { label: 'Market vibe', value: vibe, sub: `top 10 avg ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`, icon: Flame },
    { label: 'Green vs red', value: `${gainers} 🟢 / ${quotes.length - gainers} 🔴`, sub: 'stocks up today', icon: TrendingUp },
    { label: 'Biggest W', value: best?.symbol, change: best?.change_percent, icon: TrendingUp, to: best?.symbol },
    { label: 'Biggest L', value: worst?.symbol, change: worst?.change_percent, icon: TrendingDown, to: worst?.symbol },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(({ label, value, sub, change, icon: Icon, to }, i) => {
        const body = (
          <Card className="h-full p-5">
            <div className="flex items-center gap-2 text-xs text-faint">
              <Icon className="size-4" aria-hidden /> {label}
            </div>
            <div className="mt-2 font-display text-xl font-bold">{value ?? '—'}</div>
            <div className="mt-1 text-sm text-muted">
              {change !== undefined ? <ChangePill value={change} /> : sub}
            </div>
          </Card>
        )
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
          >
            {to ? <Link to={`/stock/${to}`}>{body}</Link> : body}
          </motion.div>
        )
      })}
    </div>
  )
}

export function Dashboard() {
  const { quotes, isPending, error, refetch } = useTopQuotes()

  return (
    <div className="space-y-12">
      <section className="pt-6 text-center sm:pt-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto mb-4 inline-flex rounded-full border border-line bg-white/[0.04] px-4 py-1.5 font-mono text-xs text-muted"
        >
          ✨ live prices · ML rise scores · side-by-side compare
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-5xl font-bold leading-[0.95] tracking-tighter sm:text-7xl"
        >
          stonks, but <span className="text-gradient">make it smart.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-auto mt-5 max-w-xl text-muted"
        >
          Real-time prices for the top 10, a model that scores if each one's gonna rise or fall, and comparisons
          that hit different. No cap.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-7">
          <Link
            to="/compare"
            className="inline-flex items-center gap-2 rounded-full bg-up px-6 py-3 font-semibold text-ink shadow-[0_0_40px_-8px_var(--color-up)] transition hover:scale-[1.03] active:scale-[0.98]"
          >
            Compare stocks →
          </Link>
        </motion.div>
      </section>

      <div className="-mx-4 sm:-mx-6">
        <TickerTape quotes={quotes} />
      </div>

      {error ? (
        <ErrorState message={`Couldn't load the top 10: ${error.message}`} onRetry={refetch} />
      ) : (
        <>
          {quotes.length > 0 && <MarketVibe quotes={quotes} />}
          <section>
            <SectionTitle eyebrow="always live" title="Top 10 rn 🔥" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isPending
                ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)
                : quotes.map((quote, i) => <StockCard key={quote.symbol} quote={quote} index={i} />)}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
