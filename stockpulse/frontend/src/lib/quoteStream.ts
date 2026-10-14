import type { Quote, StreamMessage } from './types'

export type StreamStatus = 'connecting' | 'open' | 'reconnecting'

type Listener = () => void
type SocketFactory = (url: string) => WebSocket

const MAX_BACKOFF_MS = 30_000

/**
 * Framework-agnostic store for the live quote WebSocket.
 * Reconnects with exponential backoff and replays ref-counted symbol
 * subscriptions after every reconnect. Consumed via useSyncExternalStore.
 */
export class QuoteStream {
  private socket: WebSocket | null = null
  private quotes: Readonly<Record<string, Quote>> = {}
  private status: StreamStatus = 'connecting'
  private readonly listeners = new Set<Listener>()
  private readonly refCounts = new Map<string, number>()
  private retries = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private closed = false

  private readonly url: string
  private readonly createSocket: SocketFactory

  constructor(url: string, createSocket: SocketFactory = (u) => new WebSocket(u)) {
    this.url = url
    this.createSocket = createSocket
  }

  connect(): void {
    this.closed = false
    this.open()
  }

  close(): void {
    this.closed = true
    clearTimeout(this.reconnectTimer)
    const socket = this.socket
    this.socket = null
    if (socket?.readyState === WebSocket.CONNECTING) {
      // Closing mid-handshake logs a browser warning; close as soon as it opens instead.
      socket.onopen = () => socket.close()
    } else {
      socket?.close()
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getQuotes = (): Readonly<Record<string, Quote>> => this.quotes
  getStatus = (): StreamStatus => this.status

  /** Ask the server to stream extra symbols; returns a release function. */
  track(symbols: string[]): () => void {
    const added = symbols.filter((symbol) => {
      const count = this.refCounts.get(symbol) ?? 0
      this.refCounts.set(symbol, count + 1)
      return count === 0
    })
    if (added.length) this.send({ action: 'subscribe', symbols: added })

    return () => {
      const removed = symbols.filter((symbol) => {
        const count = (this.refCounts.get(symbol) ?? 1) - 1
        if (count <= 0) this.refCounts.delete(symbol)
        else this.refCounts.set(symbol, count)
        return count <= 0
      })
      if (removed.length) this.send({ action: 'unsubscribe', symbols: removed })
    }
  }

  private open(): void {
    const socket = this.createSocket(this.url)
    this.socket = socket
    socket.onopen = () => {
      this.retries = 0
      this.setStatus('open')
      if (this.refCounts.size) this.send({ action: 'subscribe', symbols: [...this.refCounts.keys()] })
    }
    socket.onmessage = (event: MessageEvent<string>) => this.handle(event.data)
    socket.onclose = () => {
      if (this.closed || this.socket !== socket) return
      this.setStatus('reconnecting')
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.retries) * (0.8 + Math.random() * 0.4)
      this.retries += 1
      this.reconnectTimer = setTimeout(() => this.open(), delay)
    }
  }

  private handle(raw: string): void {
    let message: StreamMessage
    try {
      message = JSON.parse(raw) as StreamMessage
    } catch {
      return
    }
    if (message.type === 'error') {
      console.warn('[quote-stream]', message.message)
      return
    }
    const next = { ...this.quotes }
    for (const quote of message.data) next[quote.symbol] = quote
    this.quotes = next
    this.emit()
  }

  private send(payload: { action: 'subscribe' | 'unsubscribe'; symbols: string[] }): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload))
  }

  private setStatus(status: StreamStatus): void {
    this.status = status
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
