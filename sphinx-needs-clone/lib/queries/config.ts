import 'server-only'

import db from '@/lib/db'
import type { NeedType } from '@/types'

export function listNeedTypes(): NeedType[] {
  return db
    .prepare(`SELECT id, name, prefix, color FROM need_type ORDER BY name ASC`)
    .all() as NeedType[]
}

export function listNeedTypesWithCount(): (NeedType & { needs_count: number })[] {
  return db
    .prepare(`
      SELECT nt.id, nt.name, nt.prefix, nt.color,
             COUNT(n.id) AS needs_count
      FROM need_type nt
      LEFT JOIN need n ON n.type_id = nt.id
      GROUP BY nt.id, nt.name, nt.prefix, nt.color
      ORDER BY nt.name ASC
    `)
    .all() as (NeedType & { needs_count: number })[]
}
