import 'server-only'

import db from '@/lib/db'
import type { Need } from '@/types'

const VALID_SORT_COLS = ['id', 'type_name', 'title', 'status', 'tags', 'created_at'] as const
type SortColumn = typeof VALID_SORT_COLS[number]

export type NeedRow = Need & { link_count: number }

const stmtCache = new Map<string, { all: () => unknown[] }>()

function getListStmt(orderByExpr: string, dir: 'asc' | 'desc') {
  const key = `${orderByExpr}:${dir}`
  if (!stmtCache.has(key)) {
    stmtCache.set(key, db.prepare(`
      SELECT
        n.id, n.type_id, n.title, n.status, n.tags, n.description, n.seq,
        n.created_at, n.updated_at,
        nt.name   AS type_name,
        nt.prefix AS type_prefix,
        nt.color  AS type_color,
        (SELECT COUNT(*) FROM need_link nl WHERE nl.from_id = n.id) AS link_count
      FROM need n
      JOIN need_type nt ON nt.id = n.type_id
      ORDER BY ${orderByExpr} ${dir}
    `))
  }
  return stmtCache.get(key)!
}

export function listNeeds(opts?: { sort?: string; dir?: string }): NeedRow[] {
  const col: SortColumn = (VALID_SORT_COLS as readonly string[]).includes(opts?.sort ?? '')
    ? (opts!.sort as SortColumn)
    : 'created_at'
  const dir: 'asc' | 'desc' = opts?.dir === 'desc' ? 'desc' : 'asc'

  // type_name is a joined column — must reference nt.name, not n.type_name
  const orderByExpr = col === 'type_name' ? `nt.name` : `n.${col}`

  return getListStmt(orderByExpr, dir).all() as NeedRow[]
}
