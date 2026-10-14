import { useEffect, useState, type ReactNode } from 'react'
import { StreamContext } from '@/hooks/streamContext'
import { websocketUrl } from '@/lib/api'
import { QuoteStream } from '@/lib/quoteStream'

export function QuoteStreamProvider({ children }: { children: ReactNode }) {
  const [stream] = useState(() => new QuoteStream(websocketUrl()))
  useEffect(() => {
    stream.connect()
    return () => stream.close()
  }, [stream])
  return <StreamContext.Provider value={stream}>{children}</StreamContext.Provider>
}
