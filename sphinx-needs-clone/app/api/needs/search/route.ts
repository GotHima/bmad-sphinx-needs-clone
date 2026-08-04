import db from '@/lib/db'
import type { NeedSearchResult } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const exclude = searchParams.get('exclude')

  if (q.length < 2) return Response.json([])

  const escapedQ = q.replace(/[%_\\]/g, '\\$&')
  const pattern = `%${escapedQ}%`

  try {
    const rows = db
      .prepare(
        `SELECT n.id, n.title, nt.name AS type
         FROM need n
         JOIN need_type nt ON nt.id = n.type_id
         WHERE (n.id LIKE ? ESCAPE '\\' OR n.title LIKE ? ESCAPE '\\')
           AND (? IS NULL OR n.id != ?)
         LIMIT 10`
      )
      .all(pattern, pattern, exclude ?? null, exclude ?? null) as NeedSearchResult[]

    return Response.json(rows)
  } catch {
    return Response.json([], { status: 500 })
  }
}
