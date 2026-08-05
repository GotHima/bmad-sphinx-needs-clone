import { SEARCH_PARAM_KEYS } from '@/types'
import { listNeeds } from '@/lib/queries/needs'
import { listNeedTypes, listStatuses } from '@/lib/queries/config'
import { NeedsTable } from '@/components/needs/NeedsTable'

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function parseComma(v?: string | string[]): string[] {
  const s = Array.isArray(v) ? v[0] : v
  return s ? s.split(',').map(t => t.trim()).filter(Boolean) : []
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const rawSort = params[SEARCH_PARAM_KEYS.SORT]
  const rawDir = params[SEARCH_PARAM_KEYS.DIR]
  const sort = Array.isArray(rawSort) ? rawSort[0] : rawSort
  const dir = Array.isArray(rawDir) ? rawDir[0] : rawDir

  const type = parseComma(params[SEARCH_PARAM_KEYS.TYPE])
  const status = parseComma(params[SEARCH_PARAM_KEYS.STATUS])
  const tags = parseComma(params[SEARCH_PARAM_KEYS.TAG])
  const rawQ = params[SEARCH_PARAM_KEYS.QUERY]
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ

  const needs = listNeeds({ sort, dir, type, status, tags, q })
  const types = listNeedTypes()
  const statuses = listStatuses()

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <NeedsTable initialNeeds={needs} types={types} statuses={statuses} />
    </main>
  )
}
