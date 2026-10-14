import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { QuoteStream, StreamStatus } from '@/lib/quoteStream'
import type { Quote } from '@/lib/types'
import { StreamContext } from './streamContext'

function useStream(): QuoteStream {
  const stream = useContext(StreamContext)
  if (!stream) throw new Error('useStream must be used inside <QuoteStreamProvider>')
  return stream
}

/** Live quotes for the given symbols (top 10 are always streamed; others are tracked on demand). */
export function useLiveQuotes(symbols: readonly string[]): Record<string, Quote | undefined> {
  const stream = useStream()
  const quotes = useSyncExternalStore(stream.subscribe, stream.getQuotes)
  const key = symbols.join(',')

  useEffect(() => {
    if (!key) return
    return stream.track(key.split(','))
  }, [stream, key])

  return useMemo(() => Object.fromEntries(key.split(',').map((s) => [s, quotes[s]])), [quotes, key])
}

export function useLiveQuote(symbol: string): Quote | undefined {
  return useLiveQuotes([symbol])[symbol]
}

export function useAllLiveQuotes(): Readonly<Record<string, Quote>> {
  const stream = useStream()
  return useSyncExternalStore(stream.subscribe, stream.getQuotes)
}

export function useStreamStatus(): StreamStatus {
  const stream = useStream()
  return useSyncExternalStore(stream.subscribe, stream.getStatus)
}
