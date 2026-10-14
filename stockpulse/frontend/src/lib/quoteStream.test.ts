import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuoteStream } from './quoteStream'
import type { Quote } from './types'

class FakeSocket {
  static instances: FakeSocket[] = []
  readyState = 0
  sent: unknown[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null

  readonly url: string

  constructor(url: string) {
    this.url = url
    FakeSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  // test helpers
  open() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
  drop() {
    this.readyState = 3
    this.onclose?.()
  }
}

const quote = (symbol: string, price: number): Quote => ({
  symbol,
  name: symbol,
  price,
  previous_close: price,
  change: 0,
  change_percent: 0,
  day_high: null,
  day_low: null,
  volume: null,
  currency: 'USD',
  market_state: 'OPEN',
  updated_at: new Date().toISOString(),
})

describe('QuoteStream', () => {
  let stream: QuoteStream
  const latest = () => FakeSocket.instances.at(-1)!

  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.instances = []
    stream = new QuoteStream('ws://test', (url) => new FakeSocket(url) as unknown as WebSocket)
    stream.connect()
  })
  afterEach(() => {
    stream.close()
    vi.useRealTimers()
  })

  it('merges incoming quotes and notifies listeners', () => {
    const listener = vi.fn()
    stream.subscribe(listener)
    latest().open()
    latest().receive({ type: 'snapshot', data: [quote('AAPL', 1), quote('MSFT', 2)] })
    latest().receive({ type: 'quotes', data: [quote('AAPL', 3)] })
    expect(stream.getQuotes().AAPL.price).toBe(3)
    expect(stream.getQuotes().MSFT.price).toBe(2)
    expect(stream.getStatus()).toBe('open')
    expect(listener).toHaveBeenCalled()
  })

  it('ref-counts subscriptions', () => {
    latest().open()
    const releaseA = stream.track(['AMD'])
    const releaseB = stream.track(['AMD', 'INTC'])
    releaseA()
    releaseB()
    expect(latest().sent).toEqual([
      { action: 'subscribe', symbols: ['AMD'] },
      { action: 'subscribe', symbols: ['INTC'] },
      { action: 'unsubscribe', symbols: ['AMD', 'INTC'] },
    ])
  })

  it('reconnects with backoff and replays subscriptions', () => {
    latest().open()
    stream.track(['AMD'])
    latest().drop()
    expect(stream.getStatus()).toBe('reconnecting')
    expect(FakeSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1500)
    expect(FakeSocket.instances).toHaveLength(2)
    latest().open()
    expect(latest().sent).toEqual([{ action: 'subscribe', symbols: ['AMD'] }])
  })

  it('does not reconnect after an explicit close', () => {
    latest().open()
    stream.close()
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
  })
})
