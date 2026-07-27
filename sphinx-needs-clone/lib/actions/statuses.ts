'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import db from '@/lib/db'
import type { ActionResult, StatusValue } from '@/types'

export async function createStatus(value: string): Promise<ActionResult<StatusValue>> {
  const trimmed = value.trim()
  if (!trimmed) return { success: false, error: 'Status value is required', field: 'value' }
  if (trimmed.length > 50) return { success: false, error: 'Status value must be 50 characters or fewer', field: 'value' }

  try {
    const row = db
      .prepare(`INSERT INTO status_value (value) VALUES (?) RETURNING id, value`)
      .get(trimmed) as StatusValue
    revalidatePath('/settings')
    return { success: true, data: row }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return { success: false, error: 'A status with this value already exists', field: 'value' }
    }
    return { success: false, error: 'Failed to create status' }
  }
}

export async function deleteStatus(id: number): Promise<ActionResult<void>> {
  try {
    const row = db
      .prepare(`SELECT value FROM status_value WHERE id = ?`)
      .get(id) as { value: string } | undefined

    if (!row) return { success: false, error: 'Status not found' }
    if (row.value === 'open') {
      return { success: false, error: 'Cannot delete the default status' }
    }

    const inUse = db
      .prepare(`SELECT COUNT(*) AS count FROM need WHERE status = ?`)
      .get(row.value) as { count: number }
    if (inUse.count > 0) {
      return { success: false, error: `In use by ${inUse.count} need(s)` }
    }

    db.prepare(`DELETE FROM status_value WHERE id = ?`).run(id)
    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to delete status' }
  }
}
