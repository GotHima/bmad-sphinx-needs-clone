# Acceptance Auditor — Story 3.2 Code Review

You are an Acceptance Auditor. Review the provided diff against the spec file and loaded context docs below.

Check for: violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, contradictions between spec constraints and actual code.

Output findings as a Markdown list. Each finding: one-line title, which AC/constraint it violates, and evidence from the diff.

---

## SPEC: Story 3.2 — Acceptance Criteria

**AC1 — "New Need" button and `n` shortcut open the sheet**
- "New Need" button visible in top bar AND in the empty-state placeholder
- `n` key (when no input focused) opens the sheet
- Both entry points open an empty "New Need" side sheet sliding in from the right

**AC2 — Form fields in correct order with correct types**
- Field order: Type (Select) → ID (Input, monospace, auto-populated) → Title (Input) → Status (Select) → Tags (Input) → Description (Textarea)
- All fields present and correctly typed

**AC3 — Type selection auto-populates the ID field**
- On sheet open: ID auto-populated as `{PREFIX}_{NNN}` for the first type (next available seq)
- On type change: ID updates to suggested ID for the new type

**AC4 — Save creates need and updates table**
- Save button and Ctrl+S / ⌘S create the need
- On success: `toast('Saved.')`, sheet closes, table refreshes
- Server action: `createNeed` → `revalidatePath('/')` + `router.refresh()`

**AC5 — Duplicate ID shows inline error**
- On UNIQUE constraint violation: inline error "ID already in use" displayed below the ID field
- Error cleared on ID field edit

**AC6 — Dirty form guard (AlertDialog)**
- If any field has user content (title, tags, description non-empty OR status ≠ 'open'):
  backdrop click, Escape, Cancel button, or X button → AlertDialog "Discard changes?" with "Keep editing" and "Discard" buttons
- "Discard" closes sheet without saving

**AC7 — Clean form closes immediately**
- If no user-entered content: close attempts close sheet immediately without AlertDialog

---

## SPEC: Dev Notes Constraints

**Architecture constraints:**
- `AppTopBar` is a Server Component in root layout — cannot hold state; URL parameter (`?new=1`) is the coordination mechanism
- `NewNeedButton` must be `'use client'` and wrapped in `<Suspense>` in `AppTopBar` (layout-level `useSearchParams` requires Suspense boundary)
- `NeedSheet` must render outside any conditional early-return in `NeedsTable` to ensure it always mounts
- `suggestNeedId` must be a Server Action (not in `lib/queries/`) — client components cannot call server-only query functions directly
- Use `db.transaction(fn)` (better-sqlite3 sync transaction) — no raw `BEGIN IMMEDIATE` string
- `router.refresh()` required after `createNeed` to re-run RSC and update `initialNeeds`
- Base UI pattern: do NOT use `asChild` prop — use `render={<Component />}` for polymorphic renders

**isDirty definition:** `title !== '' || tags !== '' || description !== '' || status !== 'open'`
- Note: ID field changes alone do NOT make the form "dirty" by spec

**ID suggestion format:** `{PREFIX}_{seq padded to 3 digits}` e.g. `REQ_001`

**UX-DR4:** ID field must use monospace font

---

## DIFF

### NEW FILE: sphinx-needs-clone/lib/actions/needs.ts

```ts
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

    const prefixPattern = new RegExp(`^${type.prefix}_([0-9]+)$`, 'i')
    const idMatch = id.match(prefixPattern)
    const extractedSeq = idMatch ? parseInt(idMatch[1], 10) : null

    const maxRow = db
      .prepare('SELECT MAX(seq) AS max FROM need WHERE type_id = ?')
      .get(input.type_id) as { max: number | null }
    const seq = extractedSeq ?? (maxRow.max ?? 0) + 1

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
```

### NEW FILE: sphinx-needs-clone/components/layout/NewNeedButton.tsx

```tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function NewNeedButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('new', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Button variant="default" size="sm" onClick={handleClick}>
      New Need
    </Button>
  )
}
```

### NEW FILE: sphinx-needs-clone/components/needs/NeedSheet.tsx

```tsx
'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
// ... (full imports as above)

interface FormState {
  type_id: number; id: string; title: string; status: string; tags: string; description: string
}

function defaultForm(types: NeedType[]): FormState {
  return { type_id: types[0]?.id ?? 0, id: '', title: '', status: 'open', tags: '', description: '' }
}

export function NeedSheet({ open, onOpenChange, types, statuses }: NeedSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<FormState>(() => defaultForm(types))
  const [idError, setIdError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  const isDirty =
    formState.title !== '' ||
    formState.tags !== '' ||
    formState.description !== '' ||
    formState.status !== 'open'

  // Reset + suggestNeedId on open
  useEffect(() => {
    if (!open) return
    const fresh = defaultForm(types)
    setFormState(fresh)
    setIdError(null)
    if (fresh.type_id) {
      startTransition(async () => {
        const result = await suggestNeedId(fresh.type_id)
        if (result.success) setFormState(prev => ({ ...prev, id: result.data }))
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleTypeChange(typeId: number) {
    setFormState(prev => ({ ...prev, type_id: typeId }))
    setIdError(null)
    startTransition(async () => {
      const result = await suggestNeedId(typeId)
      if (result.success) setFormState(prev => ({ ...prev, id: result.data }))
    })
  }

  function handleClose() {
    if (isDirty) { setDiscardOpen(true) }
    else { onOpenChange(false) }
  }

  function handleDiscard() {
    setDiscardOpen(false)
    onOpenChange(false)
    setFormState(defaultForm(types))
  }

  const handleSave = useCallback(() => {
    if (isPending) return
    startTransition(async () => {
      const result = await createNeed({ id: formState.id, type_id: formState.type_id,
        title: formState.title, status: formState.status,
        tags: formState.tags || undefined, description: formState.description || undefined })
      if (!result.success) {
        if (result.field === 'id') setIdError(result.error)
        else toast.error(result.error ?? "Couldn't save. Try again.")
        return
      }
      toast('Saved.')
      onOpenChange(false)
      router.refresh()
    })
  }, [formState, isPending, onOpenChange, router, startTransition])

  const handleSaveRef = useRef(handleSave)
  useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

  // Ctrl+S shortcut
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveRef.current() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <Sheet open={open} onOpenChange={(newOpen) => { if (!newOpen) handleClose() }}>
        <SheetContent side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-[480px] flex flex-col gap-0 p-0">
          <SheetHeader ...><SheetTitle>New Need</SheetTitle></SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {/* Type → ID (font-mono, aria-invalid) → Title → Status → Tags → Description */}
          </div>

          <SheetFooter ...>
            <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

### MODIFIED: types/index.ts

```diff
 export interface CreateNeedInput {
+  id: string
   type_id: number
   title: string
   status: string
   tags?: string
   description?: string
 }
```

### MODIFIED: app/page.tsx

```diff
+import { listNeedTypes, listStatuses } from '@/lib/queries/config'
 ...
+  const types = listNeedTypes()
+  const statuses = listStatuses()
-  <NeedsTable initialNeeds={needs} />
+  <NeedsTable initialNeeds={needs} types={types} statuses={statuses} />
```

### MODIFIED: AppTopBar.tsx

```diff
+import { Suspense } from 'react'
+import { NewNeedButton } from '@/components/layout/NewNeedButton'
 ...
-  <Button variant="default" size="sm" disabled>New Need</Button>
+  <Suspense fallback={<Button variant="default" size="sm" disabled>New Need</Button>}>
+    <NewNeedButton />
+  </Suspense>
```

### MODIFIED: NeedsTable.tsx

Key changes:
- Added `types: NeedType[]`, `statuses: StatusValue[]` to props
- Added `sheetOpen` state + `sheetOpenRef` for stable keyboard listener
- Added `useEffect` for URL `?new=1` → `setSheetOpen(true)` + `router.replace()` cleanup
- Added `useEffect` for global `n` keydown (guarded by `sheetOpenRef`, tag, contentEditable)
- Eliminated early return for empty state; restructured as `<>` fragment with conditional branch
- Empty state "New Need" button: `onClick={() => setSheetOpen(true)}` (was `disabled`)
- `NeedSheet` rendered unconditionally at end of fragment
