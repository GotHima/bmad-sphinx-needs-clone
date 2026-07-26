import { SEARCH_PARAM_KEYS } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  void params
  void SEARCH_PARAM_KEYS // preserved for Story 3.1 — do not remove

  return (
    <main className="flex flex-1 flex-col" />
  )
}
