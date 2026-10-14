import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatPercent, trendOf } from '@/lib/format'

const STYLES = {
  up: 'bg-up/10 text-up',
  down: 'bg-down/10 text-down',
  flat: 'bg-white/10 text-muted',
} as const

const ICONS = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const

export function ChangePill({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const trend = trendOf(value)
  const Icon = ICONS[trend]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-mono font-bold tabular-nums',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        STYLES[trend],
      )}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      {formatPercent(value)}
    </span>
  )
}
