import { motion } from 'framer-motion'
import { SIGNAL_META } from '@/lib/signal'
import type { Signal } from '@/lib/types'

interface Props {
  score: number
  signal: Signal
  size?: number
  stroke?: number
}

/** Radial gauge for the model's 0-100 rise score. */
export function ScoreRing({ score, signal, size = 132, stroke = 12 }: Props) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const { color } = SIGNAL_META[signal]

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Rise score ${score} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-4xl font-bold tabular-nums leading-none" style={{ fontSize: size / 3.6 }}>
          {score}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">/ 100</div>
      </div>
    </div>
  )
}
