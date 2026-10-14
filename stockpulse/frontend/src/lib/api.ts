import type { Comparison, Health, History, HistoryRange, Listing, Prediction, Quote } from './types'

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  const response = await fetch(`${API_BASE}${path}${query}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const error = body?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? (typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`),
    )
  }
  return response.json() as Promise<T>
}

const enc = encodeURIComponent

export const api = {
  health: (signal?: AbortSignal) => get<Health>('/health', undefined, signal),
  topStocks: (signal?: AbortSignal) => get<Quote[]>('/stocks/top', undefined, signal),
  search: (q: string, signal?: AbortSignal) =>
    get<{ results: Listing[] }>('/stocks/search', { q, limit: '8' }, signal).then((r) => r.results),
  quote: (symbol: string, signal?: AbortSignal) => get<Quote>(`/stocks/${enc(symbol)}/quote`, undefined, signal),
  history: (symbol: string, range: HistoryRange, signal?: AbortSignal) =>
    get<History>(`/stocks/${enc(symbol)}/history`, { range }, signal),
  prediction: (symbol: string, signal?: AbortSignal) =>
    get<Prediction>(`/stocks/${enc(symbol)}/prediction`, undefined, signal),
  compare: (symbols: string[], range: HistoryRange, signal?: AbortSignal) =>
    get<Comparison>('/compare', { symbols: symbols.join(','), range }, signal),
}

export function websocketUrl(path = '/ws/quotes'): string {
  const base = new URL(API_BASE, window.location.href)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = `${base.pathname.replace(/\/$/, '')}${path}`
  return base.toString()
}
