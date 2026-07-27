# Blind Hunter Prompt — Story 3.1 Code Review

Invoke the `bmad-review-adversarial-general` skill on this diff.

---

```diff
diff --git a/sphinx-needs-clone/lib/queries/needs.ts b/sphinx-needs-clone/lib/queries/needs.ts
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/lib/queries/needs.ts
@@ -0,0 +1,33 @@
+import 'server-only'
+
+import db from '@/lib/db'
+import type { Need } from '@/types'
+
+const VALID_SORT_COLS = ['id', 'type_name', 'title', 'status', 'tags', 'created_at'] as const
+type SortColumn = typeof VALID_SORT_COLS[number]
+
+export type NeedRow = Need & { link_count: number }
+
+export function listNeeds(opts?: { sort?: string; dir?: string }): NeedRow[] {
+  const col: SortColumn = (VALID_SORT_COLS as readonly string[]).includes(opts?.sort ?? '')
+    ? (opts!.sort as SortColumn)
+    : 'created_at'
+  const dir: 'asc' | 'desc' = opts?.dir === 'desc' ? 'desc' : 'asc'
+
+  // type_name is a joined column — must reference nt.name, not n.type_name
+  const orderByExpr = col === 'type_name' ? `nt.name` : `n.${col}`
+
+  return db.prepare(`
+    SELECT
+      n.id, n.type_id, n.title, n.status, n.tags, n.seq,
+      n.created_at, n.updated_at,
+      nt.name   AS type_name,
+      nt.prefix AS type_prefix,
+      nt.color  AS type_color,
+      0         AS link_count
+    FROM need n
+    JOIN need_type nt ON nt.id = n.type_id
+    ORDER BY ${orderByExpr} ${dir}
+  `).all() as NeedRow[]
+}

diff --git a/sphinx-needs-clone/components/needs/IdChip.tsx b/sphinx-needs-clone/components/needs/IdChip.tsx
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/components/needs/IdChip.tsx
@@ -0,0 +1,13 @@
+interface IdChipProps {
+  id: string
+  className?: string
+}
+
+export function IdChip({ id, className }: IdChipProps) {
+  return (
+    <span className={`font-mono text-[12px] font-medium text-primary${className ? ` ${className}` : ''}`}>
+      {id}
+    </span>
+  )
+}

diff --git a/sphinx-needs-clone/components/needs/NeedsTable.tsx b/sphinx-needs-clone/components/needs/NeedsTable.tsx
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/components/needs/NeedsTable.tsx
@@ -0,0 +1,120 @@
+'use client'
+
+import { useRouter, useSearchParams, usePathname } from 'next/navigation'
+import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
+import { SEARCH_PARAM_KEYS } from '@/types'
+import type { Need } from '@/types'
+import { NeedTypeBadge } from '@/components/needs/NeedTypeBadge'
+import { StatusBadge } from '@/components/needs/StatusBadge'
+import { IdChip } from '@/components/needs/IdChip'
+import { Button } from '@/components/ui/button'
+import { parseTags } from '@/lib/utils'
+
+type NeedRow = Need & { link_count: number }
+
+interface NeedsTableProps {
+  initialNeeds: NeedRow[]
+}
+
+const SORTABLE_COLS = [
+  { key: 'id', label: 'ID' },
+  { key: 'type_name', label: 'Type' },
+  { key: 'title', label: 'Title' },
+  { key: 'status', label: 'Status' },
+  { key: 'tags', label: 'Tags' },
+] as const
+
+type SortableColKey = typeof SORTABLE_COLS[number]['key']
+
+export function NeedsTable({ initialNeeds }: NeedsTableProps) {
+  const router = useRouter()
+  const pathname = usePathname()
+  const searchParams = useSearchParams()
+
+  const currentSort = searchParams.get(SEARCH_PARAM_KEYS.SORT) ?? 'created_at'
+  const currentDir = (searchParams.get(SEARCH_PARAM_KEYS.DIR) ?? 'asc') as 'asc' | 'desc'
+
+  function handleSort(col: SortableColKey) {
+    const newDir: 'asc' | 'desc' = currentSort === col && currentDir === 'asc' ? 'desc' : 'asc'
+    const params = new URLSearchParams(searchParams.toString())
+    params.set(SEARCH_PARAM_KEYS.SORT, col)
+    params.set(SEARCH_PARAM_KEYS.DIR, newDir)
+    router.push(`${pathname}?${params.toString()}`)
+  }
+
+  function SortIcon({ col }: { col: SortableColKey }) {
+    if (currentSort !== col) {
+      return <ChevronsUpDown className="size-3 ml-1 inline text-muted-foreground" />
+    }
+    return currentDir === 'asc'
+      ? <ChevronUp className="size-3 ml-1 inline" />
+      : <ChevronDown className="size-3 ml-1 inline" />
+  }
+
+  if (initialNeeds.length === 0) {
+    return (
+      <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16 text-muted-foreground">
+        <p className="text-sm">No needs yet.</p>
+        {/* Story 3.2 enables this button */}
+        <Button variant="outline" size="sm" disabled>
+          New Need
+        </Button>
+      </div>
+    )
+  }
+
+  return (
+    <div className="overflow-auto flex-1">
+      <table className="w-full text-sm border-collapse">
+        <thead className="sticky top-0 bg-background z-10 border-b border-border">
+          <tr>
+            {SORTABLE_COLS.map(col => (
+              <th
+                key={col.key}
+                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
+                onClick={() => handleSort(col.key)}
+              >
+                {col.label}
+                <SortIcon col={col.key} />
+              </th>
+            ))}
+            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
+              Links
+            </th>
+          </tr>
+        </thead>
+        <tbody>
+          {initialNeeds.map(need => {
+            const tags = parseTags(need.tags)
+            return (
+              <tr
+                key={need.id}
+                className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
+                tabIndex={0}
+                onClick={() => { /* TODO Story 3.2: open NeedSheet for need */ }}
+                onKeyDown={e => { if (e.key === 'Enter') { /* TODO Story 3.2: open NeedSheet for need */ } }}
+              >
+                <td className="px-3 py-2">
+                  <IdChip id={need.id} />
+                </td>
+                <td className="px-3 py-2">
+                  {need.type_name && need.type_color ? (
+                    <NeedTypeBadge name={need.type_name} color={need.type_color} />
+                  ) : null}
+                </td>
+                <td className="px-3 py-2">{need.title}</td>
+                <td className="px-3 py-2">
+                  <StatusBadge value={need.status} />
+                </td>
+                <td className="px-3 py-2 text-muted-foreground">
+                  {tags.length > 0 ? tags.join(', ') : '—'}
+                </td>
+                <td className="px-3 py-2 text-muted-foreground">—</td>
+              </tr>
+            )
+          })}
+        </tbody>
+      </table>
+    </div>
+  )
+}

diff --git a/sphinx-needs-clone/app/loading.tsx b/sphinx-needs-clone/app/loading.tsx
new file mode 100644
--- /dev/null
+++ b/sphinx-needs-clone/app/loading.tsx
@@ -0,0 +1,32 @@
+export default function Loading() {
+  return (
+    <main className="flex flex-1 flex-col min-h-0">
+      <div className="overflow-auto flex-1">
+        <table className="w-full text-sm border-collapse">
+          <thead className="sticky top-0 bg-background z-10 border-b border-border">
+            <tr>
+              {['ID', 'Type', 'Title', 'Status', 'Tags', 'Links'].map(col => (
+                <th key={col} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
+                  {col}
+                </th>
+              ))}
+            </tr>
+          </thead>
+          <tbody>
+            {Array.from({ length: 5 }).map((_, i) => (
+              <tr key={i} className="border-b border-border">
+                <td className="px-3 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
+                <td className="px-3 py-2"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
+                <td className="px-3 py-2"><div className="h-4 w-48 bg-muted rounded animate-pulse" /></td>
+                <td className="px-3 py-2"><div className="h-4 w-14 bg-muted rounded animate-pulse" /></td>
+                <td className="px-3 py-2"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
+                <td className="px-3 py-2"><div className="h-4 w-8 bg-muted rounded animate-pulse" /></td>
+              </tr>
+            ))}
+          </tbody>
+        </table>
+      </div>
+    </main>
+  )
+}

diff --git a/sphinx-needs-clone/app/page.tsx b/sphinx-needs-clone/app/page.tsx
index 3b6468b..14c0806 100644
--- a/sphinx-needs-clone/app/page.tsx
+++ b/sphinx-needs-clone/app/page.tsx
@@ -1,4 +1,8 @@
 import { SEARCH_PARAM_KEYS } from '@/types'
+import { listNeeds } from '@/lib/queries/needs'
+import { NeedsTable } from '@/components/needs/NeedsTable'
+
+export const dynamic = 'force-dynamic'
 
 interface HomePageProps {
   searchParams: Promise<{ [key: string]: string | string[] | undefined }>
@@ -6,10 +10,16 @@ interface HomePageProps {
 
 export default async function HomePage({ searchParams }: HomePageProps) {
   const params = await searchParams
-  void params
-  void SEARCH_PARAM_KEYS // preserved for Story 3.1 — do not remove
+  const rawSort = params[SEARCH_PARAM_KEYS.SORT]
+  const rawDir = params[SEARCH_PARAM_KEYS.DIR]
+  const sort = typeof rawSort === 'string' ? rawSort : undefined
+  const dir = typeof rawDir === 'string' ? rawDir : undefined
+
+  const needs = listNeeds({ sort, dir })
 
   return (
-    <main className="flex flex-1 flex-col" />
+    <main className="flex flex-1 flex-col min-h-0">
+      <NeedsTable initialNeeds={needs} />
+    </main>
   )
 }

diff --git a/sphinx-needs-clone/lib/utils.ts b/sphinx-needs-clone/lib/utils.ts
index bd0c391..381ca46 100644
--- a/sphinx-needs-clone/lib/utils.ts
+++ b/sphinx-needs-clone/lib/utils.ts
@@ -4,3 +4,8 @@ import { twMerge } from "tailwind-merge"
 export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
 }
+
+export function parseTags(tags: string | null | undefined): string[] {
+  if (!tags) return []
+  return tags.split(',').map(t => t.trim()).filter(Boolean)
+}

diff --git a/sphinx-needs-clone/types/index.ts b/sphinx-needs-clone/types/index.ts
index dbbcc9d..954586f 100644
--- a/sphinx-needs-clone/types/index.ts
+++ b/sphinx-needs-clone/types/index.ts
@@ -64,6 +64,7 @@ export const SEARCH_PARAM_KEYS = {
   STATUS: 'status',
   TAG: 'tags',
   SORT: 'sort',
+  DIR: 'dir',
 } as const
```
