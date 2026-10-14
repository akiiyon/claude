import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useId } from 'react'
import type { HistoryRange } from '@/lib/types'

const LABELS: Record<HistoryRange, string> = {
  '1d': '1D', '5d': '5D', '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1Y', '5y': '5Y',
}

interface Props {
  value: HistoryRange
  onChange: (range: HistoryRange) => void
  options?: HistoryRange[]
}

export function RangeTabs({ value, onChange, options = Object.keys(LABELS) as HistoryRange[] }: Props) {
  const layoutId = useId()
  return (
    <div role="tablist" aria-label="Time range" className="inline-flex rounded-full bg-white/[0.06] p-1">
      {options.map((range) => (
        <button
          key={range}
          role="tab"
          type="button"
          aria-selected={value === range}
          onClick={() => onChange(range)}
          className={clsx(
            'relative rounded-full px-3 py-1.5 font-mono text-xs font-bold transition-colors',
            value === range ? 'text-ink' : 'text-muted hover:text-fg',
          )}
        >
          {value === range && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-full bg-up"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{LABELS[range]}</span>
        </button>
      ))}
    </div>
  )
}
