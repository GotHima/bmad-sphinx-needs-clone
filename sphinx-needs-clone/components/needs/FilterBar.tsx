'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { X, ChevronDown } from 'lucide-react'
import { SEARCH_PARAM_KEYS } from '@/types'
import type { NeedType, StatusValue } from '@/types'
import { Input } from '@/components/ui/input'

interface FilterBarProps {
  types: NeedType[]
  statuses: StatusValue[]
}

function parseCommaParam(v: string | null): string[] {
  return v ? v.split(',').map(t => t.trim()).filter(Boolean) : []
}

export function FilterBar({ types, statuses }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedTypes = parseCommaParam(searchParams.get(SEARCH_PARAM_KEYS.TYPE))
  const selectedStatuses = parseCommaParam(searchParams.get(SEARCH_PARAM_KEYS.STATUS))
  const selectedTags = parseCommaParam(searchParams.get(SEARCH_PARAM_KEYS.TAG))
  const q = searchParams.get(SEARCH_PARAM_KEYS.QUERY) ?? ''

  const [inputQ, setInputQ] = useState(q)
  const [typeOpen, setTypeOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // Always-current ref avoids stale closures in the debounce timer
  const pushParamsRef = useRef<(updates: Record<string, string | null>) => void>(() => {})

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }
  pushParamsRef.current = pushParams

  // Sync inputQ when URL changes externally (browser back/forward)
  useEffect(() => { setInputQ(q) }, [q])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 200ms debounce for free-text search — uses ref to avoid stale closure
  // Skip first render to prevent spurious history entry when initializing from URL q param
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      pushParamsRef.current({ [SEARCH_PARAM_KEYS.QUERY]: inputQ || null })
    }, 200)
    return () => clearTimeout(timer)
  }, [inputQ])

  function toggleType(name: string) {
    const newTypes = selectedTypes.includes(name)
      ? selectedTypes.filter(t => t !== name)
      : [...selectedTypes, name]
    pushParams({ [SEARCH_PARAM_KEYS.TYPE]: newTypes.join(',') || null })
  }

  function toggleStatus(value: string) {
    const newStatuses = selectedStatuses.includes(value)
      ? selectedStatuses.filter(s => s !== value)
      : [...selectedStatuses, value]
    pushParams({ [SEARCH_PARAM_KEYS.STATUS]: newStatuses.join(',') || null })
  }

  function removeTag(tag: string) {
    const newTags = selectedTags.filter(t => t !== tag)
    pushParams({ [SEARCH_PARAM_KEYS.TAG]: newTags.join(',') || null })
  }

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || selectedTags.includes(trimmed)) {
      setTagInput('')
      return
    }
    pushParams({ [SEARCH_PARAM_KEYS.TAG]: [...selectedTags, trimmed].join(',') })
    setTagInput('')
  }

  function clearAll() {
    pushParams({
      [SEARCH_PARAM_KEYS.TYPE]: null,
      [SEARCH_PARAM_KEYS.STATUS]: null,
      [SEARCH_PARAM_KEYS.TAG]: null,
      [SEARCH_PARAM_KEYS.QUERY]: null,
    })
    setInputQ('')
  }

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedTags.length > 0 ||
    !!q

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border">
      {/* Type multi-select */}
      <div ref={typeDropdownRef} className="relative">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted transition-colors"
          aria-expanded={typeOpen}
          onClick={() => { setTypeOpen(o => !o); setStatusOpen(false) }}
        >
          {selectedTypes.length === 0
            ? 'Type'
            : selectedTypes.length === 1
              ? selectedTypes[0]
              : `${selectedTypes.length} types`}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
        {typeOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-border bg-popover shadow-md">
            <ul className="py-1 max-h-52 overflow-y-auto" role="listbox" aria-label="Filter by type">
              {types.length === 0 && (
                <li className="px-3 py-2 text-xs text-muted-foreground">No types defined</li>
              )}
              {types.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedTypes.includes(t.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => toggleType(t.name)}
                  >
                    <span
                      className={`size-3 rounded-sm border flex-shrink-0 ${
                        selectedTypes.includes(t.name) ? 'bg-primary border-primary' : 'border-border'
                      }`}
                    />
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Status multi-select */}
      <div ref={statusDropdownRef} className="relative">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted transition-colors"
          aria-expanded={statusOpen}
          onClick={() => { setStatusOpen(o => !o); setTypeOpen(false) }}
        >
          {selectedStatuses.length === 0
            ? 'Status'
            : selectedStatuses.length === 1
              ? selectedStatuses[0]
              : `${selectedStatuses.length} statuses`}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
        {statusOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-border bg-popover shadow-md">
            <ul className="py-1 max-h-52 overflow-y-auto" role="listbox" aria-label="Filter by status">
              {statuses.length === 0 && (
                <li className="px-3 py-2 text-xs text-muted-foreground">No statuses defined</li>
              )}
              {statuses.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedStatuses.includes(s.value)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => toggleStatus(s.value)}
                  >
                    <span
                      className={`size-3 rounded-sm border flex-shrink-0 ${
                        selectedStatuses.includes(s.value) ? 'bg-primary border-primary' : 'border-border'
                      }`}
                    />
                    {s.value}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tags token input */}
      <div className="flex flex-wrap items-center gap-1">
        {selectedTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag filter ${tag}`}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => removeTag(tag)}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-[80px] w-20 rounded-md border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Add tag…"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(tagInput)
            }
          }}
          aria-label="Filter by tag"
        />
      </div>

      {/* Free-text search */}
      <Input
        className="h-7 w-44 text-xs"
        placeholder="Search ID or title…"
        value={inputQ}
        onChange={e => setInputQ(e.target.value)}
        aria-label="Search needs by ID or title"
      />

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          onClick={clearAll}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
