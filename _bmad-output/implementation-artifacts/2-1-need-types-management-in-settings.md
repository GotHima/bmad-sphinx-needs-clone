---
baseline_commit: aaf0751d233ae0600a618bbcf80d8f27eba5dc6d
---

# Story 2.1: Need Types Management in Settings

Status: done

## Story

**As a user,**
I want to create, edit, and delete need types with a name, prefix, and color in the Settings page,
**So that** I can define the categories of needs my project uses before creating any needs.

## Acceptance Criteria

**AC1 — Settings page shows Need Types tab active by default**
**Given** I navigate to `/settings`
**When** the page loads
**Then** a "Need Types" tab is visible and active by default, showing a table with columns: Name, Prefix, Color (swatch), and Actions

**AC2 — "Add Need Type" opens creation form**
**Given** the Need Types table is visible
**When** I click "Add Need Type"
**Then** an inline form row appears with inputs for Name (text), Prefix (text, max 6 chars, uppercase enforced), and Color (native `<input type="color">`)

**AC3 — Valid form submit persists and shows toast**
**Given** I fill in a valid Name, Prefix, and Color and submit
**When** the Server Action completes successfully
**Then** the new type appears in the table immediately, the `need_type` row is persisted in SQLite, and a "Saved." toast appears

**AC4 — Row click triggers inline edit**
**Given** an existing need type row in the table
**When** I click the row to edit
**Then** the row becomes editable inline; changes save on explicit save button click; a "Saved." toast confirms

**AC5 — Delete type with no needs shows confirm dialog**
**Given** a need type that has no needs referencing it
**When** I click the delete icon
**Then** a confirm AlertDialog appears; on confirm the type is removed from the table and deleted from SQLite

**AC6 — Delete type in use shows disabled icon with tooltip**
**Given** a need type that has one or more needs referencing it
**When** I hover the delete icon
**Then** the icon is disabled and a tooltip reads "In use by N need(s)"

**AC7 — NeedTypeBadge renders correctly**
**Given** a `NeedTypeBadge` component is rendered anywhere in the app
**When** it receives `name` and `color` props
**Then** it renders as an uppercase 11px semibold label with the given hex color as background via inline style (never a Tailwind color class), white foreground text, and 3px border radius (`rounded-sm`)

## Tasks / Subtasks

- [x] Task 1 — Install shadcn components and set up toast (AC: all)
  - [x] From `sphinx-needs-clone/` run: `npx shadcn add tabs`
  - [x] From `sphinx-needs-clone/` run: `npx shadcn add sonner`
  - [x] From `sphinx-needs-clone/` run: `npx shadcn add alert-dialog`
  - [x] From `sphinx-needs-clone/` run: `npx shadcn add tooltip`
  - [x] From `sphinx-needs-clone/` run: `npx shadcn add input`
  - [x] From `sphinx-needs-clone/` run: `npx shadcn add label`
  - [x] Added `<Toaster />` and `<TooltipProvider>` into `app/providers.tsx` (not layout.tsx); both are client-only and must live inside ThemeProvider

- [x] Task 2 — Update `types/index.ts` — extend `ActionResult` (AC: 3, 4)
  - [x] Add `field?: string` to the `ActionResult` false branch: `{ success: false; error: string; field?: string }` — matches architecture spec (AD-4 uses `field: "id"` in Story 3)

- [x] Task 3 — Create `lib/queries/config.ts` (AC: 1, 4, 5, 6)
  - [x] Create `lib/queries/` directory
  - [x] Add `import 'server-only'` at the top (AD-1)
  - [x] `listNeedTypes(): NeedType[]` — plain list ordered by name ASC
  - [x] `listNeedTypesWithCount(): (NeedType & { needs_count: number })[]` — LEFT JOIN `need` table on `type_id`, GROUP BY all `need_type` columns, COUNT `need.id`, ordered by name ASC

- [x] Task 4 — Create `lib/actions/types.ts` (AC: 3, 4, 5, 6)
  - [x] Create `lib/actions/` directory
  - [x] `'use server'` directive at top of file (NOT per-function)
  - [x] Add `import 'server-only'` at the top (AD-1)
  - [x] `createNeedType(data: { name: string; prefix: string; color: string }): Promise<ActionResult<NeedType>>`
    - Trim name; trim + uppercase prefix; validate all three required
    - Prefix max 6 chars; return `{ success: false, error: '...', field: 'prefix' }` if violated
    - `INSERT INTO need_type ... RETURNING id, name, prefix, color` → returns row
    - Catch UNIQUE violation → `{ success: false, error: 'A type with this prefix already exists', field: 'prefix' }`
    - On success: `revalidatePath('/settings')` then return `{ success: true, data: row }`
  - [x] `updateNeedType(id: number, data: { name: string; prefix: string; color: string }): Promise<ActionResult<NeedType>>`
    - Same validation as create
    - `UPDATE need_type SET name=?, prefix=?, color=? WHERE id=? RETURNING id, name, prefix, color`
    - Return `{ success: false, error: 'Need type not found' }` if no row returned
    - On success: `revalidatePath('/settings')` then return result
  - [x] `deleteNeedType(id: number): Promise<ActionResult<void>>`
    - `SELECT COUNT(*) AS count FROM need WHERE type_id = ?` — if `count > 0` return `{ success: false, error: 'In use by N need(s)' }`
    - `DELETE FROM need_type WHERE id = ?`
    - On success: `revalidatePath('/settings')` then return `{ success: true, data: undefined }`

- [x] Task 5 — Create `components/needs/NeedTypeBadge.tsx` (AC: 7)
  - [x] Create `components/needs/` directory
  - [x] No `'use client'` — purely presentational; usable in RSC and client components
  - [x] Props: `name: string`, `color: string`, `className?: string`
  - [x] Render `<span>` with `style={{ backgroundColor: color }}` — NEVER a Tailwind bg-color class (AD-7)
  - [x] Classes: `inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-semibold uppercase tracking-[0.04em] text-white`

- [x] Task 6 — Create `components/settings/NeedTypeTable.tsx` (AC: 1–6)
  - [x] Create `components/settings/` directory
  - [x] `'use client'` directive — needs `useState`, `toast`, Server Action calls
  - [x] Import `toast` from `'sonner'` — NOT from any local file
  - [x] Props: `initialTypes: (NeedType & { needs_count: number })[]`
  - [x] Local state: `types`, `editingId`, `editDraft`, `isAdding`, `newDraft`, `isPending`
  - [x] Table columns: Name | Prefix | Color (NeedTypeBadge swatch) | Actions
  - [x] "Add Need Type" button above table → `setIsAdding(true)` → render inline add-form row at top of table body
  - [x] Add-form row: Name input, Prefix input (uppercase + max 6 enforced on `onChange`), `<input type="color">`, Save + Cancel buttons
  - [x] Add-form Save: call `createNeedType(newDraft)` → on success prepend to `types`, reset form, `setIsAdding(false)`, `toast('Saved.')`; on error `toast.error(result.error)`
  - [x] Row click (not on action buttons): `setEditingId(row.id)`, populate `editDraft` from row
  - [x] Editing row renders inline inputs instead of text; shows Save + Cancel buttons in Actions column
  - [x] Edit Save: call `updateNeedType(editingId, editDraft)` → on success update `types` in place, `setEditingId(null)`, `toast('Saved.')`; on error `toast.error(result.error)` and stay in edit mode
  - [x] Escape key on any edit input: cancel edit (`setEditingId(null)`)
  - [x] Delete button for `needs_count === 0`: show AlertDialog — trigger is delete icon button; on confirm call `deleteNeedType(row.id)` → on success remove from `types`, `toast('Deleted.')`; on error `toast.error(result.error)`
  - [x] Delete button for `needs_count > 0`: render disabled icon button wrapped in Tooltip using Base UI `render` prop; tooltip content: `In use by ${row.needs_count} need(s)`

- [x] Task 7 — Update `app/settings/page.tsx` (AC: 1)
  - [x] Replace placeholder content entirely
  - [x] Keep RSC — do NOT add `'use client'`; do NOT make it `async` (db calls are sync)
  - [x] Call `listNeedTypesWithCount()` directly (synchronous)
  - [x] Render `<h1 className="text-xl font-semibold mb-6">Settings</h1>` (resolves deferred heading from Story 1.3 review)
  - [x] Render `<Tabs defaultValue="need-types">` with two tabs: "Need Types" (content: `<NeedTypeTable>`) and "Status Values" (content: placeholder paragraph for Story 2.2)
  - [x] Added `export const dynamic = 'force-dynamic'` to ensure DB is queried on every request (not pre-rendered at build time)

- [x] Task 8 — Verify all ACs
  - [x] Run `npm run dev` from `sphinx-needs-clone/`, navigate to `/settings` — dev server running at localhost:3000
  - [x] Verified Settings page renders with h1, Tabs (Need Types / Status Values), and table with correct columns
  - [x] Verified "Add Need Type" button visible; inline add form row appears on click with Name/Prefix/Color inputs
  - [x] Verified row click enters inline edit mode; save and cancel buttons work; Escape cancels
  - [x] Verified NeedTypeBadge renders in table Color column with inline-style backgroundColor
  - [x] Run `npx tsc --noEmit` → exit 0
  - [x] Run `npm run build` → exit 0; `/settings` shows as ƒ (Dynamic) after adding `force-dynamic`

### Review Findings

- [x] [Review][Patch] Simultaneous add+edit mode not guarded — clicking a row while `isAdding=true` opens both the add form row and an inline edit row concurrently; clicking "Add Need Type" while `editingId` is set leaves the edit row open [components/settings/NeedTypeTable.tsx:44,115]
- [x] [Review][Patch] Color inputs missing `aria-label` (WCAG 2.4.6) — native `<input type="color">` in both add and edit rows has no label association; screen readers cannot identify the field [components/settings/NeedTypeTable.tsx:160,224]
- [x] [Review][Patch] Color inputs missing Escape key handler — pressing Escape while focused on the color picker in add or edit rows does not cancel the form; only text inputs handle Escape [components/settings/NeedTypeTable.tsx:160-165,224-229]
- [x] [Review][Patch] `export const dynamic` placed before import statements — convention violation; ESLint `import/first` rule flags this; move after all imports [app/settings/page.tsx:1]
- [x] [Review][Defer] Race condition: concurrent save + row click can close newly opened edit session [components/settings/NeedTypeTable.tsx:73-92] — deferred, local SQLite sub-ms latency makes this impractical; isPending flag partially mitigates
- [x] [Review][Defer] AlertDialog confirm button has no disabled/loading state during async delete [components/settings/NeedTypeTable.tsx:309-314] — deferred, Base UI closes dialog on click making double-invoke impossible

## Dev Notes

### Current File State — What Exists & What to Preserve

| File | Current State | This Story Action |
|---|---|---|
| `app/settings/page.tsx` | Placeholder RSC: `<p>Settings coming soon.</p>` | REPLACE — full settings page with Tabs + NeedTypeTable |
| `app/layout.tsx` | Root layout with AppTopBar + Providers content wrapper | UPDATE — add `<Toaster />` inside `<Providers>` after the content div |
| `types/index.ts` | `NeedType`, `ActionResult<T>`, `SEARCH_PARAM_KEYS` etc. | UPDATE — add `field?: string` to ActionResult false branch |
| `lib/db.ts` | DB singleton + schema init; `need_type(id, name, prefix, color)` table exists | DO NOT TOUCH |
| `components/ui/button.tsx` | shadcn Base UI Button using `@base-ui/react/button` | DO NOT TOUCH |
| `components/layout/AppTopBar.tsx` | RSC top bar | DO NOT TOUCH |
| `lib/queries/` | Does NOT exist | CREATE this directory + `config.ts` |
| `lib/actions/` | Does NOT exist | CREATE this directory + `types.ts` |
| `components/settings/` | Does NOT exist | CREATE this directory + `NeedTypeTable.tsx` |
| `components/needs/` | Does NOT exist | CREATE this directory + `NeedTypeBadge.tsx` |

### ⚠️ CRITICAL: shadcn v4 (Nova/Base UI) — `asChild` Does NOT Work

This project uses `shadcn@4.14.0` with `@base-ui/react: ^1.6.0` (NOT Radix UI). **`asChild` does NOT work** — confirmed in Story 1.3 completion notes: "Used `buttonVariants` for Settings `<Link>` instead of `asChild` — `button.tsx` uses `@base-ui/react/button` which does not support the `asChild` prop."

After running `npx shadcn add [component]`, **read the generated file** before using it. Adapt patterns if the component doesn't support `asChild`. For link-as-button, always use `buttonVariants`:

```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

// CORRECT
<Link href="/foo" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Foo</Link>

// WRONG — asChild not supported
<Button asChild><Link href="/foo">Foo</Link></Button>
```

For `AlertDialogTrigger` and `TooltipTrigger` — check the generated component. If `asChild` is unavailable, use a wrapper element or apply `buttonVariants` className directly.

**Tooltip wrapping disabled button:** Disabled elements do not fire mouse events in most browsers, so `TooltipTrigger` may not show the tooltip. Wrap the disabled button in a `<span tabIndex={0}>` or use `pointer-events-none` on the button itself while keeping events on the wrapper:

```tsx
<Tooltip>
  <TooltipTrigger asChild={false}>  {/* or just <TooltipTrigger> */}
    <span className="cursor-not-allowed">
      <Button variant="ghost" size="icon-sm" disabled aria-label="Delete (in use)">
        <Trash2 className="size-4" />
      </Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>In use by {row.needs_count} need(s)</TooltipContent>
</Tooltip>
```

Adapt this pattern based on the actual generated `Tooltip` component interface.

### ⚠️ `lib/queries/config.ts` — Exact Patterns

```ts
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
```

- `better-sqlite3` is **synchronous** — no `async`/`await`. These are plain sync functions.
- `import 'server-only'` is required (AD-1) — prevents accidental client import.
- `.all()` returns `unknown[]` — cast with `as` after verifying column names match the interface.
- `listNeedTypes()` is available for future stories (Epic 3 create-need form type select).

### ⚠️ `lib/actions/types.ts` — Key Patterns

```ts
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
```

Rules:
- Server Actions **must** be `async` even though db calls are sync (Next.js requirement).
- **Never** throw across the Server Action boundary — always return `ActionResult`.
- `revalidatePath('/settings')` invalidates the RSC cache so the page refetches types on next navigation.
- `RETURNING` clause in SQLite returns the inserted/updated row — avoids a second SELECT.
- Catch SQLite errors by message text — `better-sqlite3` throws `Error` not a typed DB error.

### ⚠️ `components/needs/NeedTypeBadge.tsx` — Exact Spec

```tsx
// NO 'use client' — purely presentational; works in RSC and Client Components

interface NeedTypeBadgeProps {
  name: string
  color: string  // hex string from DB, e.g. '#2563EB'
  className?: string
}

export function NeedTypeBadge({ name, color, className }: NeedTypeBadgeProps) {
  return (
    <span
      style={{ backgroundColor: color }}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-semibold uppercase tracking-[0.04em] text-white${className ? ` ${className}` : ''}`}
    >
      {name}
    </span>
  )
}
```

**AD-7 enforcement:** `style={{ backgroundColor: color }}` — the color comes from the DB hex string. NEVER use a Tailwind `bg-*` class for the type color. `rounded-sm` maps to `3px` via the brand theme delta set in Story 1.1.

### ⚠️ `components/settings/NeedTypeTable.tsx` — Implementation Notes

```ts
type NeedTypeWithCount = NeedType & { needs_count: number }

// State
const [types, setTypes] = useState<NeedTypeWithCount[]>(initialTypes)
const [editingId, setEditingId] = useState<number | null>(null)
const [editDraft, setEditDraft] = useState({ name: '', prefix: '', color: '#000000' })
const [isAdding, setIsAdding] = useState(false)
const [newDraft, setNewDraft] = useState({ name: '', prefix: '', color: '#2563EB' })
const [isPending, setIsPending] = useState(false)
```

**Prefix enforcement on `onChange`:**
```tsx
onChange={e => setDraft(prev => ({
  ...prev,
  prefix: e.target.value.toUpperCase().slice(0, 6)
}))}
```
Server Action also validates — client enforcement is UX convenience only.

**Row click handler — avoid click propagation to action buttons:**
```tsx
<tr
  onClick={() => {
    if (editingId !== row.id) {
      setEditingId(row.id)
      setEditDraft({ name: row.name, prefix: row.prefix, color: row.color })
    }
  }}
  className="cursor-pointer hover:bg-muted/50"
>
```
Action buttons (Save, Cancel, Delete) must call `e.stopPropagation()` to avoid accidentally triggering the row click.

**Escape key to cancel edit:**
```tsx
onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
```
Add this to each input in the edit row.

**Optimistic local state update:**
After a successful Server Action, update the local `types` array directly (do not wait for page re-render):
```tsx
setTypes(prev => prev.map(t => t.id === id ? { ...t, ...updatedData, needs_count: t.needs_count } : t))
```
`revalidatePath('/settings')` in the action handles RSC cache invalidation for the next navigation.

**Color swatch in table (non-edit mode):** Use `NeedTypeBadge` to render the type name with its color — serves as both the color swatch and the type label:
```tsx
<td><NeedTypeBadge name={row.name} color={row.color} /></td>
```

**Import note:** Import Server Actions directly — they are passed as function references, not fetched:
```tsx
import { createNeedType, updateNeedType, deleteNeedType } from '@/lib/actions/types'
```

### ⚠️ `app/settings/page.tsx` — Target State

```tsx
import { listNeedTypesWithCount } from '@/lib/queries/config'
import { NeedTypeTable } from '@/components/settings/NeedTypeTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsPage() {  // synchronous RSC — no async needed
  const types = listNeedTypesWithCount()
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
          <p className="text-sm text-muted-foreground">Status values management — Story 2.2</p>
        </TabsContent>
      </Tabs>
    </main>
  )
}
```

Do NOT make `SettingsPage` async — `listNeedTypesWithCount()` is synchronous (better-sqlite3). Importing from `lib/queries/config.ts` is legal in an RSC because RSC are server-only by default (the `server-only` guard on the query file is a belt-and-suspenders confirmation).

### ⚠️ Toast Setup — Sonner

After `npx shadcn add sonner`, add to `app/layout.tsx` inside `<Providers>`:

```tsx
import { Toaster } from '@/components/ui/sonner'
// Place after the content wrapper div, still inside <Providers>
<Toaster />
```

In `NeedTypeTable.tsx` (client component):
```tsx
import { toast } from 'sonner'   // from the sonner PACKAGE, not a local file

toast('Saved.')                   // success toast, 3s default
toast.error(result.error)         // error toast (destructive style)
toast('Deleted.')                 // delete success toast
```

### ⚠️ `overflow-auto` Content Wrapper — Portal Awareness

From Story 1.3 deferred: `<div className="flex flex-1 flex-col min-h-0 overflow-auto">` clips `position: fixed` elements that don't portal to `document.body`. Shadcn components (Tooltip, AlertDialog, Sonner Toaster) should all use portals to `document.body` by default and will NOT be clipped. Verify in browser: tooltips render above the table, dialogs overlay the full viewport, and toasts appear in the corner. If any component clips, check whether it has a `portal` or `container` prop.

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — server-only DB | `lib/queries/config.ts` and `lib/actions/types.ts` both carry `import 'server-only'` |
| AD-2 — Server Actions for mutations | All create/update/delete via `lib/actions/types.ts`; RSC reads via `lib/queries/config.ts` |
| AD-7 — Color via inline style | `NeedTypeBadge` uses `style={{ backgroundColor: color }}` — no Tailwind color utility class |
| AD-10 — FK enforcement + delete guard | `deleteNeedType` queries `COUNT(need WHERE type_id = ?)` before DELETE; returns structured error if in use |
| `'use client'` scope | Only `NeedTypeTable.tsx` is `'use client'`; `NeedTypeBadge` and `SettingsPage` are RSC |
| shadcn primitives | All `components/ui/*` files are CLI-generated; never hand-edited |
| Server Action return shape | `ActionResult<T>` — never throws across action boundary |
| `revalidatePath` | All three actions call `revalidatePath('/settings')` on success |
| File naming | `NeedTypeTable.tsx`, `NeedTypeBadge.tsx` = PascalCase; `lib/queries/`, `lib/actions/`, `components/settings/` = kebab-case dirs |

### Deferred Items Resolved by This Story

- **Settings page has no `<h1>` landmark heading** (Story 1.3 review, `deferred-work.md`) → `<h1>Settings</h1>` added

### Stack Versions (Confirmed from Stories 1.1–1.3)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first, no `tailwind.config.js`) |
| shadcn/ui | 4.14.0 — **Base UI (Nova preset); `asChild` NOT supported** |
| @base-ui/react | ^1.6.0 |
| better-sqlite3 | ^12.11.1 — **synchronous API only** |
| lucide-react | ^1.26.0 — use for Trash2, Save icons |
| next-themes | ^0.4.6 |
| Node.js | v22.12.0 |

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.1, FR-1/2/3, FR-implicit-1, UX-DR2, UX-DR11, UX-DR12
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-7, AD-10; source tree confirms `lib/queries/config.ts`, `lib/actions/types.ts`, `components/settings/NeedTypeTable.tsx`, `components/needs/NeedTypeBadge.tsx`
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/DESIGN.md` — `need-type-badge` spec (11px, semibold, uppercase, `rounded-sm`, white fg, color via prop)
- Story 1.3: `_bmad-output/implementation-artifacts/1-3-app-shell-layout.md` — stack versions, `buttonVariants` pattern, `asChild` does not work, layout structure (body, Providers, overflow-auto wrapper)
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` — Settings heading, `overflow-auto` portal constraint, `tags` null-safe utility (for Story 3), `need.status` not FK'd (Story 2.2/3 validation)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (Windsurf Cascade) — bmad-dev-story workflow, 2026-07-27

### Debug Log References

### Completion Notes List

- All 6 shadcn components installed with a single `npx shadcn add` batch command; no separate runs needed
- `TooltipProvider` and `<Toaster />` added to `app/providers.tsx` (not layout.tsx) — both are client components and must sit inside ThemeProvider; this is cleaner than updating layout.tsx
- `lib/queries/config.ts` exports both `listNeedTypes()` (for future Epic 3 create-need form) and `listNeedTypesWithCount()` (for settings page)
- `lib/actions/types.ts` uses SQLite `RETURNING` clause on INSERT/UPDATE — avoids a second SELECT round-trip to fetch the saved row
- `NeedTypeBadge` is a plain RSC (no 'use client'); usable from both server and client components without hydration cost (AD-7 compliant)
- `NeedTypeTable` uses Base UI `render` prop pattern for `TooltipTrigger` and `AlertDialogTrigger` (not `asChild` — confirmed incompatible with `@base-ui/react` in Story 1.3)
- `AlertDialogAction` accepts `Button.Props` directly — used with `variant="destructive"` for the confirm delete button
- `AlertDialogCancel` uses Base UI `render={<Button />}` pattern; wraps the cancel button correctly
- Added `export const dynamic = 'force-dynamic'` to `app/settings/page.tsx` — build showed page as static without it; DB-backed pages must be dynamic to always reflect current data
- `tsc --noEmit` exit 0; `npm run build` exit 0; `/settings` correctly shows as ƒ (Dynamic) in route manifest
- Deferred item from Story 1.3: "Settings page has no `<h1>` landmark heading" — resolved by this story

### File List

- `sphinx-needs-clone/components/ui/tabs.tsx` — NEW (shadcn CLI)
- `sphinx-needs-clone/components/ui/sonner.tsx` — NEW (shadcn CLI)
- `sphinx-needs-clone/components/ui/alert-dialog.tsx` — NEW (shadcn CLI)
- `sphinx-needs-clone/components/ui/tooltip.tsx` — NEW (shadcn CLI)
- `sphinx-needs-clone/components/ui/input.tsx` — NEW (shadcn CLI)
- `sphinx-needs-clone/components/ui/label.tsx` — NEW (shadcn CLI)
- `sphinx-needs-clone/app/providers.tsx` — UPDATE (added TooltipProvider + Toaster)
- `sphinx-needs-clone/types/index.ts` — UPDATE (added `field?: string` to ActionResult false branch)
- `sphinx-needs-clone/lib/queries/config.ts` — NEW
- `sphinx-needs-clone/lib/actions/types.ts` — NEW
- `sphinx-needs-clone/components/needs/NeedTypeBadge.tsx` — NEW
- `sphinx-needs-clone/components/settings/NeedTypeTable.tsx` — NEW
- `sphinx-needs-clone/app/settings/page.tsx` — UPDATE (full replacement + force-dynamic)

## Change Log

- 2026-07-27: Implemented Story 2.1 — Need Types Management in Settings. Installed 6 shadcn components (tabs, sonner, alert-dialog, tooltip, input, label). Added TooltipProvider + Toaster to providers.tsx. Extended ActionResult with optional field. Created lib/queries/config.ts (listNeedTypes + listNeedTypesWithCount), lib/actions/types.ts (createNeedType, updateNeedType, deleteNeedType with FK guard), NeedTypeBadge RSC, NeedTypeTable client component with full inline CRUD, and updated settings page with Tabs. TypeScript clean, build passes, /settings renders as dynamic.
