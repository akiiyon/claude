import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useSearch } from '@/hooks/queries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Listing } from '@/lib/types'

interface Props {
  onSelect: (listing: Listing) => void
  placeholder?: string
  exclude?: string[]
  hotkey?: boolean
  className?: string
}

/** Accessible combobox for ticker search (keyboard: ↑ ↓ Enter Esc, "/" to focus). */
export function SearchBox({ onSelect, placeholder = 'Search tickers…', exclude = [], hotkey, className }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const debounced = useDebouncedValue(query, 150)
  const { data = [] } = useSearch(debounced)
  const results = data.filter((r) => !exclude.includes(r.symbol))

  useEffect(() => {
    if (!hotkey) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hotkey])

  const choose = (listing: Listing) => {
    onSelect(listing)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      choose(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className={clsx('relative', className)}>
      <label className="flex items-center gap-2 rounded-full border border-line bg-white/[0.05] px-4 py-2.5 transition focus-within:border-up/60 focus-within:bg-white/[0.08]">
        <Search className="size-4 shrink-0 text-faint" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${results[active].symbol}` : undefined}
          className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
        />
        {hotkey && (
          <kbd className="hidden rounded-md border border-line px-1.5 font-mono text-[10px] text-faint sm:block">/</kbd>
        )}
      </label>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 max-h-80 w-full min-w-64 overflow-auto rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            {results.map((r, i) => (
              <li
                key={r.symbol}
                id={`${listId}-${r.symbol}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className={clsx(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2',
                  i === active && 'bg-white/[0.08]',
                )}
              >
                <span className="min-w-0">
                  <span className="font-mono text-sm font-bold">{r.symbol}</span>
                  <span className="ml-2 truncate text-xs text-muted">{r.name}</span>
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">
                  {r.is_top_10 ? '🔥 top 10' : r.sector}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
