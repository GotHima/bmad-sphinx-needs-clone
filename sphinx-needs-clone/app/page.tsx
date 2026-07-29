import { SEARCH_PARAM_KEYS } from '@/types'
import { listNeeds } from '@/lib/queries/needs'
import { listNeedTypes, listStatuses } from '@/lib/queries/config'
import { NeedsTable } from '@/components/needs/NeedsTable'

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const rawSort = params[SEARCH_PARAM_KEYS.SORT]
  const rawDir = params[SEARCH_PARAM_KEYS.DIR]
  const sort = Array.isArray(rawSort) ? rawSort[0] : rawSort
  const dir = Array.isArray(rawDir) ? rawDir[0] : rawDir

  const needs = listNeeds({ sort, dir })
  const types = listNeedTypes()
  const statuses = listStatuses()

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <NeedsTable initialNeeds={needs} types={types} statuses={statuses} />
    </main>
  )
}
