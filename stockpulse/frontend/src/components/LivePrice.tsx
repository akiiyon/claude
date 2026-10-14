import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/format'

/** Price that briefly flashes lime / pink when a new tick moves it up / down. */
export function LivePrice({ value, className }: { value: number; className?: string }) {
  const previous = useRef(value)
  const [tick, setTick] = useState<{ dir: 'up' | 'down'; id: number } | null>(null)

  useEffect(() => {
    if (value !== previous.current) {
      setTick((t) => ({ dir: value > previous.current ? 'up' : 'down', id: (t?.id ?? 0) + 1 }))
      previous.current = value
    }
  }, [value])

  return (
    <motion.span
      key={tick?.id ?? 0}
      initial={tick ? { scale: 1.04 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={clsx(
        'inline-block rounded-lg font-mono tabular-nums transition-colors duration-700',
        tick?.dir === 'up' && 'animate-[flash-up_1s_ease-out]',
        tick?.dir === 'down' && 'animate-[flash-down_1s_ease-out]',
        className,
      )}
      aria-live="polite"
    >
      {formatPrice(value)}
    </motion.span>
  )
}
