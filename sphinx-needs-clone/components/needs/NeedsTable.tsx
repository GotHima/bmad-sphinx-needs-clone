'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { SEARCH_PARAM_KEYS } from '@/types'
import type { NeedType, StatusValue } from '@/types'
import type { NeedRow } from '@/lib/queries/needs'
import { NeedTypeBadge } from '@/components/needs/NeedTypeBadge'
import { StatusBadge } from '@/components/needs/StatusBadge'
import { IdChip } from '@/components/needs/IdChip'
import { Button } from '@/components/ui/button'
import { parseTags } from '@/lib/utils'
import { NeedSheet } from '@/components/needs/NeedSheet'

interface NeedsTableProps {
  initialNeeds: NeedRow[]
  types: NeedType[]
  statuses: StatusValue[]
}

const SORTABLE_COLS = [
  { key: 'id', label: 'ID' },
  { key: 'type_name', label: 'Type' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'tags', label: 'Tags' },
] as const

type SortableColKey = typeof SORTABLE_COLS[number]['key']

function SortIcon({ col, currentSort, currentDir }: {
  col: SortableColKey
  currentSort: string
  currentDir: 'asc' | 'desc'
}) {
  if (currentSort !== col) {
    return <ChevronsUpDown className="size-3 ml-1 inline text-muted-foreground" />
  }
  return currentDir === 'asc'
    ? <ChevronUp className="size-3 ml-1 inline" />
    : <ChevronDown className="size-3 ml-1 inline" />
}

export function NeedsTable({ initialNeeds, types, statuses }: NeedsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetOpenRef = useRef(sheetOpen)
  useEffect(() => { sheetOpenRef.current = sheetOpen }, [sheetOpen])

  const currentSort = searchParams.get(SEARCH_PARAM_KEYS.SORT) ?? 'created_at'
  const currentDir: 'asc' | 'desc' = searchParams.get(SEARCH_PARAM_KEYS.DIR) === 'desc' ? 'desc' : 'asc'

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setSheetOpen(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('new')
      const cleanUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(cleanUrl)
    }
  }, [searchParams, pathname, router])

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (sheetOpenRef.current) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setSheetOpen(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  function handleSort(col: SortableColKey) {
    const newDir: 'asc' | 'desc' = currentSort === col && currentDir === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams(searchParams.toString())
    params.set(SEARCH_PARAM_KEYS.SORT, col)
    params.set(SEARCH_PARAM_KEYS.DIR, newDir)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      {initialNeeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16 text-muted-foreground">
          <p className="text-sm">No needs yet.</p>
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            New Need
          </Button>
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-background z-10 border-b border-border">
              <tr>
                {SORTABLE_COLS.map(col => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
                    aria-sort={currentSort === col.key ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon col={col.key} currentSort={currentSort} currentDir={currentDir} />
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Links
                </th>
              </tr>
            </thead>
            <tbody>
              {initialNeeds.map(need => {
                const tags = parseTags(need.tags)
                return (
                  <tr
                    key={need.id}
                    className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                    tabIndex={0}
                    onClick={() => { /* TODO Story 3.3: open NeedSheet in edit mode for this need */ }}
                    onKeyDown={e => { if (e.key === 'Enter') { /* TODO Story 3.3: open NeedSheet in edit mode for this need */ } }}
                  >
                    <td className="px-3 py-2">
                      <IdChip id={need.id} />
                    </td>
                    <td className="px-3 py-2">
                      {need.type_name && need.type_color ? (
                        <NeedTypeBadge name={need.type_name} color={need.type_color} />
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{need.title}</td>
                    <td className="px-3 py-2">
                      <StatusBadge value={need.status} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {tags.length > 0 ? tags.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">—</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <NeedSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        types={types}
        statuses={statuses}
      />
    </>
  )
}


