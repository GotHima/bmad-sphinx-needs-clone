import 'server-only'

import db from '@/lib/db'
import type { Need } from '@/types'

const VALID_SORT_COLS = ['id', 'type_name', 'title', 'status', 'tags', 'created_at'] as const
type SortColumn = typeof VALID_SORT_COLS[number]

export type NeedRow = Need & { link_count: number }

export interface ListNeedsOpts {
  sort?: string
  dir?: string
  type?: string[]
  status?: string[]
  tags?: string[]
  q?: string
}

export function listNeeds(opts?: ListNeedsOpts): NeedRow[] {
  const col: SortColumn = (VALID_SORT_COLS as readonly string[]).includes(opts?.sort ?? '')
    ? (opts!.sort as SortColumn)
    : 'created_at'
  const dir: 'asc' | 'desc' = opts?.dir === 'desc' ? 'desc' : 'asc'

  // type_name is a joined column — must reference nt.name, not n.type_name
  const orderByExpr = col === 'type_name' ? `nt.name` : `n.${col}`

  const conditions: string[] = []
  const params: unknown[] = []

  if (opts?.type && opts.type.length > 0) {
    conditions.push(`nt.name IN (${opts.type.map(() => '?').join(',')})`)
    params.push(...opts.type)
  }

  if (opts?.status && opts.status.length > 0) {
    conditions.push(`n.status IN (${opts.status.map(() => '?').join(',')})`)
    params.push(...opts.status)
  }

  if (opts?.tags && opts.tags.length > 0) {
    conditions.push(`(${opts.tags.map(() => 'n.tags LIKE ?').join(' OR ')})`)
    params.push(...opts.tags.map(t => `%${t}%`))
  }

  if (opts?.q && opts.q.trim()) {
    conditions.push(`(n.id LIKE ? OR n.title LIKE ?)`)
    const like = `%${opts.q.trim()}%`
    params.push(like, like)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sql = `
    SELECT
      n.id, n.type_id, n.title, n.status, n.tags, n.description, n.seq,
      n.created_at, n.updated_at,
      nt.name   AS type_name,
      nt.prefix AS type_prefix,
      nt.color  AS type_color,
      (SELECT COUNT(*) FROM need_link nl WHERE nl.from_id = n.id) AS link_count
    FROM need n
    JOIN need_type nt ON nt.id = n.type_id
    ${whereClause}
    ORDER BY ${orderByExpr} ${dir}
  `

  return db.prepare(sql).all(...params) as NeedRow[]
}
