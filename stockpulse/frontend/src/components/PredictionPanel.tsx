import { Brain, Info } from 'lucide-react'
import { usePrediction } from '@/hooks/queries'
import { SIGNAL_META } from '@/lib/signal'
import { DriversList } from './DriversList'
import { ScoreRing } from './ScoreRing'
import { SignalBadge } from './SignalBadge'
import { Card, Disclaimer, ErrorState, Skeleton } from './ui'

export function PredictionPanel({ symbol }: { symbol: string }) {
  const { data, isPending, error, refetch } = usePrediction(symbol)

  if (error) return <ErrorState message={`Model couldn't score ${symbol}: ${error.message}`} onRetry={() => refetch()} />

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet/20 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-2">
          <Brain className="size-5 text-violet" aria-hidden />
          <h3 className="font-display text-lg font-bold">AI Rise Score</h3>
        </div>

        {isPending || !data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <Skeleton className="size-32 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <p className="font-mono text-xs text-faint">training the model on 2y of candles…</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-5">
              <ScoreRing score={data.score} signal={data.signal} />
              <div className="space-y-2">
                <SignalBadge signal={data.signal} />
                <p className="text-sm text-muted">
                  {Math.round(data.probability_up * 100)}% chance it's higher in {data.horizon_days} trading days —{' '}
                  {SIGNAL_META[data.signal].vibe}.
                </p>
                <p className="font-mono text-xs text-faint">confidence: {data.confidence}</p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ['backtest acc.', `${(data.validation_accuracy * 100).toFixed(1)}%`],
                ['naive baseline', `${(data.baseline_accuracy * 100).toFixed(1)}%`],
                ['training days', data.training_samples.toString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/[0.04] px-2 py-3">
                  <dt className="text-[11px] text-faint">{label}</dt>
                  <dd className="font-mono text-sm font-bold">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                What's driving it
                <span title="Contribution of each indicator to the linear part of the ensemble">
                  <Info className="size-3.5 text-faint" aria-hidden />
                </span>
              </div>
              <DriversList drivers={data.drivers} />
            </div>
            <Disclaimer className="mt-6" />
          </>
        )}
      </div>
    </Card>
  )
}
