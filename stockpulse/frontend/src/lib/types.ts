// Mirrors the backend Pydantic schemas (app/schemas).

export type HistoryRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y'
export type Signal = 'bullish' | 'neutral' | 'bearish'

export interface Quote {
  symbol: string
  name: string
  price: number
  previous_close: number
  change: number
  change_percent: number
  day_high: number | null
  day_low: number | null
  volume: number | null
  currency: string
  market_state: string
  updated_at: string
}

export interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface History {
  symbol: string
  range: HistoryRange
  interval: string
  candles: Candle[]
}

export interface Listing {
  symbol: string
  name: string
  sector: string
  is_top_10: boolean
}

export interface Driver {
  feature: string
  label: string
  value: number
  impact: number
}

export interface Prediction {
  symbol: string
  score: number
  probability_up: number
  signal: Signal
  confidence: 'low' | 'medium' | 'high'
  horizon_days: number
  model: string
  validation_accuracy: number
  baseline_accuracy: number
  training_samples: number
  drivers: Driver[]
  generated_at: string
  disclaimer: string
}

export interface RiskStats {
  symbol: string
  period_return: number
  annualized_volatility: number
  max_drawdown: number
  sharpe_ratio: number
  best_day: number
  worst_day: number
}

export interface Comparison {
  symbols: string[]
  range: HistoryRange
  quotes: Quote[]
  performance: { time: string; values: Record<string, number> }[]
  stats: RiskStats[]
  predictions: Prediction[]
  correlation: Record<string, Record<string, number>>
}

export interface Health {
  status: 'ok'
  provider: string
  live_data: boolean
  tracked_symbols: number
  last_quote_refresh: string | null
}

export type StreamMessage =
  | { type: 'snapshot' | 'quotes'; data: Quote[] }
  | { type: 'error'; message: string }
