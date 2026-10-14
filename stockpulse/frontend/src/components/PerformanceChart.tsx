import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPercent, SERIES_COLORS } from '@/lib/format'
import type { Comparison } from '@/lib/types'

interface Props {
  comparison: Comparison
}

/** Overlay of % return since the start of the range — one shared axis, indexed to 0%. */
export function PerformanceChart({ comparison }: Props) {
  const { symbols, performance } = comparison
  const data = performance.map((p) => ({ time: p.time, ...p.values }))
  const lastIndex = data.length - 1
  const dateFormat = comparison.range === '5y' ? { year: '2-digit', month: 'short' } : { month: 'short', day: 'numeric' }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(v: string) => new Date(v).toLocaleDateString([], dateFormat as Intl.DateTimeFormatOptions)}
            tick={{ fill: 'var(--color-faint)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: 'var(--color-faint)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(255 255 255 / 0.25)', strokeDasharray: '4 4' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const rows = [...payload].sort((a, b) => Number(b.value) - Number(a.value))
              return (
                <div className="glass min-w-40 rounded-2xl px-3 py-2 text-xs shadow-xl">
                  <div className="mb-1.5 text-muted">{new Date(String(label)).toLocaleDateString()}</div>
                  {rows.map((row) => (
                    <div key={String(row.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
                      <span className="flex items-center gap-2 text-fg">
                        <span className="size-2 rounded-full" style={{ background: row.color }} />
                        {String(row.dataKey)}
                      </span>
                      <span className="font-mono font-bold text-fg">{formatPercent(Number(row.value))}</span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={32}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="font-mono text-xs text-muted">{value}</span>}
          />
          {symbols.map((symbol, i) => (
            <Line
              key={symbol}
              type="monotone"
              dataKey={symbol}
              stroke={SERIES_COLORS[i]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: 'var(--color-surface)', strokeWidth: 2 }}
              animationDuration={900}
              label={(props: { index?: number; x?: unknown; y?: unknown }) =>
                props.index === lastIndex ? (
                  <text
                    key={`${symbol}-label`}
                    x={Number(props.x) + 8}
                    y={Number(props.y)}
                    dy={4}
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    fill="var(--color-fg)"
                  >
                    {symbol}
                  </text>
                ) : (
                  <g key={`${symbol}-${props.index}`} />
                )
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
