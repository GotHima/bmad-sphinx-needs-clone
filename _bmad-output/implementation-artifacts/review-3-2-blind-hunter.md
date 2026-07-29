# Blind Hunter — Story 3.2 Code Review

Invoke the `bmad-review-adversarial-general` skill on this diff:

---

## DIFF: Story 3.2 — Create Need via Side Sheet

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { suggestNeedId, createNeed } from '@/lib/actions/needs'
import type { NeedType, StatusValue } from '@/types'

interface NeedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  types: NeedType[]
  statuses: StatusValue[]
}

interface FormState {
  type_id: number
  id: string
  title: string
  status: string
  tags: string
  description: string
}

function defaultForm(types: NeedType[]): FormState {
  return {
    type_id: types[0]?.id ?? 0,
    id: '',
    title: '',
    status: 'open',
    tags: '',
    description: '',
  }
}

export function NeedSheet({ open, onOpenChange, types, statuses }: NeedSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<FormState>(() => defaultForm(types))
  const [idError, setIdError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  const isDirty =
    formState.title !== '' ||
    formState.tags !== '' ||
    formState.description !== '' ||
    formState.status !== 'open'

  useEffect(() => {
    if (!open) return
    const fresh = defaultForm(types)
    setFormState(fresh)
    setIdError(null)
    if (fresh.type_id) {
      startTransition(async () => {
        const result = await suggestNeedId(fresh.type_id)
        if (result.success) {
          setFormState(prev => ({ ...prev, id: result.data }))
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleTypeChange(typeId: number) {
    setFormState(prev => ({ ...prev, type_id: typeId }))
    setIdError(null)
    startTransition(async () => {
      const result = await suggestNeedId(typeId)
      if (result.success) {
        setFormState(prev => ({ ...prev, id: result.data }))
      }
    })
  }

  function handleClose() {
    if (isDirty) {
      setDiscardOpen(true)
    } else {
      onOpenChange(false)
    }
  }

  function handleDiscard() {
    setDiscardOpen(false)
    onOpenChange(false)
    setFormState(defaultForm(types))
  }

  const handleSave = useCallback(() => {
    if (isPending) return
    startTransition(async () => {
      const result = await createNeed({
        id: formState.id,
        type_id: formState.type_id,
        title: formState.title,
        status: formState.status,
        tags: formState.tags || undefined,
        description: formState.description || undefined,
      })
      if (!result.success) {
        if (result.field === 'id') {
          setIdError(result.error)
        } else {
          toast.error(result.error ?? "Couldn't save. Try again.")
        }
        return
      }
      toast('Saved.')
      onOpenChange(false)
      router.refresh()
    })
  }, [formState, isPending, onOpenChange, router, startTransition])

  const handleSaveRef = useRef(handleSave)
  useEffect(() => {
    handleSaveRef.current = handleSave
  }, [handleSave])

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

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen) handleClose()
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-[480px] flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle>New Need</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-type">Type</Label>
              <Select
                value={String(formState.type_id)}
                onValueChange={(val) => {
                  if (val) handleTypeChange(Number(val))
                }}
              >
                <SelectTrigger id="need-type" className="w-full">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-id">ID</Label>
              <Input
                id="need-id"
                value={formState.id}
                onChange={e => {
                  setFormState(prev => ({ ...prev, id: e.target.value }))
                  setIdError(null)
                }}
                className="font-mono"
                aria-invalid={!!idError || undefined}
                aria-describedby={idError ? 'need-id-error' : undefined}
              />
              {idError && (
                <p id="need-id-error" className="text-xs text-destructive">
                  {idError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-title">Title</Label>
              <Input
                id="need-title"
                value={formState.title}
                onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter title…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(val) => {
                  if (val) setFormState(prev => ({ ...prev, status: val }))
                }}
              >
                <SelectTrigger id="need-status" className="w-full">
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.value}>
                      {s.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-tags">Tags</Label>
              <Input
                id="need-tags"
                value={formState.tags}
                onChange={e => setFormState(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="config, auth, mvp"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="need-description">Description</Label>
              <Textarea
                id="need-description"
                value={formState.description}
                onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description…"
                rows={4}
              />
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
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
            <AlertDialogAction variant="destructive" onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

### MODIFIED: sphinx-needs-clone/types/index.ts

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

### MODIFIED: sphinx-needs-clone/app/page.tsx

```diff
 import { listNeeds } from '@/lib/queries/needs'
+import { listNeedTypes, listStatuses } from '@/lib/queries/config'
 import { NeedsTable } from '@/components/needs/NeedsTable'
 
 export const dynamic = 'force-dynamic'
 
 export default async function HomePage({ searchParams }: HomePageProps) {
   ...
   const needs = listNeeds({ sort, dir })
+  const types = listNeedTypes()
+  const statuses = listStatuses()
 
   return (
     <main className="flex flex-1 flex-col min-h-0">
-      <NeedsTable initialNeeds={needs} />
+      <NeedsTable initialNeeds={needs} types={types} statuses={statuses} />
     </main>
   )
 }
```

### MODIFIED: sphinx-needs-clone/components/layout/AppTopBar.tsx

```diff
+import { Suspense } from 'react'
 import Link from 'next/link'
-import { Button, buttonVariants } from '@/components/ui/button'
+import { buttonVariants, Button } from '@/components/ui/button'
+import { NewNeedButton } from '@/components/layout/NewNeedButton'
 
 export function AppTopBar() {
   return (
     <header ...>
       ...
       <div className="flex items-center gap-2">
-        <Button variant="default" size="sm" disabled>
-          New Need
-        </Button>
+        <Suspense fallback={<Button variant="default" size="sm" disabled>New Need</Button>}>
+          <NewNeedButton />
+        </Suspense>
         <Link href="/settings" ...>Settings</Link>
       </div>
     </header>
   )
 }
```

### MODIFIED: sphinx-needs-clone/components/needs/NeedsTable.tsx (key changes)

```diff
 'use client'
 
+import { useState, useEffect, useRef } from 'react'
 import { useRouter, useSearchParams, usePathname } from 'next/navigation'
 ...
+import type { NeedType, StatusValue } from '@/types'
+import { NeedSheet } from '@/components/needs/NeedSheet'
 
 interface NeedsTableProps {
   initialNeeds: NeedRow[]
+  types: NeedType[]
+  statuses: StatusValue[]
 }
 
-export function NeedsTable({ initialNeeds }: NeedsTableProps) {
+export function NeedsTable({ initialNeeds, types, statuses }: NeedsTableProps) {
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()
 
+  const [sheetOpen, setSheetOpen] = useState(false)
+  const sheetOpenRef = useRef(sheetOpen)
+  useEffect(() => { sheetOpenRef.current = sheetOpen }, [sheetOpen])
+
   const currentSort = ...
 
+  // URL ?new=1 coordination
+  useEffect(() => {
+    if (searchParams.get('new') === '1') {
+      setSheetOpen(true)
+      const params = new URLSearchParams(searchParams.toString())
+      params.delete('new')
+      const cleanUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
+      router.replace(cleanUrl)
+    }
+  }, [searchParams, pathname, router])
+
+  // Global 'n' keyboard shortcut
+  useEffect(() => {
+    function handleGlobalKey(e: KeyboardEvent) {
+      if (sheetOpenRef.current) return
+      const tag = (e.target as HTMLElement).tagName
+      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
+      if ((e.target as HTMLElement).isContentEditable) return
+      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
+        e.preventDefault()
+        setSheetOpen(true)
+      }
+    }
+    window.addEventListener('keydown', handleGlobalKey)
+    return () => window.removeEventListener('keydown', handleGlobalKey)
+  }, [])

-  // Early return for empty state (REMOVED — restructured as fragment)
-  if (initialNeeds.length === 0) {
-    return <div>...<Button disabled>New Need</Button>...</div>
-  }

   return (
-    <div>..table..</div>
+    <>
+      {initialNeeds.length === 0 ? (
+        <div ...>
+          ...
+          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>New Need</Button>
+        </div>
+      ) : (
+        <div>..table..</div>
+      )}
+      <NeedSheet
+        open={sheetOpen}
+        onOpenChange={setSheetOpen}
+        types={types}
+        statuses={statuses}
+      />
+    </>
   )
 }
```
