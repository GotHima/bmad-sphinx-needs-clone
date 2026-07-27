---
baseline_commit: 4ef668190a487c00b3723aa6f93a8b4715c3b01d
---

# Story 2.2: Status Values Management in Settings

Status: done

## Story

**As a user,**
I want to add and delete custom status values in the Settings page,
**So that** I can define the lifecycle states relevant to my project.

## Acceptance Criteria

**AC1 — Status Values tab shows flat list with `open` locked**
**Given** I navigate to `/settings` and click the "Status Values" tab
**When** the tab renders
**Then** a flat list of all status values is displayed; each row shows the value and a delete button; `open` shows a lock icon and its delete button is disabled

**AC2 — Add Status persists and shows toast**
**Given** I click "Add Status"
**When** I type a new value and confirm
**Then** the value is saved to the `status_value` table, appears in the list, and a "Saved." toast confirms

**AC3 — Deleting `open` is rejected at the Server Action level**
**Given** I attempt to delete `open`
**When** the Server Action is called
**Then** it returns `{ success: false, error: "Cannot delete the default status" }` and the UI shows an error toast; the `open` row remains

**AC4 — Deleting non-`open` status removes it after confirm**
**Given** I delete a status value that is not `open`
**When** the confirm `AlertDialog` is accepted
**Then** the value is removed from the list and deleted from SQLite

**AC5 — StatusBadge renders with muted style**
**Given** the Settings page status list
**When** a `StatusBadge` is rendered
**Then** it uses muted background/foreground (shadcn defaults), 11px medium weight, 3px border radius — same style regardless of status value

## Tasks / Subtasks

- [x] Task 1 — Add `listStatuses()` to `lib/queries/config.ts` (AC: 1)
  - [x] Add `import type { StatusValue } from '@/types'` (already importing NeedType; extend imports)
  - [x] Add `listStatuses(): StatusValue[]` — `SELECT id, value FROM status_value ORDER BY value ASC`
  - [x] Ensure `open` appears in the list (it is always seeded; query returns it)

- [x] Task 2 — Create `lib/actions/statuses.ts` (AC: 2, 3, 4)
  - [x] `'use server'` directive at top of file (NOT per-function)
  - [x] Add `import 'server-only'` at the top (AD-1)
  - [x] `createStatus(value: string): Promise<ActionResult<StatusValue>>`
    - Trim value; validate non-empty → `{ success: false, error: 'Status value is required', field: 'value' }`
    - `INSERT INTO status_value (value) VALUES (?) RETURNING id, value`
    - Catch UNIQUE violation → `{ success: false, error: 'A status with this value already exists', field: 'value' }`
    - On success: `revalidatePath('/settings')` then return `{ success: true, data: row }`
  - [x] `deleteStatus(id: number): Promise<ActionResult<void>>`
    - `SELECT value FROM status_value WHERE id = ?` → if `value === 'open'` return `{ success: false, error: 'Cannot delete the default status' }` (AD-9)
    - Optional in-use guard (see Dev Notes — deferred from Story 1.2): check `SELECT COUNT(*) FROM need WHERE status = ?` and return error if count > 0
    - `DELETE FROM status_value WHERE id = ?`
    - On success: `revalidatePath('/settings')` then return `{ success: true, data: undefined }`

- [x] Task 3 — Create `components/needs/StatusBadge.tsx` (AC: 5)
  - [x] No `'use client'` — purely presentational; usable in RSC and client components
  - [x] Props: `value: string`, `className?: string`
  - [x] Classes: `inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground`
  - [x] No inline style needed — muted palette uses Tailwind tokens (unlike NeedTypeBadge which needs dynamic DB color)

- [x] Task 4 — Create `components/settings/StatusList.tsx` (AC: 1–4)
  - [x] `'use client'` directive
  - [x] Import `toast` from `'sonner'` (package, not local file)
  - [x] Props: `initialStatuses: StatusValue[]`
  - [x] Local state: `statuses`, `isAdding`, `newValue`, `isPending`
  - [x] Render flat list; each row: value text + delete button
  - [x] `open` row: show `Lock` icon (lucide-react) beside value; delete button is disabled and wrapped in Tooltip (see Dev Notes for disabled-button tooltip pattern)
  - [x] "Add Status" button above list → `setIsAdding(true)` → render inline add-form row with text input + Save + Cancel
  - [x] Add-form Save: `createStatus(newValue)` → on success append to `statuses`, reset `newValue`, `setIsAdding(false)`, `toast('Saved.')`; on error `toast.error(result.error)`
  - [x] Delete (non-`open`): AlertDialog confirm → `deleteStatus(row.id)` → on success remove from `statuses`, `toast('Deleted.')`; on error `toast.error(result.error)` (unexpected — `open` guard already on server)
  - [x] Guard: if `isAdding` is true, clicking "Add Status" again does nothing (button disabled while `isAdding`)
  - [x] `isPending` flag gates Save button to prevent double-submit

- [x] Task 5 — Update `app/settings/page.tsx` (AC: 1)
  - [x] Add import: `listStatuses` from `@/lib/queries/config`
  - [x] Add import: `StatusList` from `@/components/settings/StatusList`
  - [x] Call `listStatuses()` synchronously (better-sqlite3 is sync)
  - [x] Replace `<p className="text-sm text-muted-foreground">Status values management — Story 2.2</p>` with `<StatusList initialStatuses={statuses} />`

- [x] Task 6 — Verify all ACs
  - [x] Run `npm run dev` from `sphinx-needs-clone/`, navigate to `/settings` → click "Status Values" tab
  - [x] Verify `open` shows lock icon with disabled delete
  - [x] Verify "Add Status" adds a new value; "Saved." toast appears
  - [x] Verify deleting non-`open` status shows AlertDialog; on confirm value is removed; "Deleted." toast
  - [x] Verify attempting to delete `open` via direct server call returns the guard error
  - [x] Verify `StatusBadge` renders with muted style
  - [x] Run `npx tsc --noEmit` → exit 0
  - [x] Run `npm run build` → exit 0

### Review Findings

- [x] [Review][Patch] `deleteStatus` SELECT queries outside try/catch can throw, violating AD-2 "no throws across Server Action boundary" [`lib/actions/statuses.ts:27-41`] — **fixed**: wrapped entire function body in outer try/catch
- [x] [Review][Patch] No `maxLength` on add Input or server-side length guard — user can save arbitrarily long status values [`components/settings/StatusList.tsx:103`] — **fixed**: added `maxLength={50}` to Input + `trimmed.length > 50` guard in `createStatus`
- [x] [Review][Defer] Race condition: concurrent deletes both pass guard checks, second caller returns false success [`lib/actions/statuses.ts:27-50`] — deferred, single-user local tool; practically unreachable

## Dev Notes

### Current File State — What Exists & What to Preserve

| File | Current State | This Story Action |
|---|---|---|
| `app/settings/page.tsx` | Full settings page with Tabs + NeedTypeTable; Status Values tab has placeholder `<p>` | UPDATE — add `listStatuses()` call + replace placeholder with `<StatusList>` |
| `lib/queries/config.ts` | `listNeedTypes()` + `listNeedTypesWithCount()` | UPDATE — add `listStatuses()` |
| `types/index.ts` | `StatusValue { id: number; value: string }` already defined; `ActionResult<T>` with `field?` already correct | DO NOT TOUCH |
| `lib/db.ts` | `status_value(id PK, value TEXT UNIQUE)` table created; `open` seeded via `INSERT OR IGNORE` | DO NOT TOUCH |
| `components/settings/NeedTypeTable.tsx` | Full inline CRUD for need types | DO NOT TOUCH |
| `components/needs/NeedTypeBadge.tsx` | Exists — presentational badge | DO NOT TOUCH |
| `lib/actions/types.ts` | Exists — need type CRUD | DO NOT TOUCH |
| `lib/actions/statuses.ts` | Does NOT exist | CREATE |
| `components/needs/StatusBadge.tsx` | Does NOT exist | CREATE |
| `components/settings/StatusList.tsx` | Does NOT exist | CREATE |

### ⚠️ CRITICAL: shadcn v4 (Nova/Base UI) — `asChild` Does NOT Work

Confirmed across Stories 1.3 and 2.1. This project uses `shadcn@4.14.0` with `@base-ui/react: ^1.6.0`. **`asChild` does NOT exist.**

For `AlertDialogTrigger` / `TooltipTrigger`: use the `render` prop pattern or a wrapper element. Check the generated component before using it.

For link-as-button: use `buttonVariants`:
```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
<Link href="/foo" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Foo</Link>
```

### ⚠️ Tooltip on Disabled Delete Button (`open` row)

Disabled elements do not fire mouse events — `TooltipTrigger` won't work directly on a `disabled` button. Pattern from Story 2.1:

```tsx
<Tooltip>
  <TooltipTrigger asChild={false}>
    <span className="cursor-not-allowed" tabIndex={0}>
      <Button variant="ghost" size="icon-sm" disabled aria-label="Cannot delete default status">
        <Lock className="size-4" />
      </Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>Cannot delete the default status</TooltipContent>
</Tooltip>
```

The `TooltipProvider` is already mounted in `app/providers.tsx` from Story 2.1 — do NOT add it again.

### ⚠️ `lib/queries/config.ts` — Exact Extension Pattern

Add `StatusValue` to the existing import and append the new function. Do NOT rewrite the file — preserve existing exports:

```ts
import type { NeedType, StatusValue } from '@/types'

export function listStatuses(): StatusValue[] {
  return db
    .prepare(`SELECT id, value FROM status_value ORDER BY value ASC`)
    .all() as StatusValue[]
}
```

- `better-sqlite3` is **synchronous** — no `async`/`await`.
- `import 'server-only'` is already at the top — do not add it again.
- The query always returns at least one row (`open` is seeded at DB init).

### ⚠️ `lib/actions/statuses.ts` — Key Patterns

```ts
'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import db from '@/lib/db'
import type { ActionResult, StatusValue } from '@/types'

export async function createStatus(value: string): Promise<ActionResult<StatusValue>> {
  const trimmed = value.trim()
  if (!trimmed) return { success: false, error: 'Status value is required', field: 'value' }

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
  const row = db
    .prepare(`SELECT value FROM status_value WHERE id = ?`)
    .get(id) as { value: string } | undefined

  if (!row) return { success: false, error: 'Status not found' }
  if (row.value === 'open') {
    return { success: false, error: 'Cannot delete the default status' }
  }

  // In-use guard (deferred from Story 1.2): need.status is stored by value string,
  // not FK'd to status_value. Deleting an in-use status would leave stale strings.
  const inUse = db
    .prepare(`SELECT COUNT(*) AS count FROM need WHERE status = ?`)
    .get(row.value) as { count: number }
  if (inUse.count > 0) {
    return { success: false, error: `In use by ${inUse.count} need(s)` }
  }

  try {
    db.prepare(`DELETE FROM status_value WHERE id = ?`).run(id)
    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to delete status' }
  }
}
```

Rules:
- Server Actions **must** be `async` (Next.js requirement), even though `db` calls are sync.
- **Never** throw across the Server Action boundary — always return `ActionResult`.
- `RETURNING` clause avoids a second SELECT to fetch the inserted row.
- Catch SQLite errors by message text — `better-sqlite3` throws `Error`, not typed DB errors.

### ⚠️ `components/needs/StatusBadge.tsx` — Exact Spec

```tsx
// NO 'use client' — purely presentational; works in RSC and Client Components

interface StatusBadgeProps {
  value: string
  className?: string
}

export function StatusBadge({ value, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground${className ? ` ${className}` : ''}`}
    >
      {value}
    </span>
  )
}
```

Unlike `NeedTypeBadge`, there is **no inline style** — muted palette uses Tailwind tokens, not a DB-stored hex color. All statuses share the same muted appearance (MVP spec: no per-status color).

### ⚠️ `components/settings/StatusList.tsx` — Implementation Notes

```ts
// State
const [statuses, setStatuses] = useState<StatusValue[]>(initialStatuses)
const [isAdding, setIsAdding] = useState(false)
const [newValue, setNewValue] = useState('')
const [isPending, setIsPending] = useState(false)
```

**Optimistic local state:**
After a successful `createStatus`, append to the local array directly (do not wait for RSC cache refresh):
```tsx
setStatuses(prev => [...prev, result.data])
```
`revalidatePath('/settings')` in the action handles the next navigation.

After a successful `deleteStatus`, filter out the row:
```tsx
setStatuses(prev => prev.filter(s => s.id !== id))
```

**Guard double-add mode:** Disable "Add Status" button while `isAdding === true`:
```tsx
<Button onClick={() => setIsAdding(true)} disabled={isAdding}>Add Status</Button>
```

**In-use error toast:** If `deleteStatus` returns `{ success: false, error: 'In use by N need(s)' }`, call `toast.error(result.error)` — same pattern as NeedTypeTable's in-use guard.

**Import pattern:**
```tsx
import { createStatus, deleteStatus } from '@/lib/actions/statuses'
import { StatusBadge } from '@/components/needs/StatusBadge'
import { toast } from 'sonner'
import { Lock, Trash2 } from 'lucide-react'
```

**AlertDialog trigger** — Base UI pattern (no `asChild`). Check `components/ui/alert-dialog.tsx` for the actual interface. Use `render` prop if needed, same as Story 2.1's `AlertDialogTrigger`.

### ⚠️ `app/settings/page.tsx` — Target State After Update

```tsx
import { listNeedTypesWithCount, listStatuses } from '@/lib/queries/config'
import { NeedTypeTable } from '@/components/settings/NeedTypeTable'
import { StatusList } from '@/components/settings/StatusList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const types = listNeedTypesWithCount()
  const statuses = listStatuses()
  return (
    <main className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <Tabs defaultValue="need-types">
        <TabsList>
          <TabsTrigger value="need-types">Need Types</TabsTrigger>
          <TabsTrigger value="status-values">Status Values</TabsTrigger>
        </TabsList>
        <TabsContent value="need-types" className="mt-4">
          <NeedTypeTable initialTypes={types} />
        </TabsContent>
        <TabsContent value="status-values" className="mt-4">
          <StatusList initialStatuses={statuses} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
```

- Keep RSC — do NOT add `'use client'`.
- Keep `export const dynamic = 'force-dynamic'` — already present from Story 2.1.
- Both `listNeedTypesWithCount()` and `listStatuses()` are synchronous.

### ⚠️ Deferred Work Item — In-Use Guard for Status Deletion

From `_bmad-output/implementation-artifacts/deferred-work.md` (deferred from Story 1.2):
> `need.status` not FK'd to `status_value` — stale status strings possible if status values are deleted. Enforce at application layer in **Story 2.2** deleteStatus guard.

The `deleteStatus` Server Action above includes this guard via a `SELECT COUNT(*) FROM need WHERE status = ?` check. This is not an explicit epics AC, but is the intended enforcement point per the deferred work log. The in-use check uses the stored string value (not the `id`) because `need.status` is stored as a string, not a foreign key.

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — server-only DB | `lib/queries/config.ts` (existing `import 'server-only'`) + new `lib/actions/statuses.ts` both carry `import 'server-only'` |
| AD-2 — Server Actions for mutations | All add/delete via `lib/actions/statuses.ts`; RSC reads via `listStatuses()` in `lib/queries/config.ts` |
| AD-9 — `open` undeletable | `deleteStatus` checks `row.value === 'open'` before DELETE; returns structured error |
| `'use client'` scope | Only `StatusList.tsx` is `'use client'`; `StatusBadge` and `SettingsPage` are RSC |
| shadcn primitives | All `components/ui/*` files are CLI-generated; never hand-edited; no new shadcn installs needed for this story |
| Server Action return shape | `ActionResult<T>` — never throws across action boundary |
| `revalidatePath` | Both actions call `revalidatePath('/settings')` on success |
| File naming | `StatusList.tsx`, `StatusBadge.tsx` = PascalCase; existing dirs = kebab-case |

### Stack Versions (Confirmed from Stories 1.1–2.1)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first, no `tailwind.config.js`) |
| shadcn/ui | 4.14.0 — **Base UI (Nova preset); `asChild` NOT supported** |
| @base-ui/react | ^1.6.0 |
| better-sqlite3 | ^12.11.1 — **synchronous API only** |
| lucide-react | ^1.26.0 — use for `Lock`, `Trash2` icons |
| next-themes | ^0.4.6 |
| sonner | already installed — import `toast` from `'sonner'` |
| Node.js | v22.12.0 |

### No New shadcn Installs Required

All shadcn components needed for this story are already installed from Story 2.1:
- `alert-dialog` ✅
- `tooltip` ✅
- `input` ✅
- `sonner` ✅
- `button` ✅

Do NOT run `npx shadcn add` for any of these — they already exist in `components/ui/`.

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.2, FR-implicit-1, UX-DR3, UX-DR11, UX-DR12
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-9; source tree confirms `lib/actions/statuses.ts`, `components/settings/StatusList.tsx`, `components/needs/StatusBadge.tsx`
- Story 2.1: `_bmad-output/implementation-artifacts/2-1-need-types-management-in-settings.md` — all stack versions, `buttonVariants` pattern, `asChild` incompatibility, `isPending` guard, optimistic state update pattern, Tooltip on disabled button, AlertDialog trigger pattern, `TooltipProvider` already in `app/providers.tsx`
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` — `need.status` not FK'd (Story 1.2 deferral targeting Story 2.2)

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-07-27

### Debug Log References

### Completion Notes List

- `lib/queries/config.ts` extended with `listStatuses()` — synchronous better-sqlite3 query; `StatusValue` added to the existing type import without touching other exports
- `lib/actions/statuses.ts` created with `createStatus` and `deleteStatus`; `open` guard enforced before DELETE; in-use guard (deferred from Story 1.2) implemented via `SELECT COUNT(*) FROM need WHERE status = ?`; `RETURNING` clause on INSERT avoids second SELECT
- `StatusBadge.tsx` created as a pure RSC — no `'use client'`; muted Tailwind tokens only (no inline style), matching UX-DR3 spec
- `StatusList.tsx` created as `'use client'`; uses `TooltipTrigger render={<span/>}` pattern (confirmed from NeedTypeTable) for disabled button; `AlertDialogTrigger render={<Button/>}` pattern for delete; `isAdding` guard prevents double-add-form; `isPending` prevents double-submit; optimistic local state updates on create/delete
- `app/settings/page.tsx` updated — both `listNeedTypesWithCount()` and `listStatuses()` called synchronously; `StatusList` replaces placeholder; `force-dynamic` preserved
- `npx tsc --noEmit` exit 0; `npm run build` exit 0; `/settings` shows as ƒ (Dynamic)
- No new shadcn installs required — all UI components (`alert-dialog`, `tooltip`, `input`, `button`, `sonner`) already installed from Story 2.1
- `TooltipProvider` already mounted in `app/providers.tsx` from Story 2.1 — not added again
- Code review patches applied: `deleteStatus` wrapped in outer try/catch (AD-2); `maxLength={50}` added to add-status Input + server-side length guard in `createStatus`

### File List

- `sphinx-needs-clone/lib/queries/config.ts` — UPDATE (added `listStatuses()` + `StatusValue` to import)
- `sphinx-needs-clone/lib/actions/statuses.ts` — NEW
- `sphinx-needs-clone/components/needs/StatusBadge.tsx` — NEW
- `sphinx-needs-clone/components/settings/StatusList.tsx` — NEW
- `sphinx-needs-clone/app/settings/page.tsx` — UPDATE (added `listStatuses`, `StatusList`, replaced placeholder)
- `_bmad-output/implementation-artifacts/review-blind-hunter-2-2.md` — NEW (review prompt)
- `_bmad-output/implementation-artifacts/review-edge-case-hunter-2-2.md` — NEW (review prompt)
- `_bmad-output/implementation-artifacts/review-acceptance-auditor-2-2.md` — NEW (review prompt)

## Change Log

- 2026-07-27: Implemented Story 2.2 — Status Values Management in Settings. Added `listStatuses()` to `lib/queries/config.ts`. Created `lib/actions/statuses.ts` with `createStatus` + `deleteStatus` (AD-9 `open` guard + in-use guard from Story 1.2 deferral). Created `StatusBadge` RSC and `StatusList` client component with full add/delete UX. Updated `app/settings/page.tsx` to wire in the new component. TypeScript clean, build passes.
- 2026-07-27: Applied 2 code review patches — (1) `deleteStatus` wrapped in outer try/catch to prevent throws across Server Action boundary; (2) `maxLength={50}` added to add-status Input + `trimmed.length > 50` server-side guard in `createStatus`. 1 finding deferred (race condition; single-user tool, unreachable in practice).
