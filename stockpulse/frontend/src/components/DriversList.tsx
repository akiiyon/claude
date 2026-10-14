import { motion } from 'framer-motion'
import type { Driver } from '@/lib/types'

/** Diverging bars: which indicators pushed the score up (right) or down (left). */
export function DriversList({ drivers }: { drivers: Driver[] }) {
  const max = Math.max(...drivers.map((d) => Math.abs(d.impact)), 1e-6)
  return (
    <ul className="space-y-3">
      {drivers.map((driver, i) => {
        const positive = driver.impact >= 0
        const width = `${(Math.abs(driver.impact) / max) * 50}%`
        return (
          <li key={driver.feature}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted">{driver.label}</span>
              <span className="font-mono text-fg/80">
                {positive ? '▲ pushes up' : '▼ pushes down'}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-white/[0.06]">
              <span className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-white/25" aria-hidden />
              <motion.span
                className="absolute top-0 h-2 rounded-full"
                style={{
                  background: positive ? 'var(--color-up)' : 'var(--color-down)',
                  [positive ? 'left' : 'right']: '50%',
                }}
                initial={{ width: 0 }}
                animate={{ width }}
                transition={{ delay: 0.1 * i, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
