---
baseline_commit: e317fe2369ca9a747b4a3e57594fb74596d2967d
---

# Story 3.2: Create Need via Side Sheet

Status: done

## Story

As a user,
I want to create a new need with all required fields using a side sheet form,
So that I can capture requirements, specs, or other items immediately.

## Acceptance Criteria

**AC1 — "New Need" button and `n` shortcut open the sheet**
**Given** I click the "New Need" button in the top bar (or the empty-state "New Need" button) or press `n`
**When** the action fires
**Then** a Sheet slides in from the right (480px wide on `≥ lg`, full-width on `< sm`) with title "New Need"

**AC2 — Sheet form contains all required fields in correct order**
**Given** the create sheet is open
**When** I inspect the form
**Then** fields appear in this order: Type (Select from DB types) → ID (monospace Input, auto-populated as `PREFIX_001`, editable) → Title (Input) → Status (Select, default `open`) → Tags (comma-separated text Input) → Description (Textarea)

**AC3 — Type change triggers server-side ID recalculation**
**Given** the create sheet is open
**When** I change the Type select
**Then** the ID field prefix updates to match the selected type's prefix and the seq counter recalculates via a server call (`suggestNeedId`)

**AC4 — Save succeeds: toast, sheet closes, table refreshes**
**Given** I press `Ctrl+S` (or `⌘S`) or click "Save"
**When** the `createNeed` Server Action completes successfully
**Then** a "Saved." toast appears (3s), the sheet closes, and the needs table refreshes showing the new row

**AC5 — Duplicate ID shows inline error**
**Given** I enter an ID that already exists in the database
**When** I attempt to save
**Then** the save is rejected with `{ success: false, error: "ID already in use", field: "id" }`, an inline error "ID already in use" appears below the ID field, and the sheet remains open

**AC6 — Unsaved changes guard (dirty form)**
**Given** I have entered data in the form (title, tags, description is non-empty, or status changed from default)
**When** I press `Escape` or click the sheet backdrop
**Then** an `AlertDialog` appears: "Discard changes?" with "Discard" (destructive) and "Keep editing" buttons; choosing "Discard" closes the sheet without saving

**AC7 — Clean form closes immediately**
**Given** the form has no user-entered content
**When** I press `Escape`
**Then** the sheet closes immediately without the AlertDialog

## Tasks / Subtasks

- [x] Task 1 — Install required shadcn components (run from `sphinx-needs-clone/`)
  - [x] `npx shadcn@latest add sheet`
  - [x] `npx shadcn@latest add select`
  - [x] `npx shadcn@latest add textarea`

- [x] Task 2 — Update `types/index.ts` (AC: 2, 5)
  - [x] Add `id: string` field to `CreateNeedInput` (before `type_id`)

- [x] Task 3 — Create `lib/actions/needs.ts` (AC: 3, 4, 5)
  - [x] `'use server'` directive at top, then `import 'server-only'`
  - [x] Import `revalidatePath` from `'next/cache'`, `db` from `'@/lib/db'`, `ActionResult`, `Need`, `CreateNeedInput` from `'@/types'`
  - [x] `suggestNeedId(typeId: number): Promise<ActionResult<string>>`
    - Read `{ prefix }` from `need_type WHERE id = typeId`
    - Read `MAX(seq) FROM need WHERE type_id = typeId` — returns null if no needs for that type
    - Return `{ success: true, data: `${prefix}_${String((max ?? 0) + 1).padStart(3, '0')}` }`
    - If type not found: `{ success: false, error: 'Type not found' }`
  - [x] `createNeed(input: CreateNeedInput): Promise<ActionResult<Need>>`
    - Validate `input.title.trim()` not empty — return `{ success: false, error: 'Title is required', field: 'title' }` if empty
    - Validate `input.id.trim()` not empty — return `{ success: false, error: 'ID is required', field: 'id' }` if empty
    - Validate status exists in `status_value` — SELECT count from `status_value WHERE value = input.status`
    - Compute `seq`: extract from ID via regex `/${prefix}_(\d+)$/i`; if match use `parseInt(match[1])`; else use `MAX(seq) + 1` for that type_id
    - Wrap INSERT in `db.transaction(...)` (better-sqlite3 synchronous transaction — no `BEGIN IMMEDIATE` string needed; use `db.transaction(fn)`)
    - `INSERT INTO need (id, type_id, title, status, tags, description, seq, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    - `created_at` and `updated_at`: `new Date().toISOString()`
    - Catch SQLite UNIQUE error: if `err.message.includes('UNIQUE')` → return `{ success: false, error: 'ID already in use', field: 'id' }`
    - `revalidatePath('/')`
    - Return `{ success: true, data: row as Need }`

- [x] Task 4 — Create `components/layout/NewNeedButton.tsx` (AC: 1)
  - [x] `'use client'` directive
  - [x] Import `useRouter`, `useSearchParams`, `usePathname` from `'next/navigation'`
  - [x] Import `Button` from `'@/components/ui/button'`
  - [x] On click: preserve existing search params (sort, dir) and add `new=1`; call `router.push()`
  - [x] Render `<Button size="sm" onClick={handleClick}>New Need</Button>` (not disabled)

- [x] Task 5 — Update `components/layout/AppTopBar.tsx` (AC: 1)
  - [x] Import `NewNeedButton` from `'@/components/layout/NewNeedButton'`
  - [x] Replace `<Button variant="default" size="sm" disabled>New Need</Button>` with `<NewNeedButton />`
  - [x] Remove unused `Button` import if no longer needed (keep `buttonVariants` for Settings link)

- [x] Task 6 — Create `components/needs/NeedSheet.tsx` (AC: 1–7)
  - [x] `'use client'` directive
  - [x] Import `useState`, `useEffect`, `useTransition`, `useCallback` from `'react'`
  - [x] Import `useRouter` from `'next/navigation'`
  - [x] Import `toast` from `'sonner'`
  - [x] Import `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter` from `'@/components/ui/sheet'`
  - [x] Import `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel` from `'@/components/ui/alert-dialog'`
  - [x] Import `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `'@/components/ui/select'`
  - [x] Import `Input` from `'@/components/ui/input'`
  - [x] Import `Textarea` from `'@/components/ui/textarea'`
  - [x] Import `Label` from `'@/components/ui/label'`
  - [x] Import `Button` from `'@/components/ui/button'`
  - [x] Import `suggestNeedId`, `createNeed` from `'@/lib/actions/needs'`
  - [x] Import `type { NeedType, StatusValue }` from `'@/types'`
  - [x] Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `types: NeedType[]`, `statuses: StatusValue[]`
  - [x] Form state interface: `{ type_id: number; id: string; title: string; status: string; tags: string; description: string }`
  - [x] Initial/default form state factory: `defaultForm(types)` → `{ type_id: types[0]?.id ?? 0, id: '', title: '', status: 'open', tags: '', description: '' }`
  - [x] `isDirty`: `formState.title !== '' || formState.tags !== '' || formState.description !== '' || formState.status !== 'open'`
  - [x] `idError` state: `string | null` — set when server returns `field: 'id'` error
  - [x] `discardOpen` state: `boolean` — controls AlertDialog visibility
  - [x] `[isPending, startTransition]` from `useTransition`
  - [x] On `open` changes to `true` (`useEffect`): reset form to `defaultForm(types)`; call `suggestNeedId(types[0].id)` inside `startTransition` to populate initial ID; clear `idError`
  - [x] `handleTypeChange(typeId: number)`: update `type_id` in form state; call `suggestNeedId(typeId)` in `startTransition` to update `id`; clear `idError` (type change resets auto ID)
  - [x] `handleClose()`: if `isDirty` → `setDiscardOpen(true)`; else → `onOpenChange(false)`
  - [x] `handleDiscard()`: `setDiscardOpen(false)`; `onOpenChange(false)`; reset form
  - [x] `handleSave()` wrapped in `useCallback` with `handleSaveRef` for stable Ctrl+S listener
  - [x] Ctrl+S / ⌘S shortcut via window `keydown` listener (active only when `open === true`)
  - [x] Sheet JSX with correct layout and field order
  - [x] ID Input has `font-mono` className
  - [x] ID Input inline error with `aria-invalid` and `aria-describedby`
  - [x] AlertDialog: title "Discard changes?", "Keep editing" (AlertDialogCancel) and "Discard" (AlertDialogAction destructive)

- [x] Task 7 — Update `components/needs/NeedsTable.tsx` (AC: 1, 7)
  - [x] Add imports: `useState`, `useEffect`, `useRef` from `'react'`; `type { NeedType, StatusValue }` from `'@/types'`; `NeedSheet` from `'@/components/needs/NeedSheet'`
  - [x] Expand props interface: add `types: NeedType[]`, `statuses: StatusValue[]`
  - [x] Add `const [sheetOpen, setSheetOpen] = useState(false)`
  - [x] Add `sheetOpenRef` for stable keydown closure
  - [x] `useEffect` for URL `?new=1` coordination
  - [x] `useEffect` for `n` keyboard shortcut (global)
  - [x] Empty state "New Need" button: no longer disabled; `onClick={() => setSheetOpen(true)}`
  - [x] Row TODO comments updated to Story 3.3
  - [x] Restructured: early return eliminated; `NeedSheet` rendered unconditionally in fragment

- [x] Task 8 — Update `app/page.tsx` (AC: 1, 2)
  - [x] Add imports: `listNeedTypes`, `listStatuses` from `'@/lib/queries/config'`
  - [x] Call `const types = listNeedTypes()` and `const statuses = listStatuses()` after `listNeeds()`
  - [x] Pass `types={types}` and `statuses={statuses}` to `<NeedsTable>`

- [x] Task 9 — Verify all ACs
  - [x] `npx tsc --noEmit` → exit 0
  - [x] `npm run build` → exit 0
  - [x] Dev server verified running at http://localhost:3000
  - [x] All AC code paths verified via code review: AC1 (NewNeedButton + n shortcut), AC2 (field order), AC3 (suggestNeedId on type change), AC4 (createNeed → toast + close + refresh), AC5 (UNIQUE violation → idError), AC6 (isDirty guard → AlertDialog), AC7 (clean form closes immediately)

### Review Findings

- [x] [Review][Patch] Unescaped `type.prefix` in `RegExp` constructor — prefix is `.toUpperCase()` only, no alphanumeric guard, so `A.B` or `V.2` are valid and `.` in a regex matches any char, causing incorrect `seq` extraction from user-entered IDs [lib/actions/needs.ts:46]
- [x] [Review][Patch] Zero-seq when user enters `PREFIX_000` — `parseInt('000') = 0` and `0 ?? expr` = 0 (nullish coalescing skips 0), so `seq = 0` is persisted [lib/actions/needs.ts:48,53]
- [x] [Review][Patch] Rapid type-change stale ID suggestion — multiple overlapping `suggestNeedId` transitions with no abort or sequence guard; last-to-resolve overwrites a newer result [components/needs/NeedSheet.tsx:93-101]
- [x] [Review][Patch] In-flight `suggestNeedId` fires after sheet close/reopen — transition callback calls `setFormState` after sheet has been closed and reopened, overwriting the new session's suggestion [components/needs/NeedSheet.tsx:77-89]
- [x] [Review][Patch] Empty `types[]` — no submit guard — `type_id = 0`, server returns generic "Failed to create need" with no actionable guidance for the user [components/needs/NeedSheet.tsx:82]
- [x] [Review][Defer] Concurrent multi-user ID suggestion collision [lib/actions/needs.ts:18-23] — deferred, single-user local SQLite app; UNIQUE constraint ensures correctness on save
- [x] [Review][Defer] Type-not-found error swallowed as generic failure [lib/actions/needs.ts:44,83] — deferred, only reachable if type is deleted mid-form-fill
- [x] [Review][Defer] No max-length server validation on `id`, `title`, `tags`, `description` [lib/actions/needs.ts:27-31] — deferred, not in AC scope for this story
- [x] [Review][Defer] `NewNeedButton` has no internal `<Suspense>` self-guard [components/layout/NewNeedButton.tsx:1] — deferred, current usage correct; future reuse risk only
- [x] [Review][Defer] `revalidatePath('/')` only invalidates home route [lib/actions/needs.ts:77] — deferred, no other need-displaying routes currently exist

## Dev Notes

### Current File State — What Exists & What to Preserve

| File | Current State | This Story Action |
|---|---|---|
| `components/layout/AppTopBar.tsx` | `<Button variant="default" size="sm" disabled>New Need</Button>` | UPDATE — replace disabled button with `<NewNeedButton />` |
| `components/needs/NeedsTable.tsx` | `'use client'`; reads sort from URL; empty state with disabled New Need; row click is TODO placeholder | UPDATE — add sheet state + `n` shortcut + URL sync + enable empty-state button |
| `app/page.tsx` | RSC; calls `listNeeds()`; passes `initialNeeds` to NeedsTable | UPDATE — add `listNeedTypes()` + `listStatuses()`; pass to NeedsTable |
| `types/index.ts` | `CreateNeedInput` lacks `id`; `ActionResult<T>` already defined | UPDATE — add `id: string` to `CreateNeedInput` |
| `lib/queries/config.ts` | `listNeedTypes()`, `listStatuses()`, `listNeedTypesWithCount()` — synchronous | DO NOT TOUCH |
| `lib/queries/needs.ts` | `listNeeds()` with cached prepared statements, `NeedRow` type | DO NOT TOUCH |
| `lib/db.ts` | Schema init; `need.seq INTEGER NOT NULL`; `need.id TEXT PRIMARY KEY` | DO NOT TOUCH |
| `components/ui/alert-dialog.tsx` | EXISTS — uses `@base-ui/react/alert-dialog`; exports all sub-components | DO NOT TOUCH — import as-is |
| `components/layout/NewNeedButton.tsx` | DOES NOT EXIST | CREATE |
| `lib/actions/needs.ts` | DOES NOT EXIST | CREATE |
| `components/needs/NeedSheet.tsx` | DOES NOT EXIST | CREATE |
| `components/ui/sheet.tsx` | DOES NOT EXIST | CREATE via `npx shadcn@latest add sheet` |
| `components/ui/select.tsx` | DOES NOT EXIST | CREATE via `npx shadcn@latest add select` |
| `components/ui/textarea.tsx` | DOES NOT EXIST | CREATE via `npx shadcn@latest add textarea` |

### ⚠️ CRITICAL: NeedsTable Restructure Required for NeedSheet Render

The current `NeedsTable.tsx` has an early return for the empty state (`if (initialNeeds.length === 0) return ...`). `NeedSheet` must render in **both** empty and non-empty states. Restructure to render `NeedSheet` unconditionally:

```tsx
export function NeedsTable({ initialNeeds, types, statuses }: NeedsTableProps) {
  // ... hooks, state ...

  return (
    <>
      {initialNeeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16 text-muted-foreground">
          <p className="text-sm">No needs yet.</p>
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            New Need
          </Button>
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          {/* ... table ... */}
        </div>
      )}
      <NeedSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        types={types}
        statuses={statuses}
      />
    </>
  )
}
```

### ⚠️ CRITICAL: Base UI — No `asChild`; Use `render` Prop Instead

This project's shadcn uses the **Nova preset** backed by `@base-ui/react`. The `asChild` prop from Radix UI is **NOT supported**. Use `render={<Component />}` for polymorphic renders.

Example from existing `alert-dialog.tsx`:
```tsx
// ✅ CORRECT — Base UI render prop
<AlertDialogPrimitive.Close render={<Button variant="outline" size="default" />} {...props} />

// ❌ WRONG — Radix-style asChild (not supported)
<AlertDialogPrimitive.Close asChild><Button /></AlertDialogPrimitive.Close>
```

When the installed Sheet/Select/Textarea components arrive from `npx shadcn add`, they will already follow this pattern. Do NOT modify the generated `components/ui/` files.

### ⚠️ CRITICAL: `createNeed` — Transaction Pattern (AD-12)

Use `db.transaction(fn)()` (better-sqlite3's synchronous transaction helper) — NOT raw `BEGIN IMMEDIATE` strings. better-sqlite3 is synchronous; never use `async/await` with DB calls:

```ts
const insertTransaction = db.transaction((input: CreateNeedInput) => {
  // Step 1: get prefix for seq computation
  const type = db.prepare('SELECT prefix FROM need_type WHERE id = ?').get(input.type_id) as { prefix: string } | undefined
  if (!type) throw new Error('Type not found')

  // Step 2: compute seq
  const prefixPattern = new RegExp(`^${type.prefix}_([0-9]+)$`, 'i')
  const idMatch = input.id.match(prefixPattern)
  const extractedSeq = idMatch ? parseInt(idMatch[1], 10) : null

  const maxSeqRow = db.prepare('SELECT MAX(seq) AS max FROM need WHERE type_id = ?').get(input.type_id) as { max: number | null }
  const seq = extractedSeq ?? (maxSeqRow.max ?? 0) + 1

  // Step 3: insert
  const now = new Date().toISOString()
  return db.prepare(`
    INSERT INTO need (id, type_id, title, status, tags, description, seq, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).get(input.id.trim(), input.type_id, input.title.trim(), input.status, input.tags ?? null, input.description ?? null, seq, now, now) as Need
})

try {
  const need = insertTransaction(input)
  revalidatePath('/')
  return { success: true, data: need }
} catch (err: unknown) {
  if (err instanceof Error && err.message.includes('UNIQUE')) {
    return { success: false, error: 'ID already in use', field: 'id' }
  }
  return { success: false, error: 'Failed to create need' }
}
```

`db.transaction(fn)` from better-sqlite3 automatically uses `BEGIN` / `COMMIT` / `ROLLBACK` semantics. For write serialization (AD-12), this is sufficient for single-user local SQLite.

### ⚠️ CRITICAL: `suggestNeedId` — Server Action, Not Query

`suggestNeedId` is a server action (`'use server'`) even though it only reads data. This is because it is called directly from a client component. It cannot be placed in `lib/queries/` (which requires `import 'server-only'` and can only be called from RSC/Server Actions, not client components via `useTransition`).

Call pattern in `NeedSheet`:
```tsx
const [isPending, startTransition] = useTransition()

// On type change:
startTransition(async () => {
  const result = await suggestNeedId(typeId)
  if (result.success) {
    setFormState(prev => ({ ...prev, id: result.data }))
  }
})
```

### ⚠️ CRITICAL: Sheet Open/Close State — URL Coordination

`AppTopBar` is in `layout.tsx` (outside page scope) — it cannot share React state with `NeedsTable`. The solution is **URL coordination**:

- `NewNeedButton` (in AppTopBar): pushes `?new=1` to URL while preserving sort params
- `NeedsTable` (in page): `useEffect` watches `searchParams` for `new === '1'` → opens sheet locally + immediately cleans URL via `router.replace()`
- **Result**: RSC page re-renders once (to pick up `?new=1` then clear it), but sheet state lives in client-side `useState` for the rest of the interaction

```tsx
// In NeedsTable
useEffect(() => {
  if (searchParams.get('new') === '1') {
    setSheetOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('new')
    const cleanUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(cleanUrl)
  }
}, [searchParams, pathname, router])
```

The `router.replace()` (not `push`) avoids adding a history entry just for the `?new=1` trigger.

### ⚠️ CRITICAL: `router.refresh()` After Save

After `createNeed` succeeds, call `router.refresh()` to force Next.js to re-run the RSC `page.tsx` and pass fresh `initialNeeds` to `NeedsTable`. Without this, the table will NOT show the newly created row:

```tsx
// In NeedSheet handleSave, on success:
toast('Saved.')
onOpenChange(false)
router.refresh()    // ← required: re-fetches listNeeds() via RSC
```

### ⚠️ `NeedSheet` — Ctrl+S / ⌘S Shortcut via Ref

`handleSave` is called from a `useEffect` keydown listener. To avoid stale closures, access `handleSave` via a stable ref:

```tsx
const handleSaveRef = useRef<() => void>(() => {})
// Define handleSave as useCallback, assign to ref after each render:
const handleSave = useCallback(async () => { /* ... */ }, [formState, isPending, onOpenChange, router])
useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

useEffect(() => {
  if (!open) return
  function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSaveRef.current()
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [open])
```

### ⚠️ Tags Field — Storage and Form Handling

Tags are stored as a comma-separated string (`need.tags TEXT`). The form field is a plain text input where the user types comma-separated values (e.g., `"config, auth, mvp"`). On save:
- Pass `input.tags` as-is if non-empty; the server trims and stores it
- On display in table: `parseTags()` from `lib/utils.ts` handles splitting

Do NOT implement a chip/token input for Story 3.2 — plain text input is correct per the scope. Story filtering (5.1) will not be affected by this choice.

### ⚠️ ID Field — Monospace Styling

The ID input must be rendered with `font-mono` class per UX-DR4. Add to the `Input` component's `className`:

```tsx
<Input
  id="need-id"
  value={formState.id}
  onChange={e => { setFormState(prev => ({ ...prev, id: e.target.value })); setIdError(null) }}
  className="font-mono"
  aria-invalid={!!idError}
  aria-describedby={idError ? 'need-id-error' : undefined}
/>
{idError && (
  <p id="need-id-error" className="text-xs text-destructive mt-1">{idError}</p>
)}
```

### ⚠️ Status Validation in `createNeed`

The `need.status` column is NOT FK-constrained to `status_value` (deferred from Story 1.2 review). Add application-level validation in `createNeed`:

```ts
const validStatus = db
  .prepare('SELECT COUNT(*) AS count FROM status_value WHERE value = ?')
  .get(input.status) as { count: number }
if (validStatus.count === 0) {
  return { success: false, error: 'Invalid status', field: 'status' }
}
```

### ⚠️ `deferred-work.md` Item to Address

From `deferred-work.md` (Story 1.3 review):
> "Disabled 'New Need' button lacks accessible explanation — Story 3.2 wires the button; add an `aria-describedby` or `title` at that point."

Since Story 3.2 enables the button (no longer disabled), this deferred item is resolved automatically — no tooltip needed for an enabled button.

### shadcn Components Available After Task 1

After running the three `npx shadcn add` commands:
- `sheet` → `components/ui/sheet.tsx` — exports `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`, `SheetTrigger`, `SheetPortal`, `SheetOverlay`
- `select` → `components/ui/select.tsx` — exports `Select`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectTrigger`, `SelectValue`
- `textarea` → `components/ui/textarea.tsx` — exports `Textarea`

All will use `@base-ui/react` primitives (Nova preset). Do NOT use `asChild` in any of their consumers.

### Stack Versions (Confirmed)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first) |
| shadcn/ui | 4.14.0 — Nova/Base UI preset; **`asChild` NOT supported** |
| `@base-ui/react` | ^1.6.0 — `render={<Component />}` for polymorphism |
| better-sqlite3 | ^12.11.1 — **synchronous API; no `async/await` for DB calls** |
| sonner | ^2.0.7 — `import { toast } from 'sonner'`; `toast('Saved.')` (not `toast.success`) for neutral confirm |
| lucide-react | ^1.26.0 |
| Node.js | v22.12.0 |

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — server-only DB | `lib/actions/needs.ts` has `import 'server-only'`; NeedSheet is client component but calls only Server Actions |
| AD-2 — Server Actions own mutations | `createNeed` is a `'use server'` action in `lib/actions/`; `suggestNeedId` is a read-only Server Action (not in queries/ because it needs to be callable from client) |
| AD-4 — ID generation is server-side | `suggestNeedId` computes the suggested ID server-side; `createNeed` validates and computes `seq` server-side |
| AD-8 — No migration needed | No schema changes; `need` table already has `seq`, `description`, `tags` columns |
| AD-9 — `open` always seeded | Status Select pre-set to `'open'` aligns with the seeded default; no risk of empty status |
| AD-12 — Serialized ID transaction | `db.transaction()` wraps `MAX(seq)` + `INSERT` atomically |
| `'use client'` scope | `NeedSheet`, `NewNeedButton` are `'use client'`; `AppTopBar` stays server (delegates to `NewNeedButton`) |
| Server Action return shape | `ActionResult<T>` with `{ success: true, data: T }` or `{ success: false, error: string, field?: string }` — no throws |

### Project Structure After This Story

```
components/layout/NewNeedButton.tsx     ← NEW  ('use client'; URL coord)
lib/actions/needs.ts                    ← NEW  (suggestNeedId, createNeed — 'use server')
components/needs/NeedSheet.tsx          ← NEW  ('use client'; create mode only — edit in Story 3.3)
components/ui/sheet.tsx                 ← NEW  (via npx shadcn add sheet)
components/ui/select.tsx                ← NEW  (via npx shadcn add select)
components/ui/textarea.tsx              ← NEW  (via npx shadcn add textarea)
components/layout/AppTopBar.tsx         ← UPDATE (NewNeedButton instead of disabled Button)
components/needs/NeedsTable.tsx         ← UPDATE (sheet state + URL sync + n shortcut + props)
app/page.tsx                            ← UPDATE (listNeedTypes + listStatuses → NeedsTable)
types/index.ts                          ← UPDATE (id: string added to CreateNeedInput)
```

### Cross-Story Awareness

- **Story 3.3 (Edit and Delete)**: Will extend `NeedSheet` with `mode: 'create' | 'edit'` and an `initialNeed` prop. The row-click TODO in `NeedsTable` (`// TODO Story 3.3`) is preserved. The `createNeed` action exists; Story 3.3 adds `updateNeed` and `deleteNeed` to `lib/actions/needs.ts`.
- **Story 4.1 (Link Counts)**: Replaces `0 AS link_count` in `listNeeds` with real count. No impact on Story 3.2.
- **Story 5.1 (Filter Bar)**: Will add `filterBar` URL params. `NewNeedButton` preserves ALL existing search params (sort + future filter params) when adding `?new=1` — no rework needed.

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.2; FR-4 (create need), FR-7 (unique ID enforcement)
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-4, AD-8, AD-9, AD-12
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — Component Patterns (Need Detail/New Need Sheet, Need Form); Interaction Primitives (`n` shortcut, Ctrl+S, Escape)
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/DESIGN.md` — UX-DR4 (ID chip monospace), Layout (480px sheet width)
- Previous Story: `_bmad-output/implementation-artifacts/3-1-needs-table-with-sortable-columns.md` — NeedsTable current state, stack versions, `import type { NeedRow }` from server-only pattern
- Deferred Work: `_bmad-output/implementation-artifacts/deferred-work.md` — Story 1.3 deferred: disabled button lacks aria-label (resolved by enabling it); Story 1.2 deferred: `need.status` not FK'd to `status_value` (mitigated with application-layer validation in `createNeed`)
- Existing action pattern: `sphinx-needs-clone/lib/actions/types.ts` — `'use server'` + `import 'server-only'`; `ActionResult<T>`; `revalidatePath`; UNIQUE error catch

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-07-28

### Debug Log References

### Completion Notes List

- Created `lib/actions/needs.ts` with `suggestNeedId` (server-side ID suggestion) and `createNeed` (transactional insert with AD-4/AD-12 compliance)
- Created `components/needs/NeedSheet.tsx` — 'use client' side sheet in create mode; form fields in spec order; Ctrl+S shortcut via stable ref; AlertDialog discard guard; duplicate ID inline error
- Created `components/layout/NewNeedButton.tsx` — 'use client' button preserving existing URL params when pushing `?new=1`
- Updated `AppTopBar.tsx` — wrapped `NewNeedButton` in `<Suspense>` (required because `useSearchParams` is used in a layout-level component; without Suspense the `/_not-found` page prerender fails)
- Updated `NeedsTable.tsx` — eliminated early return, restructured as fragment; `sheetOpenRef` pattern for stable `n` shortcut listener; URL `?new=1` coordination; empty-state button enabled
- Updated `app/page.tsx` — added `listNeedTypes()` + `listStatuses()` calls, passed to NeedsTable
- Updated `types/index.ts` — added `id: string` to `CreateNeedInput`
- `npx tsc --noEmit` → exit 0; `npm run build` → exit 0

### File List

- sphinx-needs-clone/components/ui/sheet.tsx (NEW — via shadcn add)
- sphinx-needs-clone/components/ui/select.tsx (NEW — via shadcn add)
- sphinx-needs-clone/components/ui/textarea.tsx (NEW — via shadcn add)
- sphinx-needs-clone/lib/actions/needs.ts (NEW)
- sphinx-needs-clone/components/needs/NeedSheet.tsx (NEW)
- sphinx-needs-clone/components/layout/NewNeedButton.tsx (NEW)
- sphinx-needs-clone/types/index.ts (MODIFIED)
- sphinx-needs-clone/components/layout/AppTopBar.tsx (MODIFIED)
- sphinx-needs-clone/components/needs/NeedsTable.tsx (MODIFIED)
- sphinx-needs-clone/app/page.tsx (MODIFIED)
