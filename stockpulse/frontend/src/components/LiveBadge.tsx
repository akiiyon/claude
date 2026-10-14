import clsx from 'clsx'
import { useHealth } from '@/hooks/queries'
import { useStreamStatus } from '@/hooks/useLiveQuotes'

export function LiveBadge() {
  const status = useStreamStatus()
  const { data: health } = useHealth()
  const connected = status === 'open'
  const live = health?.live_data ?? true
  const label = !connected ? 'reconnecting' : live ? 'live' : 'demo data'

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider',
        connected && live && 'border-up/30 text-up',
        connected && !live && 'border-amber-300/30 text-amber-200',
        !connected && 'border-white/15 text-muted',
      )}
      title={
        live
          ? 'Prices stream over a WebSocket'
          : 'Live provider unreachable — showing prices from the built-in market simulator'
      }
    >
      <span className="relative flex size-2">
        {connected && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {label}
    </span>
  )
}
