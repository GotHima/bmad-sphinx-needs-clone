'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { IdChip } from '@/components/needs/IdChip'
import type { NeedSearchResult } from '@/types'

interface LinksInputProps {
  value: string[]
  onChange: (links: string[]) => void
  excludeId?: string
}

export function LinksInput({ value, onChange, excludeId }: LinksInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NeedSearchResult[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query })
        if (excludeId) params.set('exclude', excludeId)
        const res = await fetch(`/api/needs/search?${params.toString()}`)
        const data = (await res.json()) as NeedSearchResult[]
        const filtered = data.filter(r => !value.includes(r.id))
        setResults(filtered)
        setOpen(filtered.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, excludeId, value])

  function handleSelect(result: NeedSearchResult) {
    if (!value.includes(result.id)) {
      onChange([...value, result.id])
    }
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function handleRemove(id: string) {
    onChange(value.filter(v => v !== id))
  }

  return (
    <div className="flex flex-col gap-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(id => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs"
            >
              <IdChip id={id} />
              <button
                type="button"
                aria-label={`Remove link to ${id}`}
                onClick={() => handleRemove(id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by ID or title…"
          aria-label="Search needs to link"
          autoComplete="off"
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            <ul
              role="list"
              aria-live="polite"
              aria-label="Search results"
              className="max-h-48 overflow-y-auto py-1"
            >
              {results.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelect(r)}
                  >
                    <IdChip id={r.id} />
                    <span className="text-muted-foreground truncate">{r.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
