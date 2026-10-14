import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HistoryRange } from '@/lib/types'

export const queryKeys = {
  health: ['health'] as const,
  top: ['stocks', 'top'] as const,
  search: (q: string) => ['stocks', 'search', q] as const,
  quote: (symbol: string) => ['stocks', symbol, 'quote'] as const,
  history: (symbol: string, range: HistoryRange) => ['stocks', symbol, 'history', range] as const,
  prediction: (symbol: string) => ['stocks', symbol, 'prediction'] as const,
  compare: (symbols: string[], range: HistoryRange) => ['compare', symbols.join(','), range] as const,
}

export const useHealth = () =>
  useQuery({ queryKey: queryKeys.health, queryFn: ({ signal }) => api.health(signal), refetchInterval: 60_000 })

export const useTopStocks = () =>
  useQuery({ queryKey: queryKeys.top, queryFn: ({ signal }) => api.topStocks(signal) })

export const useSearch = (q: string) =>
  useQuery({
    queryKey: queryKeys.search(q),
    queryFn: ({ signal }) => api.search(q, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  })

export const useQuote = (symbol: string) =>
  useQuery({ queryKey: queryKeys.quote(symbol), queryFn: ({ signal }) => api.quote(symbol, signal) })

export const useHistory = (symbol: string, range: HistoryRange) =>
  useQuery({
    queryKey: queryKeys.history(symbol, range),
    queryFn: ({ signal }) => api.history(symbol, range, signal),
    placeholderData: keepPreviousData,
    staleTime: range === '1d' || range === '5d' ? 30_000 : 5 * 60_000,
    refetchInterval: range === '1d' ? 60_000 : false,
  })

export const usePrediction = (symbol: string) =>
  useQuery({
    queryKey: queryKeys.prediction(symbol),
    queryFn: ({ signal }) => api.prediction(symbol, signal),
    staleTime: 10 * 60_000,
  })

export const useComparison = (symbols: string[], range: HistoryRange) =>
  useQuery({
    queryKey: queryKeys.compare(symbols, range),
    queryFn: ({ signal }) => api.compare(symbols, range, signal),
    enabled: symbols.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
