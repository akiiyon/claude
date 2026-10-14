import clsx from 'clsx'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('glass rounded-3xl', className)}>{children}</div>
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-xl bg-white/[0.06]', className)} />
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-down/30 bg-down/5 p-8 text-center">
      <AlertTriangle className="size-6 text-down" aria-hidden />
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
        >
          <RotateCcw className="size-4" aria-hidden /> try again
        </button>
      )}
    </div>
  )
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-faint">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {right}
    </div>
  )
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={clsx('text-xs leading-relaxed text-faint', className)}>
      ⚠️ Model scores are statistical estimates from past price action, for fun &amp; education. Not financial
      advice — markets don't care about your feelings. DYOR.
    </p>
  )
}
