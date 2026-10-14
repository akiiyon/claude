import { describe, expect, it } from 'vitest'
import { formatPercent, formatPrice, formatSigned, trendOf } from './format'

describe('format', () => {
  it('formats signed percentages with a real minus sign', () => {
    expect(formatPercent(1.234)).toBe('+1.23%')
    expect(formatPercent(-0.5)).toBe('−0.50%')
    expect(formatPercent(0)).toBe('0.00%')
  })
  it('formats prices as USD', () => {
    expect(formatPrice(1234.5)).toBe('$1,234.50')
  })
  it('signs deltas and classifies trend', () => {
    expect(formatSigned(-2)).toBe('−2.00')
    expect(trendOf(0.1)).toBe('up')
    expect(trendOf(-0.1)).toBe('down')
    expect(trendOf(0)).toBe('flat')
  })
})
