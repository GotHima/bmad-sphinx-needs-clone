// ─── Domain entities ───────────────────────────────────────────────────────

export interface NeedType {
  id: number
  name: string
  prefix: string
  color: string
}

export interface StatusValue {
  id: number
  value: string
}

export interface Need {
  id: string
  type_id: number
  title: string
  status: string
  tags: string | null
  description: string | null
  seq: number
  created_at: string
  updated_at: string
  // Joined fields
  type_name?: string
  type_prefix?: string
  type_color?: string
}

export interface NeedLink {
  from_id: string
  to_id: string
}

// ─── Input / mutation types ─────────────────────────────────────────────────

export interface CreateNeedInput {
  type_id: number
  title: string
  status: string
  tags?: string
  description?: string
}

export interface UpdateNeedInput {
  title?: string
  status?: string
  tags?: string
  description?: string
}

// ─── Server Action results ───────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string }

// ─── URL search param keys ───────────────────────────────────────────────────

export const SEARCH_PARAM_KEYS = {
  QUERY: 'q',
  TYPE: 'type',
  STATUS: 'status',
  TAG: 'tags',
  SORT: 'sort',
  DIR: 'dir',
} as const

export type SearchParamKey = (typeof SEARCH_PARAM_KEYS)[keyof typeof SEARCH_PARAM_KEYS]
