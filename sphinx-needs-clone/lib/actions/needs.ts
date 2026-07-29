'use server'

import 'server-only'

import { revalidatePath } from 'next/cache'
import db from '@/lib/db'
import type { ActionResult, CreateNeedInput, Need } from '@/types'

export async function suggestNeedId(typeId: number): Promise<ActionResult<string>> {
  const type = db
    .prepare('SELECT prefix FROM need_type WHERE id = ?')
    .get(typeId) as { prefix: string } | undefined

  if (!type) {
    return { success: false, error: 'Type not found' }
  }

  const row = db
    .prepare('SELECT MAX(seq) AS max FROM need WHERE type_id = ?')
    .get(typeId) as { max: number | null }

  const nextSeq = (row.max ?? 0) + 1
  return { success: true, data: `${type.prefix}_${String(nextSeq).padStart(3, '0')}` }
}

export async function createNeed(input: CreateNeedInput): Promise<ActionResult<Need>> {
  const id = input.id.trim()
  const title = input.title.trim()

  if (!id) return { success: false, error: 'ID is required', field: 'id' }
  if (!title) return { success: false, error: 'Title is required', field: 'title' }

  const validStatus = db
    .prepare('SELECT COUNT(*) AS count FROM status_value WHERE value = ?')
    .get(input.status) as { count: number }
  if (validStatus.count === 0) {
    return { success: false, error: 'Invalid status', field: 'status' }
  }

  const insertTransaction = db.transaction(() => {
    const type = db
      .prepare('SELECT prefix FROM need_type WHERE id = ?')
      .get(input.type_id) as { prefix: string } | undefined
    if (!type) throw new Error('Type not found')

    const escapedPrefix = type.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prefixPattern = new RegExp(`^${escapedPrefix}_([0-9]+)$`, 'i')
    const idMatch = id.match(prefixPattern)
    const extractedSeq = idMatch ? parseInt(idMatch[1], 10) : null

    const maxRow = db
      .prepare('SELECT MAX(seq) AS max FROM need WHERE type_id = ?')
      .get(input.type_id) as { max: number | null }
    const seq = (extractedSeq !== null && extractedSeq > 0) ? extractedSeq : (maxRow.max ?? 0) + 1

    const now = new Date().toISOString()
    return db
      .prepare(
        `INSERT INTO need (id, type_id, title, status, tags, description, seq, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id, type_id, title, status, tags, description, seq, created_at, updated_at`
      )
      .get(
        id,
        input.type_id,
        title,
        input.status,
        input.tags?.trim() || null,
        input.description?.trim() || null,
        seq,
        now,
        now
      ) as Need
  })

  try {
    const need = insertTransaction()
    revalidatePath('/')
    return { success: true, data: need }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return { success: false, error: 'ID already in use', field: 'id' }
    }
    return { success: false, error: 'Failed to create need' }
  }
}
