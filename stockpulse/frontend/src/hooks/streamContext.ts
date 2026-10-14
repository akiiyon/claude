import { createContext } from 'react'
import type { QuoteStream } from '@/lib/quoteStream'

export const StreamContext = createContext<QuoteStream | null>(null)
