'use server'

import 'server-only'

import { revalidatePath } from 'next/cache'
import db from '@/lib/db'
import type { ActionResult, NeedType } from '@/types'

export async function createNeedType(data: {
  name: string
  prefix: string
  color: string
}): Promise<ActionResult<NeedType>> {
  const name = data.name.trim()
  const prefix = data.prefix.trim().toUpperCase()
  const { color } = data

  if (!name) return { success: false, error: 'Name is required', field: 'name' }
  if (!prefix) return { success: false, error: 'Prefix is required', field: 'prefix' }
  if (prefix.length > 6)
    return { success: false, error: 'Prefix must be 6 characters or fewer', field: 'prefix' }
  if (!color) return { success: false, error: 'Color is required', field: 'color' }

  try {
    const row = db
      .prepare(
        `INSERT INTO need_type (name, prefix, color) VALUES (?, ?, ?) RETURNING id, name, prefix, color`
      )
      .get(name, prefix, color) as NeedType
    revalidatePath('/settings')
    return { success: true, data: row }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return { success: false, error: 'A type with this prefix already exists', field: 'prefix' }
    }
    return { success: false, error: 'Failed to create need type' }
  }
}

export async function updateNeedType(
  id: number,
  data: { name: string; prefix: string; color: string }
): Promise<ActionResult<NeedType>> {
  const name = data.name.trim()
  const prefix = data.prefix.trim().toUpperCase()
  const { color } = data

  if (!name) return { success: false, error: 'Name is required', field: 'name' }
  if (!prefix) return { success: false, error: 'Prefix is required', field: 'prefix' }
  if (prefix.length > 6)
    return { success: false, error: 'Prefix must be 6 characters or fewer', field: 'prefix' }
  if (!color) return { success: false, error: 'Color is required', field: 'color' }

  try {
    const row = db
      .prepare(
        `UPDATE need_type SET name = ?, prefix = ?, color = ? WHERE id = ? RETURNING id, name, prefix, color`
      )
      .get(name, prefix, color, id) as NeedType | undefined
    if (!row) return { success: false, error: 'Need type not found' }
    revalidatePath('/settings')
    return { success: true, data: row }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return { success: false, error: 'A type with this prefix already exists', field: 'prefix' }
    }
    return { success: false, error: 'Failed to update need type' }
  }
}

export async function deleteNeedType(id: number): Promise<ActionResult<void>> {
  const inUse = db
    .prepare(`SELECT COUNT(*) AS count FROM need WHERE type_id = ?`)
    .get(id) as { count: number }

  if (inUse.count > 0) {
    return { success: false, error: `In use by ${inUse.count} need(s)` }
  }

  try {
    db.prepare(`DELETE FROM need_type WHERE id = ?`).run(id)
    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to delete need type' }
  }
}
