import clsx from 'clsx'
import { SIGNAL_META } from '@/lib/signal'
import type { Signal } from '@/lib/types'

export function SignalBadge({ signal, score, className }: { signal: Signal; score?: number; className?: string }) {
  const meta = SIGNAL_META[signal]
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', className)}
      style={{ borderColor: `color-mix(in oklab, ${meta.color} 40%, transparent)`, color: meta.color }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
      {score !== undefined && <span className="font-mono tabular-nums text-fg/80">{score}</span>}
    </span>
  )
}
