Invoke the `bmad-review-adversarial-general` skill on this diff:

```diff
diff --git a/sphinx-needs-clone/app/settings/page.tsx b/sphinx-needs-clone/app/settings/page.tsx
--- a/sphinx-needs-clone/app/settings/page.tsx
+++ b/sphinx-needs-clone/app/settings/page.tsx
@@ -1,11 +1,13 @@
-import { listNeedTypesWithCount } from '@/lib/queries/config'
+import { listNeedTypesWithCount, listStatuses } from '@/lib/queries/config'
 import { NeedTypeTable } from '@/components/settings/NeedTypeTable'
+import { StatusList } from '@/components/settings/StatusList'
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
 
 export const dynamic = 'force-dynamic'
 
 export default function SettingsPage() {
   const types = listNeedTypesWithCount()
+  const statuses = listStatuses()
   return (
     <main className="flex flex-1 flex-col p-6">
       <h1 className="text-xl font-semibold mb-6">Settings</h1>
@@ -18,7 +20,7 @@ export default function SettingsPage() {
           <NeedTypeTable initialTypes={types} />
         </TabsContent>
         <TabsContent value="status-values" className="mt-4">
-          <p className="text-sm text-muted-foreground">Status values management — Story 2.2</p>
+          <StatusList initialStatuses={statuses} />
         </TabsContent>
       </Tabs>
     </main>

diff --git a/sphinx-needs-clone/lib/queries/config.ts b/sphinx-needs-clone/lib/queries/config.ts
--- a/sphinx-needs-clone/lib/queries/config.ts
+++ b/sphinx-needs-clone/lib/queries/config.ts
@@ -1,7 +1,7 @@
 import 'server-only'
 
 import db from '@/lib/db'
-import type { NeedType } from '@/types'
+import type { NeedType, StatusValue } from '@/types'
 
 export function listNeedTypes(): NeedType[] {
   return db
@@ -9,6 +9,12 @@ export function listNeedTypes(): NeedType[] {
     .all() as NeedType[]
 }
 
+export function listStatuses(): StatusValue[] {
+  return db
+    .prepare(`SELECT id, value FROM status_value ORDER BY value ASC`)
+    .all() as StatusValue[]
+}
+
 export function listNeedTypesWithCount(): (NeedType & { needs_count: number })[] {

diff --git a/sphinx-needs-clone/lib/actions/statuses.ts b/sphinx-needs-clone/lib/actions/statuses.ts
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/lib/actions/statuses.ts
@@ -0,0 +1,51 @@
+'use server'
+
+import 'server-only'
+import { revalidatePath } from 'next/cache'
+import db from '@/lib/db'
+import type { ActionResult, StatusValue } from '@/types'
+
+export async function createStatus(value: string): Promise<ActionResult<StatusValue>> {
+  const trimmed = value.trim()
+  if (!trimmed) return { success: false, error: 'Status value is required', field: 'value' }
+
+  try {
+    const row = db
+      .prepare(`INSERT INTO status_value (value) VALUES (?) RETURNING id, value`)
+      .get(trimmed) as StatusValue
+    revalidatePath('/settings')
+    return { success: true, data: row }
+  } catch (err: unknown) {
+    if (err instanceof Error && err.message.includes('UNIQUE')) {
+      return { success: false, error: 'A status with this value already exists', field: 'value' }
+    }
+    return { success: false, error: 'Failed to create status' }
+  }
+}
+
+export async function deleteStatus(id: number): Promise<ActionResult<void>> {
+  const row = db
+    .prepare(`SELECT value FROM status_value WHERE id = ?`)
+    .get(id) as { value: string } | undefined
+
+  if (!row) return { success: false, error: 'Status not found' }
+  if (row.value === 'open') {
+    return { success: false, error: 'Cannot delete the default status' }
+  }
+
+  const inUse = db
+    .prepare(`SELECT COUNT(*) AS count FROM need WHERE status = ?`)
+    .get(row.value) as { count: number }
+  if (inUse.count > 0) {
+    return { success: false, error: `In use by ${inUse.count} need(s)` }
+  }
+
+  try {
+    db.prepare(`DELETE FROM status_value WHERE id = ?`).run(id)
+    revalidatePath('/settings')
+    return { success: true, data: undefined }
+  } catch {
+    return { success: false, error: 'Failed to delete status' }
+  }
+}

diff --git a/sphinx-needs-clone/components/needs/StatusBadge.tsx b/sphinx-needs-clone/components/needs/StatusBadge.tsx
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/components/needs/StatusBadge.tsx
@@ -0,0 +1,15 @@
+interface StatusBadgeProps {
+  value: string
+  className?: string
+}
+
+export function StatusBadge({ value, className }: StatusBadgeProps) {
+  return (
+    <span
+      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground${className ? ` ${className}` : ''}`}
+    >
+      {value}
+    </span>
+  )
+}

diff --git a/sphinx-needs-clone/components/settings/StatusList.tsx b/sphinx-needs-clone/components/settings/StatusList.tsx
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/components/settings/StatusList.tsx
@@ -0,0 +1,207 @@
+'use client'
+
+import { useState } from 'react'
+import { Lock, Plus, Trash2 } from 'lucide-react'
+import { toast } from 'sonner'
+import { Button } from '@/components/ui/button'
+import { Input } from '@/components/ui/input'
+import {
+  AlertDialog,
+  AlertDialogAction,
+  AlertDialogCancel,
+  AlertDialogContent,
+  AlertDialogDescription,
+  AlertDialogFooter,
+  AlertDialogHeader,
+  AlertDialogTitle,
+  AlertDialogTrigger,
+} from '@/components/ui/alert-dialog'
+import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
+import { StatusBadge } from '@/components/needs/StatusBadge'
+import { createStatus, deleteStatus } from '@/lib/actions/statuses'
+import type { StatusValue } from '@/types'
+
+interface StatusListProps {
+  initialStatuses: StatusValue[]
+}
+
+export function StatusList({ initialStatuses }: StatusListProps) {
+  const [statuses, setStatuses] = useState<StatusValue[]>(initialStatuses)
+  const [isAdding, setIsAdding] = useState(false)
+  const [newValue, setNewValue] = useState('')
+  const [isPending, setIsPending] = useState(false)
+
+  async function handleAdd() {
+    if (isPending) return
+    setIsPending(true)
+    try {
+      const result = await createStatus(newValue)
+      if (result.success) {
+        setStatuses(prev => [...prev, result.data])
+        setNewValue('')
+        setIsAdding(false)
+        toast('Saved.')
+      } else {
+        toast.error(result.error)
+      }
+    } finally {
+      setIsPending(false)
+    }
+  }
+
+  async function handleDelete(id: number) {
+    const result = await deleteStatus(id)
+    if (result.success) {
+      setStatuses(prev => prev.filter(s => s.id !== id))
+      toast('Deleted.')
+    } else {
+      toast.error(result.error)
+    }
+  }
+
+  return (
+    <div className="space-y-4">
+      <div className="flex items-center justify-between">
+        <p className="text-sm text-muted-foreground">
+          Manage the lifecycle status values available for needs.
+        </p>
+        <Button
+          size="sm"
+          variant="outline"
+          onClick={() => setIsAdding(true)}
+          disabled={isAdding}
+        >
+          <Plus className="size-3.5 mr-1.5" />
+          Add Status
+        </Button>
+      </div>
+
+      <div className="rounded-md border">
+        <table className="w-full text-sm">
+          <thead>
+            <tr className="border-b bg-muted/50">
+              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Value</th>
+              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
+            </tr>
+          </thead>
+          <tbody>
+            {isAdding && (
+              <tr className="border-b bg-muted/20">
+                <td className="px-4 py-2.5">
+                  <Input
+                    autoFocus
+                    placeholder="e.g. closed"
+                    value={newValue}
+                    onChange={e => setNewValue(e.target.value)}
+                    onKeyDown={e => {
+                      if (e.key === 'Enter') void handleAdd()
+                      if (e.key === 'Escape') {
+                        setIsAdding(false)
+                        setNewValue('')
+                      }
+                    }}
+                    className="h-7 text-sm max-w-[200px]"
+                    aria-label="New status value"
+                  />
+                </td>
+                <td className="px-4 py-2.5">
+                  <div className="flex items-center justify-end gap-2">
+                    <Button
+                      size="sm"
+                      onClick={() => void handleAdd()}
+                      disabled={isPending || !newValue.trim()}
+                    >
+                      Save
+                    </Button>
+                    <Button
+                      size="sm"
+                      variant="outline"
+                      onClick={() => {
+                        setIsAdding(false)
+                        setNewValue('')
+                      }}
+                    >
+                      Cancel
+                    </Button>
+                  </div>
+                </td>
+              </tr>
+            )}
+            {statuses.map(status => (
+              <tr key={status.id} className="border-b last:border-b-0">
+                <td className="px-4 py-3">
+                  <div className="flex items-center gap-2">
+                    {status.value === 'open' && (
+                      <Lock className="size-3.5 text-muted-foreground shrink-0" aria-label="Default status — cannot be deleted" />
+                    )}
+                    <StatusBadge value={status.value} />
+                  </div>
+                </td>
+                <td className="px-4 py-3">
+                  <div className="flex items-center justify-end">
+                    {status.value === 'open' ? (
+                      <Tooltip>
+                        <TooltipTrigger render={<span className="cursor-not-allowed" />}>
+                          <Button
+                            size="icon-sm"
+                            variant="ghost"
+                            disabled
+                            aria-label="Cannot delete default status"
+                            className="pointer-events-none"
+                          >
+                            <Trash2 className="size-3.5" />
+                          </Button>
+                        </TooltipTrigger>
+                        <TooltipContent>Cannot delete the default status</TooltipContent>
+                      </Tooltip>
+                    ) : (
+                      <AlertDialog>
+                        <AlertDialogTrigger
+                          render={
+                            <Button
+                              size="icon-sm"
+                              variant="ghost"
+                              aria-label={`Delete ${status.value}`}
+                              className="text-muted-foreground hover:text-destructive"
+                            />
+                          }
+                        >
+                          <Trash2 className="size-3.5" />
+                        </AlertDialogTrigger>
+                        <AlertDialogContent>
+                          <AlertDialogHeader>
+                            <AlertDialogTitle>Delete status?</AlertDialogTitle>
+                            <AlertDialogDescription>
+                              This will permanently delete the <strong>{status.value}</strong> status value.
+                            </AlertDialogDescription>
+                          </AlertDialogHeader>
+                          <AlertDialogFooter>
+                            <AlertDialogCancel>Cancel</AlertDialogCancel>
+                            <AlertDialogAction
+                              variant="destructive"
+                              onClick={() => void handleDelete(status.id)}
+                            >
+                              Delete
+                            </AlertDialogAction>
+                          </AlertDialogFooter>
+                        </AlertDialogContent>
+                      </AlertDialog>
+                    )}
+                  </div>
+                </td>
+              </tr>
+            ))}
+            {statuses.length === 0 && !isAdding && (
+              <tr>
+                <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">
+                  No status values yet.
+                </td>
+              </tr>
+            )}
+          </tbody>
+        </table>
+      </div>
+    </div>
+  )
+}
```
