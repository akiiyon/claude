import { useId, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPrice } from '@/lib/format'
import type { Candle, HistoryRange } from '@/lib/types'

interface Props {
  candles: Candle[]
  range: HistoryRange
  livePrice?: number
}

const INTRADAY: HistoryRange[] = ['1d', '5d']

function formatTick(iso: string, range: HistoryRange): string {
  const date = new Date(iso)
  if (range === '1d') return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (range === '5d') return date.toLocaleDateString([], { weekday: 'short' })
  if (range === '5y') return date.toLocaleDateString([], { year: 'numeric', month: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function PriceChart({ candles, range, livePrice }: Props) {
  const gradientId = useId()

  const data = useMemo(() => {
    const points = candles.map((c) => ({ time: c.time, price: c.close }))
    // Keep the newest point pinned to the live tick so the chart moves with the stream.
    if (livePrice !== undefined && points.length) points[points.length - 1] = { ...points.at(-1)!, price: livePrice }
    return points
  }, [candles, livePrice])

  const first = data[0]?.price ?? 0
  const last = data.at(-1)?.price ?? 0
  const color = last >= first ? 'var(--color-up)' : 'var(--color-down)'

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(v: string) => formatTick(v, range)}
            tick={{ fill: 'var(--color-faint)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            domain={['auto', 'auto']}
            orientation="right"
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
            tick={{ fill: 'var(--color-faint)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(255 255 255 / 0.25)', strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as { time: string; price: number } | undefined
              if (!active || !point) return null
              const when = new Date(point.time)
              return (
                <div className="glass rounded-2xl px-3 py-2 text-xs shadow-xl">
                  <div className="text-muted">
                    {INTRADAY.includes(range) ? when.toLocaleString() : when.toLocaleDateString()}
                  </div>
                  <div className="font-mono text-sm font-bold text-fg">{formatPrice(point.price)}</div>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
