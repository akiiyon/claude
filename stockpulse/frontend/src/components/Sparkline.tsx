import { useId, useMemo } from 'react'

interface Props {
  values: number[]
  trend: 'up' | 'down' | 'flat'
  width?: number
  height?: number
}

/** Lightweight SVG sparkline (no axes/hover — it is a glanceable trend, not a chart). */
export function Sparkline({ values, trend, width = 120, height = 40 }: Props) {
  const gradientId = useId()
  const color = trend === 'up' ? 'var(--color-up)' : trend === 'down' ? 'var(--color-down)' : 'var(--color-flat)'

  const { line, area } = useMemo(() => {
    if (values.length < 2) return { line: '', area: '' }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const points = values.map((v, i) => [
      (i / (values.length - 1)) * width,
      height - 2 - ((v - min) / span) * (height - 4),
    ])
    const path = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
    return { line: path, area: `${path}L${width},${height}L0,${height}Z` }
  }, [values, width, height])

  if (!line) return <div style={{ width, height }} />

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
