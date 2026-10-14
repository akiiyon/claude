import type { Signal } from './types'

export const SIGNAL_META: Record<Signal, { label: string; emoji: string; vibe: string; color: string }> = {
  bullish: { label: 'Bullish', emoji: '🚀', vibe: 'main character energy', color: 'var(--color-up)' },
  neutral: { label: 'Mid', emoji: '😐', vibe: 'could go either way fr', color: 'var(--color-flat)' },
  bearish: { label: 'Bearish', emoji: '📉', vibe: 'lowkey looking rough', color: 'var(--color-down)' },
}
