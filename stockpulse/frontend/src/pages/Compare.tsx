import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChangePill } from '@/components/ChangePill'
import { LivePrice } from '@/components/LivePrice'
import { PerformanceChart } from '@/components/PerformanceChart'
import { RangeTabs } from '@/components/RangeTabs'
import { ScoreRing } from '@/components/ScoreRing'
import { SearchBox } from '@/components/SearchBox'
import { SignalBadge } from '@/components/SignalBadge'
import { Card, Disclaimer, ErrorState, SectionTitle, Skeleton } from '@/components/ui'
import { useComparison } from '@/hooks/queries'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'
import { SERIES_COLORS } from '@/lib/format'
import type { Comparison, HistoryRange, RiskStats } from '@/lib/types'

const MAX_SYMBOLS = 4
const RANGES: HistoryRange[] = ['1mo', '3mo', '6mo', '1y', '5y']
const SUGGESTED = [['AAPL', 'MSFT'], ['NVDA', 'AMD', 'AVGO'], ['TSLA', 'GME', 'AMC'], ['META', 'GOOGL', 'NFLX']]

type Metric = { key: keyof RiskStats; label: string; format: (v: number) => string; better: 'high' | 'low' }
const METRICS: Metric[] = [
  { key: 'period_return', label: 'Return', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`, better: 'high' },
  { key: 'annualized_volatility', label: 'Volatility (ann.)', format: (v) => `${v.toFixed(1)}%`, better: 'low' },
  { key: 'max_drawdown', label: 'Max drawdown', format: (v) => `${v.toFixed(1)}%`, better: 'high' },
  { key: 'sharpe_ratio', label: 'Sharpe ratio', format: (v) => v.toFixed(2), better: 'high' },
  { key: 'best_day', label: 'Best day', format: (v) => `+${v.toFixed(2)}%`, better: 'high' },
  { key: 'worst_day', label: 'Worst day', format: (v) => `${v.toFixed(2)}%`, better: 'high' },
]

function useCompareParams() {
  const [params, setParams] = useSearchParams()
  const symbols = useMemo(
    () => [...new Set((params.get('s') ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, MAX_SYMBOLS),
    [params],
  )
  const rangeParam = params.get('range') as HistoryRange | null
  const range = rangeParam && RANGES.includes(rangeParam) ? rangeParam : '6mo'
  const update = (next: { symbols?: string[]; range?: HistoryRange }) => {
    const s = next.symbols ?? symbols
    setParams({ ...(s.length ? { s: s.join(',') } : {}), range: next.range ?? range }, { replace: true })
  }
  return { symbols, range, update }
}

export function Compare() {
  const { symbols, range, update } = useCompareParams()
  const comparison = useComparison(symbols, range)
  const live = useLiveQuotes(symbols)

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="head to head" title="Compare stocks ⚔️" right={<RangeTabs value={range} options={RANGES} onChange={(r) => update({ range: r })} />} />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <AnimatePresence initial={false}>
            {symbols.map((symbol, i) => (
              <motion.span
                key={symbol}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.06] py-1.5 pl-3 pr-1.5"
              >
                <span className="size-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} aria-hidden />
                <span className="font-mono text-sm font-bold">{symbol}</span>
                {live[symbol] && <LivePrice value={live[symbol]!.price} className="text-xs text-muted" />}
                <button
                  type="button"
                  aria-label={`Remove ${symbol}`}
                  onClick={() => update({ symbols: symbols.filter((s) => s !== symbol) })}
                  className="grid size-6 place-items-center rounded-full text-faint transition hover:bg-white/10 hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {symbols.length < MAX_SYMBOLS && (
            <SearchBox
              className="w-full sm:w-64"
              placeholder={symbols.length ? 'add another…' : 'pick a stock…'}
              exclude={symbols}
              onSelect={(l) => update({ symbols: [...symbols, l.symbol] })}
            />
          )}
        </div>
        {symbols.length < 2 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>pick at least 2, or try a matchup:</span>
            {SUGGESTED.map((set) => (
              <button
                key={set.join()}
                type="button"
                onClick={() => update({ symbols: set })}
                className="rounded-full border border-line px-3 py-1 font-mono text-xs transition hover:border-up/50 hover:text-up"
              >
                {set.join(' vs ')}
              </button>
            ))}
          </div>
        )}
      </Card>

      {symbols.length >= 2 &&
        (comparison.error ? (
          <ErrorState message={comparison.error.message} onRetry={() => comparison.refetch()} />
        ) : !comparison.data ? (
          <div className="space-y-6">
            <Skeleton className="h-96 rounded-3xl" />
            <p className="text-center font-mono text-xs text-faint">crunching numbers + training models…</p>
          </div>
        ) : (
          <div className={clsx('space-y-8 transition-opacity', comparison.isPlaceholderData && 'opacity-60')}>
            <Card className="p-5 sm:p-6">
              <h3 className="mb-2 font-display text-lg font-bold">Performance since start of range</h3>
              <PerformanceChart comparison={comparison.data} />
            </Card>
            <Verdicts comparison={comparison.data} live={live} />
            <StatsTable comparison={comparison.data} />
            <CorrelationGrid comparison={comparison.data} />
            <Disclaimer />
          </div>
        ))}
    </div>
  )
}

function Verdicts({ comparison, live }: { comparison: Comparison; live: Record<string, { price: number; change_percent: number } | undefined> }) {
  const pick = [...comparison.predictions].sort((a, b) => b.score - a.score)[0]
  return (
    <section>
      <SectionTitle eyebrow="the model says" title="AI verdict 🧠" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {comparison.predictions.map((p, i) => {
          const quote = live[p.symbol] ?? comparison.quotes.find((q) => q.symbol === p.symbol)
          const isPick = p.symbol === pick.symbol
          return (
            <motion.div key={p.symbol} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link to={`/stock/${p.symbol}`} className={clsx('glass relative block rounded-3xl p-5 transition hover:bg-white/[0.06]', isPick && 'ring-1 ring-up/50')}>
                {isPick && (
                  <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-up px-2.5 py-0.5 text-xs font-bold text-ink">
                    <Crown className="size-3.5" aria-hidden /> AI pick
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-display text-xl font-bold">
                    <span className="size-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} aria-hidden />
                    {p.symbol}
                  </span>
                  {quote && <ChangePill value={quote.change_percent} />}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <ScoreRing score={p.score} signal={p.signal} size={92} stroke={9} />
                  <div className="space-y-1.5">
                    <SignalBadge signal={p.signal} />
                    <p className="font-mono text-xs text-faint">conf: {p.confidence}</p>
                    <p className="font-mono text-xs text-faint">acc: {(p.validation_accuracy * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function StatsTable({ comparison }: { comparison: Comparison }) {
  return (
    <section>
      <SectionTitle eyebrow={`over ${comparison.range}`} title="Stats check 📊" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-5 py-4 font-medium text-faint">Metric</th>
              {comparison.symbols.map((s, i) => (
                <th key={s} className="px-5 py-4 text-right font-mono font-bold">
                  <span className="mr-2 inline-block size-2 rounded-full" style={{ background: SERIES_COLORS[i] }} aria-hidden />
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const values = comparison.stats.map((s) => s[metric.key] as number)
              const best = metric.better === 'high' ? Math.max(...values) : Math.min(...values)
              return (
                <tr key={metric.key} className="border-b border-line/50 last:border-0">
                  <td className="px-5 py-3.5 text-muted">{metric.label}</td>
                  {values.map((v, i) => (
                    <td key={comparison.symbols[i]} className={clsx('px-5 py-3.5 text-right font-mono tabular-nums', v === best ? 'font-bold text-fg' : 'text-muted')}>
                      {v === best && <span className="mr-1" aria-label="best">👑</span>}
                      {metric.format(v)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </section>
  )
}

function CorrelationGrid({ comparison }: { comparison: Comparison }) {
  const { symbols, correlation } = comparison
  // Diverging scale: pink (move opposite) ← gray (unrelated) → lime (move together).
  const cellColor = (r: number) =>
    `color-mix(in oklab, ${r >= 0 ? 'var(--color-up)' : 'var(--color-down)'} ${Math.round(Math.abs(r) * 55)}%, rgb(255 255 255 / 0.04))`
  return (
    <section>
      <SectionTitle eyebrow="daily returns" title="Do they move together? 🔗" />
      <Card className="inline-block max-w-full overflow-x-auto p-5">
        <table className="border-separate border-spacing-1.5 text-sm">
          <thead>
            <tr>
              <th />
              {symbols.map((s) => (
                <th key={s} className="px-2 pb-1 font-mono text-xs text-muted">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((row) => (
              <tr key={row}>
                <th className="pr-2 text-right font-mono text-xs text-muted">{row}</th>
                {symbols.map((col) => {
                  const r = correlation[row][col]
                  return (
                    <td
                      key={col}
                      title={`${row} × ${col}: ${r.toFixed(2)}`}
                      className="size-16 rounded-xl text-center font-mono text-xs font-bold text-fg"
                      style={{ background: cellColor(r) }}
                    >
                      {r.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-faint">1.00 = move in lockstep · 0 = no relationship · −1 = opposites</p>
      </Card>
    </section>
  )
}
