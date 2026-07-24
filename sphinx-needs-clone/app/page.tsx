import { SEARCH_PARAM_KEYS } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Await searchParams for Next.js 15+ forward-compatibility
  const params = await searchParams
  const query = params[SEARCH_PARAM_KEYS.QUERY] ?? ''

  return (
    <main className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-semibold">Needs</h1>
      <p className="text-muted-foreground mt-2">
        Requirements list will appear here. (query: {String(query)})
      </p>
    </main>
  )
}
