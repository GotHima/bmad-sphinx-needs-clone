'use server'

import 'server-only'

import { revalidatePath } from 'next/cache'
import db from '@/lib/db'
import type { ActionResult, CreateNeedInput, UpdateNeedInput, Need } from '@/types'

export async function getLinksForNeed(id: string): Promise<ActionResult<string[]>> {
  try {
    const rows = db
      .prepare('SELECT to_id FROM need_link WHERE from_id = ?')
      .all(id) as { to_id: string }[]
    return { success: true, data: rows.map(r => r.to_id) }
  } catch {
    return { success: false, error: 'Failed to load links' }
  }
}

export async function getBacklinksForNeed(id: string): Promise<ActionResult<string[]>> {
  try {
    const rows = db
      .prepare('SELECT from_id FROM need_link WHERE to_id = ?')
      .all(id) as { from_id: string }[]
    return { success: true, data: rows.map(r => r.from_id) }
  } catch {
    return { success: false, error: 'Failed to load backlinks' }
  }
}

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
    const insertedNeed = db
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

    if (input.links && input.links.length > 0) {
      const insertLink = db.prepare('INSERT INTO need_link (from_id, to_id) VALUES (?, ?)')
      for (const toId of input.links) {
        insertLink.run(insertedNeed.id, toId)
      }
    }

    return insertedNeed
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

export async function updateNeed(id: string, input: UpdateNeedInput): Promise<ActionResult<Need>> {
  const title = (input.title ?? '').trim()
  if (!title) return { success: false, error: 'Title is required', field: 'title' }

  if (input.status !== undefined) {
    const validStatus = db
      .prepare('SELECT COUNT(*) AS count FROM status_value WHERE value = ?')
      .get(input.status) as { count: number }
    if (validStatus.count === 0) {
      return { success: false, error: 'Invalid status', field: 'status' }
    }
  }

  const now = new Date().toISOString()
  const updateTransaction = db.transaction(() => {
    const row = db
      .prepare(`
        UPDATE need
        SET type_id = COALESCE(?, type_id), title = ?, status = COALESCE(?, status),
            tags = ?, description = ?, updated_at = ?
        WHERE id = ?
        RETURNING id, type_id, title, status, tags, description, seq, created_at, updated_at
      `)
      .get(
        input.type_id ?? null,
        title,
        input.status ?? null,
        input.tags?.trim() || null,
        input.description?.trim() || null,
        now,
        id
      ) as Need | undefined
    if (!row) throw new Error('Need not found')
    if (input.links !== undefined) {
      db.prepare('DELETE FROM need_link WHERE from_id = ?').run(id)
      const insertLink = db.prepare('INSERT INTO need_link (from_id, to_id) VALUES (?, ?)')
      for (const toId of input.links) {
        insertLink.run(id, toId)
      }
    }
    return row
  })

  try {
    const row = updateTransaction()
    revalidatePath('/')
    return { success: true, data: row }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Need not found') {
      return { success: false, error: 'Need not found' }
    }
    return { success: false, error: 'Failed to update need' }
  }
}

export async function deleteNeed(id: string): Promise<ActionResult<void>> {
  const deleteTransaction = db.transaction((needId: string) => {
    db.prepare('DELETE FROM need_link WHERE from_id = ? OR to_id = ?').run(needId, needId)
    db.prepare('DELETE FROM need WHERE id = ?').run(needId)
  })

  try {
    deleteTransaction(id)
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete need' }
  }
}
