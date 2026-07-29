---
baseline_commit: 367a7d3e103ccc5ef522d05bbf0f3df7a0f7c03b
---

# Story 3.3: Edit and Delete Needs

Status: done

## Story

As a user,
I want to edit an existing need and delete it when it's no longer needed,
So that I can keep my requirements up to date and remove obsolete entries.

## Acceptance Criteria

**AC1 — Row click opens NeedSheet in edit mode**
**Given** the needs table is visible
**When** I click any row
**Then** the `NeedSheet` opens in edit mode for that need, pre-populated with all current field values (type, title, status, tags, description), and the sheet title area shows the need's ID as an `IdChip` + `NeedTypeBadge`

**AC2 — Save changes in edit mode**
**Given** the edit sheet is open
**When** I modify fields and press `Ctrl+S` (or `⌘S`) or click "Save"
**Then** the `updateNeed` Server Action saves the changes, a "Saved." toast appears (3s), the sheet closes, and the table row updates

**AC3 — Delete button in sheet triggers confirm dialog**
**Given** the edit sheet is open
**When** I click the "Delete" button in the sheet footer
**Then** a confirm `AlertDialog` appears stacked above the sheet: "Delete [ID]? This will also remove all links to it." with a destructive confirm button and a cancel button

**AC4 — Delete confirmed via sheet**
**Given** I confirm deletion in the AlertDialog
**When** the `deleteNeed` Server Action runs
**Then** it executes `DELETE FROM need_link WHERE from_id = ? OR to_id = ?` and `DELETE FROM need WHERE id = ?` in a single SQLite transaction; a "Deleted." toast appears, the sheet closes, and the row disappears from the table

**AC5 — Row hover delete icon (without opening sheet)**
**Given** the needs table has rows
**When** I hover a row
**Then** a trash icon (delete) appears at the right edge of the row; clicking it (without opening the sheet) triggers a confirm `AlertDialog` with the same text as AC3; confirming calls `deleteNeed`, shows "Deleted." toast, and removes the row

**AC6 — Keyboard row navigation and Enter to open**
**Given** focus is on a table row
**When** I press `↑` or `↓`
**Then** focus moves to the previous or next row respectively
**When** I press `Enter` on a focused row
**Then** the edit sheet opens for that need (same as AC1)

**AC7 — Unsaved changes guard in edit mode**
**Given** an edit sheet is open with unsaved changes (any field modified from its initial value)
**When** I press `Escape` or click the backdrop
**Then** the "Discard changes?" `AlertDialog` appears before closing (same behavior as Story 3.2 AC6)

## Tasks / Subtasks

- [x] Task 1 — Update `types/index.ts` (AC: 2)
  - [x] Add `type_id?: number` to `UpdateNeedInput` (type is editable in edit mode)

- [x] Task 2 — Update `lib/actions/needs.ts` (AC: 2, 4)
  - [x] Add `UpdateNeedInput` to the existing type import from `'@/types'`
  - [x] Implement `updateNeed(id: string, input: UpdateNeedInput): Promise<ActionResult<Need>>`
    - Trim `title`; return `{ success: false, error: 'Title is required', field: 'title' }` if empty after trim
    - Validate status: `SELECT COUNT(*) FROM status_value WHERE value = ?` — return `{ success: false, error: 'Invalid status', field: 'status' }` if not found
    - Build `UPDATE need SET updated_at=?` appending each provided field (`type_id`, `title`, `status`, `tags`, `description`) dynamically via an update map
    - Simpler approach: always update all fields from input — `UPDATE need SET type_id=COALESCE(?,type_id), title=COALESCE(?,title), status=COALESCE(?,status), tags=?, description=?, updated_at=? WHERE id=? RETURNING *`
    - Use `db.prepare(...).get(...)` (synchronous) — NOT async/await for DB call
    - If no row returned (ID not found): return `{ success: false, error: 'Need not found' }`
    - `revalidatePath('/')`
    - Return `{ success: true, data: updatedRow as Need }`
  - [x] Implement `deleteNeed(id: string): Promise<ActionResult<void>>`
    - Wrap in `db.transaction(() => { ... })()` per AD-11 — NOT raw SQL strings
    - Inside transaction: `DELETE FROM need_link WHERE from_id = ? OR to_id = ?` (pass `id` twice)
    - Then: `DELETE FROM need WHERE id = ?`
    - `revalidatePath('/')`
    - Return `{ success: true, data: undefined }`
    - Catch: return `{ success: false, error: 'Failed to delete need' }`

- [x] Task 3 — Update `components/needs/NeedSheet.tsx` (AC: 1, 2, 3, 4, 7)
  - [x] Add `import type { Need } from '@/types'` (already imports NeedType, StatusValue — add Need)
  - [x] Add `import { IdChip } from '@/components/needs/IdChip'`
  - [x] Add `import { NeedTypeBadge } from '@/components/needs/NeedTypeBadge'`
  - [x] Add `updateNeed, deleteNeed` to the existing import from `'@/lib/actions/needs'`
  - [x] Update `NeedSheetProps` interface:
    - Add `mode?: 'create' | 'edit'` (default `'create'` if not provided)
    - Add `initialNeed?: Need` (populated in edit mode)
  - [x] Add `deleteConfirmOpen: boolean` state (controls sheet-level delete AlertDialog)
  - [x] Update `useEffect` on `open` changes (mode-aware):
    - If `mode === 'edit' && initialNeed`: populate formState directly from `initialNeed` fields; skip `suggestNeedId` call (no ID suggestion needed in edit mode); clear `idError`
    - If `mode !== 'edit'`: existing logic unchanged (defaultForm + suggestNeedId)
    - Guard with `token = ++suggestRequestRef.current` pattern unchanged for create mode
  - [x] Update `isDirty` to be mode-aware:
    - Edit mode: `formState.type_id !== (initialNeed?.type_id ?? 0) || formState.title !== (initialNeed?.title ?? '') || formState.status !== (initialNeed?.status ?? 'open') || formState.tags !== (initialNeed?.tags ?? '') || formState.description !== (initialNeed?.description ?? '')`
    - Create mode: existing logic unchanged
  - [x] Update `handleSave`:
    - Edit mode: call `updateNeed(initialNeed!.id, { type_id: formState.type_id, title: formState.title, status: formState.status, tags: formState.tags || undefined, description: formState.description || undefined })`
    - On success: `toast('Saved.')`, `onOpenChange(false)`, `router.refresh()`
    - On failure with `field`: set inline error (e.g., `setIdError` for field `id`); otherwise `toast.error(result.error ?? "Couldn't save. Try again.")`
    - Create mode: existing `createNeed` call unchanged
  - [x] Add `handleDelete()`: wrapped in `startTransition` — call `deleteNeed(initialNeed!.id)` → on success: `toast('Deleted.')`, `setDeleteConfirmOpen(false)`, `onOpenChange(false)`, `router.refresh()`; on failure: `toast.error(result.error ?? "Couldn't delete. Try again.")`
  - [x] ID field: in edit mode set `readOnly` and add a `disabled` or muted visual — no `onChange` handler fires; value = `initialNeed?.id ?? ''`; keep `font-mono` class
  - [x] Sheet header JSX for edit mode:
    ```tsx
    {mode === 'edit' && initialNeed ? (
      <SheetTitle className="flex items-center gap-2">
        <IdChip id={initialNeed.id} />
        {initialNeed.type_name && initialNeed.type_color && (
          <NeedTypeBadge name={initialNeed.type_name} color={initialNeed.type_color} />
        )}
      </SheetTitle>
    ) : (
      <SheetTitle>New Need</SheetTitle>
    )}
    ```
  - [x] Sheet footer: edit mode layout = `justify-between` (Delete on left, Cancel+Save on right):
    ```tsx
    {mode === 'edit' && (
      <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isPending}>
        Delete
      </Button>
    )}
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
      <Button onClick={handleSave} disabled={isPending || !formState.type_id}>
        {isPending ? 'Saving…' : 'Save'}
      </Button>
    </div>
    ```
  - [x] Add delete `AlertDialog` (within NeedSheet JSX, alongside existing discard AlertDialog):
    - `open={deleteConfirmOpen}` `onOpenChange={setDeleteConfirmOpen}`
    - Title: `Delete {initialNeed?.id}?`
    - Description: `This will also remove all links to it.`
    - Cancel: `AlertDialogCancel` → closes dialog
    - Confirm: `AlertDialogAction variant="destructive"` → calls `handleDelete()`

- [x] Task 4 — Update `components/needs/NeedsTable.tsx` (AC: 1, 5, 6)
  - [x] Update existing lucide-react import to add `Trash2`
  - [x] Add imports: `toast` from `'sonner'`; `deleteNeed` from `'@/lib/actions/needs'`; `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel` from `'@/components/ui/alert-dialog'`
  - [x] Add state: `const [selectedNeed, setSelectedNeed] = useState<NeedRow | null>(null)`
  - [x] Add state: `const [deleteTarget, setDeleteTarget] = useState<NeedRow | null>(null)` and `const [rowDeleteConfirmOpen, setRowDeleteConfirmOpen] = useState(false)`
  - [x] Add ref: `const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])`
  - [x] Update `NeedSheet` props:
    - `mode={selectedNeed ? 'edit' : 'create'}`
    - `initialNeed={selectedNeed ?? undefined}`
    - `onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedNeed(null) }}`
  - [x] Wire each table row:
    - Add `'group'` to `tr` className
    - `onClick`: `() => { setSelectedNeed(need); setSheetOpen(true) }`
    - `onKeyDown`: extend existing handler — add `ArrowUp`: `e.preventDefault(); rowRefs.current[index - 1]?.focus()`; `ArrowDown`: `e.preventDefault(); rowRefs.current[index + 1]?.focus()`; `Enter`: `setSelectedNeed(need); setSheetOpen(true)`
    - `ref`: `(el) => { rowRefs.current[index] = el }` (use map index)
  - [x] Add delete icon `td` as last cell in each row (after the Links `td`):
    ```tsx
    <td className="px-3 py-2 w-8">
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
        aria-label={`Delete ${need.id}`}
        onClick={(e) => { e.stopPropagation(); setDeleteTarget(need); setRowDeleteConfirmOpen(true) }}
      >
        <Trash2 className="size-4" />
      </button>
    </td>
    ```
  - [x] Add matching `<th>` header cell for the delete column (empty header, `w-8`)
  - [x] Add row-level delete `AlertDialog` at bottom of fragment (alongside existing `NeedSheet`):
    - `open={rowDeleteConfirmOpen}` `onOpenChange={setRowDeleteConfirmOpen}`
    - Title: `Delete {deleteTarget?.id}?`
    - Description: `This will also remove all links to it.`
    - Confirm: destructive → call `deleteNeed(deleteTarget!.id)` in `startTransition` → on success `toast('Deleted.')`, `router.refresh()`
    - NOTE: NeedsTable uses `const [, startTransition] = useTransition()` (isPending not needed in UI)

- [x] Task 5 — Verify all ACs
  - [x] `npx tsc --noEmit` → exit 0 (run from `sphinx-needs-clone/`)
  - [x] `npm run build` → exit 0 (run from `sphinx-needs-clone/`)
  - [x] Dev server at http://localhost:3000 — verify: AC1 (row click → edit sheet), AC2 (save changes), AC3 (delete button → confirm dialog), AC4 (delete confirmed), AC5 (hover icon → confirm → row removed), AC6 (↑/↓ nav, Enter opens sheet), AC7 (unsaved changes guard)

## Dev Notes

### ⚠️ CRITICAL: `deleteNeed` Transaction Pattern (AD-11)

`DELETE FROM need_link` MUST run in the same transaction as `DELETE FROM need`. Use `db.transaction(fn)()` — NOT raw SQL `BEGIN`/`COMMIT` strings. better-sqlite3's transaction helper handles this:

```ts
const deleteTransaction = db.transaction((id: string) => {
  db.prepare('DELETE FROM need_link WHERE from_id = ? OR to_id = ?').run(id, id)
  db.prepare('DELETE FROM need WHERE id = ?').run(id)
})

try {
  deleteTransaction(id)
  revalidatePath('/')
  return { success: true, data: undefined }
} catch (err: unknown) {
  return { success: false, error: 'Failed to delete need' }
}
```

All `db.prepare()` + `.run()` calls are **synchronous** — no `await`. `revalidatePath` is called **after** the transaction, outside the try block only if transaction succeeded (catch returns early).

### ⚠️ CRITICAL: `updateNeed` — No seq Change Needed

Do NOT update `seq` in `updateNeed`. The `seq` column drives `suggestNeedId` — it reflects the ID's numeric suffix. Since the ID is read-only in edit mode, `seq` is unchanged. Only update: `type_id`, `title`, `status`, `tags`, `description`, `updated_at`.

Full `updateNeed` implementation approach:
```ts
export async function updateNeed(id: string, input: UpdateNeedInput): Promise<ActionResult<Need>> {
  const title = (input.title ?? '').trim()
  if (!title) return { success: false, error: 'Title is required', field: 'title' }

  if (input.status) {
    const validStatus = db
      .prepare('SELECT COUNT(*) AS count FROM status_value WHERE value = ?')
      .get(input.status) as { count: number }
    if (validStatus.count === 0) {
      return { success: false, error: 'Invalid status', field: 'status' }
    }
  }

  const now = new Date().toISOString()
  const row = db
    .prepare(`
      UPDATE need
      SET type_id = ?, title = ?, status = ?, tags = ?, description = ?, updated_at = ?
      WHERE id = ?
      RETURNING id, type_id, title, status, tags, description, seq, created_at, updated_at
    `)
    .get(
      input.type_id ?? null,   // if undefined, handled by COALESCE or just pass current value
      title,
      input.status ?? null,
      input.tags?.trim() || null,
      input.description?.trim() || null,
      now,
      id
    ) as Need | undefined

  if (!row) return { success: false, error: 'Need not found' }
  revalidatePath('/')
  return { success: true, data: row }
}
```

**IMPORTANT**: If `input.type_id` can be undefined (when caller doesn't intend to change type), the UPDATE will set `type_id = NULL` which violates the NOT NULL constraint. Solution: always pass `type_id` from the form (pre-populated with `initialNeed.type_id`). The form always has a type selected, so `formState.type_id` is always a valid number. Pass it unconditionally.

### ⚠️ CRITICAL: ID is Read-Only in Edit Mode

Changing a need's ID would require cascading updates to `need_link.from_id` and `need_link.to_id` — deferred beyond Story 3.3 scope. In edit mode, the ID `<Input>` must have `readOnly` attribute. Do NOT add an `onChange` handler for the ID field in edit mode. Visually indicate read-only state with `className="font-mono text-muted-foreground cursor-default"` or `disabled` prop.

### ⚠️ CRITICAL: `isDirty` in Edit Mode

Create mode isDirty checks against defaults. Edit mode isDirty must compare against `initialNeed` values:

```tsx
const isDirty = mode === 'edit' && initialNeed
  ? formState.type_id !== initialNeed.type_id ||
    formState.title !== initialNeed.title ||
    formState.status !== initialNeed.status ||
    formState.tags !== (initialNeed.tags ?? '') ||
    formState.description !== (initialNeed.description ?? '')
  : formState.title !== '' ||
    formState.tags !== '' ||
    formState.description !== '' ||
    formState.status !== 'open'
```

`initialNeed.tags` and `initialNeed.description` are `string | null` — coerce to `''` for comparison. The form always stores `string` (never null).

### ⚠️ CRITICAL: `useEffect` Population in Edit Mode

When `open` transitions to `true` in edit mode, populate form from `initialNeed` without calling `suggestNeedId`:

```tsx
useEffect(() => {
  if (!open) return
  if (mode === 'edit' && initialNeed) {
    setFormState({
      type_id: initialNeed.type_id,
      id: initialNeed.id,
      title: initialNeed.title,
      status: initialNeed.status,
      tags: initialNeed.tags ?? '',
      description: initialNeed.description ?? '',
    })
    setIdError(null)
    return  // no suggestNeedId in edit mode
  }
  // Create mode — existing logic unchanged
  const fresh = defaultForm(types)
  setFormState(fresh)
  setIdError(null)
  if (fresh.type_id) {
    const token = ++suggestRequestRef.current
    startTransition(async () => {
      const result = await suggestNeedId(fresh.type_id)
      if (result.success && token === suggestRequestRef.current) {
        setFormState(prev => ({ ...prev, id: result.data }))
      }
    })
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open])
```

The `mode` and `initialNeed` props may change between opens — the effect's dependency on `[open]` is intentional to reset form on each open.

### ⚠️ CRITICAL: Two Delete AlertDialogs — NeedSheet vs NeedsTable

**NeedSheet** (edit mode delete button) renders its own delete AlertDialog stacked above the Sheet. Per EXPERIENCE.md: "The delete confirm is a shadcn AlertDialog on top of the sheet, not a third level."

**NeedsTable** (row hover delete icon, no sheet open) renders a separate delete AlertDialog at the fragment level. These are two independent AlertDialog instances, both calling `deleteNeed`. This is intentional — clean separation.

### ⚠️ CRITICAL: Row ↑/↓ Navigation via `rowRefs`

```tsx
// At component level:
const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])

// In row render (map callback):
{initialNeeds.map((need, index) => (
  <tr
    ref={(el) => { rowRefs.current[index] = el }}
    onKeyDown={e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); rowRefs.current[index - 1]?.focus() }
      if (e.key === 'ArrowDown') { e.preventDefault(); rowRefs.current[index + 1]?.focus() }
      if (e.key === 'Enter') { setSelectedNeed(need); setSheetOpen(true) }
    }}
    // ... rest unchanged
  >
```

The existing `onKeyDown` placeholder for Story 3.3 at the `Enter` key path is replaced with this. `rowRefs.current[index - 1]?.focus()` safely no-ops at index 0 (returns undefined for out-of-bounds).

### ⚠️ CRITICAL: `NeedsTable` Needs `useTransition` for Row Delete

`NeedsTable` doesn't currently use `useTransition`. Add it for the row-level delete action:

```tsx
const [isPending, startTransition] = useTransition()
```

Import `useTransition` from `'react'` (add to existing import). The row delete confirm handler:
```tsx
// On row-level delete confirm:
startTransition(async () => {
  const result = await deleteNeed(deleteTarget!.id)
  if (result.success) {
    toast('Deleted.')
    router.refresh()
  } else {
    toast.error(result.error ?? "Couldn't delete. Try again.")
  }
  setRowDeleteConfirmOpen(false)
  setDeleteTarget(null)
})
```

### ⚠️ Base UI Nova Preset — `render={}` not `asChild`

All shadcn components use `@base-ui/react` (Nova preset). `asChild` is NOT supported. Use `render={<Component />}` for polymorphic renders. AlertDialog imports are already in `components/ui/alert-dialog.tsx` — use as-is without modification.

### ⚠️ Row Hover Delete Icon — Tailwind Group Pattern

Add `'group'` to each `<tr>` className. The trash icon cell:
```tsx
<td className="px-3 py-2 w-8">
  <button
    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 focus:opacity-100"
    aria-label={`Delete ${need.id}`}
    onClick={(e) => {
      e.stopPropagation()
      setDeleteTarget(need)
      setRowDeleteConfirmOpen(true)
    }}
  >
    <Trash2 className="size-4" />
  </button>
</td>
```

`e.stopPropagation()` prevents row `onClick` from firing (which would open the edit sheet). Add `focus:opacity-100` so keyboard-focused delete icon is visible without hover.

### ⚠️ `router.refresh()` Required After All Mutations

After `updateNeed` or `deleteNeed` succeeds, call `router.refresh()` to re-run the RSC `page.tsx` and pass fresh `initialNeeds` to `NeedsTable`. Without this, the table will NOT reflect changes.

### ⚠️ NeedSheet `onOpenChange` in NeedsTable — Clear `selectedNeed`

```tsx
<NeedSheet
  open={sheetOpen}
  onOpenChange={(open) => {
    setSheetOpen(open)
    if (!open) setSelectedNeed(null)  // ← reset so next open defaults to create mode
  }}
  mode={selectedNeed ? 'edit' : 'create'}
  initialNeed={selectedNeed ?? undefined}
  types={types}
  statuses={statuses}
/>
```

Clearing `selectedNeed` on close ensures the next sheet open (from "New Need" button or `n` shortcut) gets `mode='create'` and no `initialNeed`.

### ⚠️ `deleteNeed` Return Type — `ActionResult<void>`

The existing `ActionResult<T>` type is:
```ts
| { success: true; data: T }
| { success: false; error: string; field?: string }
```

For `deleteNeed`, use `Promise<ActionResult<void>>` and return `{ success: true, data: undefined }`. TypeScript allows `undefined` where `void` is expected. Callers check only `result.success` — they don't access `result.data`.

### ⚠️ `handleTypeChange` in Edit Mode

`handleTypeChange` currently calls `suggestNeedId` (for create mode). In edit mode, the ID field is read-only — type changes should NOT trigger `suggestNeedId`. Guard:

```tsx
function handleTypeChange(typeId: number) {
  setFormState(prev => ({ ...prev, type_id: typeId }))
  setIdError(null)
  if (mode === 'edit') return  // no ID suggestion in edit mode
  const token = ++suggestRequestRef.current
  startTransition(async () => {
    const result = await suggestNeedId(typeId)
    if (result.success && token === suggestRequestRef.current) {
      setFormState(prev => ({ ...prev, id: result.data }))
    }
  })
}
```

### Deferred Work to Check

From `deferred-work.md`:
- **"`need.status` not FK'd to `status_value`"** — mitigated by application-layer validation in both `createNeed` (Story 3.2) and `updateNeed` (this story). No action needed.
- **"No max-length server validation on form fields"** — still deferred; not in this story's AC scope.

### Stack Versions (Carry-forward from Story 3.2)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first) |
| shadcn/ui | 4.14.0 — Nova/Base UI preset; **`asChild` NOT supported** |
| `@base-ui/react` | ^1.6.0 — `render={<Component />}` for polymorphism |
| better-sqlite3 | ^12.11.1 — **synchronous; no `async/await` for DB calls** |
| sonner | ^2.0.7 — `toast('Saved.')` / `toast('Deleted.')` neutral; `toast.error(...)` destructive |
| lucide-react | ^1.26.0 — `Trash2` icon available |
| Node.js | v22.12.0 |

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — server-only DB | `updateNeed` and `deleteNeed` are `'use server'` Server Actions; `lib/db.ts` untouched |
| AD-2 — Server Actions own mutations | `updateNeed`, `deleteNeed` in `lib/actions/needs.ts` |
| AD-11 — need_link cleanup in transaction | `deleteNeed` wraps both DELETEs in `db.transaction()` |
| AD-4 — ID server-side | ID read-only in edit mode; `seq` unchanged on update |
| Server Action return shape | `ActionResult<T>` with `{ success: true, data: T }` or `{ success: false, error, field? }` |
| `'use client'` scope | `NeedSheet` and `NeedsTable` remain `'use client'`; no new client components added |

### Project Structure After This Story

```
lib/actions/needs.ts            ← UPDATE (add updateNeed, deleteNeed)
components/needs/NeedSheet.tsx  ← UPDATE (add edit mode, delete button, mode/initialNeed props)
components/needs/NeedsTable.tsx ← UPDATE (wire row click/Enter, hover delete icon, ↑/↓ nav, selectedNeed state)
types/index.ts                  ← UPDATE (add type_id to UpdateNeedInput)
```

No new files. No new shadcn components needed.

### Cross-Story Awareness

- **Story 4.1 (Link Counts / Link Search)**: Will modify `NeedSheet` to add a Links field. The `mode`/`initialNeed` props added here are forward-compatible. The `updateNeed` action will need to handle `need_link` rows too in Story 4.1.
- **Story 4.2 (Backlinks)**: Will read `need_link` rows computed via JOIN — no impact from this story's delete logic (already cleans up correctly via AD-11).
- **Story 5.1 (Filter Bar)**: No impact on edit/delete flows.

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.3; FR-5 (edit), FR-6 (delete + cascade links), FR-7 (unique ID)
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-2, AD-11 (delete transaction), AD-4, AD-1
- UX Experience: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — Component Patterns (Need Detail Sheet header), State Patterns (delete confirm, unsaved changes), Interaction Primitives (↑/↓, Enter, Escape)
- Previous Story: `_bmad-output/implementation-artifacts/3-2-create-need-via-side-sheet.md` — NeedSheet current state (create mode), stack versions, AlertDialog patterns, Ctrl+S ref pattern, router.refresh() pattern, Base UI `render={}` pattern
- Deferred Work: `_bmad-output/implementation-artifacts/deferred-work.md` — `need.status` not FK'd (handled via app-layer validation), no max-length validation (deferred)
- Existing files modified: `sphinx-needs-clone/lib/actions/needs.ts` (add updateNeed/deleteNeed), `sphinx-needs-clone/components/needs/NeedSheet.tsx` (edit mode), `sphinx-needs-clone/components/needs/NeedsTable.tsx` (row wiring), `sphinx-needs-clone/types/index.ts` (UpdateNeedInput)

### Review Findings

- [x] [Review][Patch] Enter key on focused trash `<button>` bubbles to `tr` `onKeyDown` — opens edit sheet unexpectedly [NeedsTable.tsx:148-152]
- [x] [Review][Patch] Ctrl+S fires `handleSave` while delete confirm dialog is open [NeedSheet.tsx:202-212]
- [x] [Review][Patch] `deleteTarget` state not cleared on row-delete dialog Cancel [NeedsTable.tsx:202-233]
- [x] [Review][Defer] `updateNeed` always requires `title` despite optional interface [lib/actions/needs.ts:89] — deferred, pre-existing
- [x] [Review][Defer] `sheetOpenRef` update lag — deferred, pre-existing (Story 3.2)
- [x] [Review][Defer] `rowRefs` array grows unboundedly — deferred, acceptable for MVP ≤500 rows
- [x] [Review][Defer] Toast duration uses Sonner default (~4s) vs spec "3s" — deferred, same pattern in Story 3.2 `createNeed`

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-07-29

### Debug Log References

None — clean implementation, no debugging required.

### Completion Notes List

- **Task 1**: Added `type_id?: number` to `UpdateNeedInput` in `types/index.ts` so type is editable in edit mode.
- **Task 2**: Added `updateNeed` (COALESCE for type_id/status to prevent NOT NULL violations) and `deleteNeed` (db.transaction wrapping both DELETE statements per AD-11) to `lib/actions/needs.ts`.
- **Task 3**: Extended `NeedSheet` with `mode`/`initialNeed` props. Edit mode: `IdChip`+`NeedTypeBadge` header, read-only ID field, mode-aware `isDirty`, `handleSave` branches on mode, `handleDelete` with its own AlertDialog, `handleTypeChange` guards against `suggestNeedId` in edit mode. `deleteConfirmOpen` reset in `useEffect` via eslint-disable comment (intentional pattern).
- **Task 4**: Extended `NeedsTable` with `selectedNeed`/`deleteTarget`/`rowDeleteConfirmOpen` state, `rowRefs` for ↑/↓ nav, row `onClick`/`onKeyDown`/`ref` wiring, `group` hover class, `Trash2` delete icon per row, and a row-level delete AlertDialog with `startTransition`. `useTransition` destructured as `[, startTransition]` (isPending not used in UI).
- **Pre-existing lint errors** (NOT from this story): `NeedsTable.tsx:76` (`setSheetOpen` in effect, from Story 3.2) and `NeedTypeTable.tsx:198` (unescaped entities, from Story 2.1) — already in `deferred-work.md` scope.
- **No test framework** configured in project; verification via `tsc --noEmit` (exit 0), `npm run build` (exit 0), and `npm run lint` (0 new errors introduced).

### File List

- `types/index.ts`
- `lib/actions/needs.ts`
- `components/needs/NeedSheet.tsx`
- `components/needs/NeedsTable.tsx`
- `_bmad-output/implementation-artifacts/3-3-edit-and-delete-needs.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

