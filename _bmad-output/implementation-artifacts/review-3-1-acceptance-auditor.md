# Acceptance Auditor Prompt — Story 3.1 Code Review

You are an Acceptance Auditor. Review the provided diff against the spec below and check for:
violations of acceptance criteria, deviations from spec intent, missing implementation of specified
behavior, contradictions between spec constraints and actual code.

Output findings as a Markdown list. Each finding: one-line title, which AC/constraint it violates,
and evidence from the diff.

---

## Spec — Story 3.1 Acceptance Criteria

**AC1 — Table renders with correct columns**
Given I navigate to `/`, when the page loads, then a table renders with sticky header and columns:
ID (IdChip — monospace, primary color), Type (NeedTypeBadge — color from DB), Title,
Status (StatusBadge), Tags (comma-separated), Links (shows `—` as placeholder).

**AC2 — Empty state**
Given the database contains no needs, when the table renders, then an empty state message
"No needs yet." is shown with a "New Need" button inline.

**AC3 — Skeleton rows on initial load**
Given the database contains needs, when the page first loads, skeleton rows are shown briefly
while data streams from the RSC layer, then replaced with real rows — no layout shift.

**AC4 — Sort by column header click**
Given the table has data, when I click a column header, the table sorts by that column ascending;
clicking again toggles to descending; the active sort column and direction are reflected in URL
search params (`?sort=title&dir=asc`).

**AC5 — Sort persists on refresh**
Given the table is sorted via URL params, when I refresh the page, the same sort order is preserved.

**AC6 — Up to 500 needs without pagination**
Given the table contains up to 500 needs, when the page renders, all rows are visible without
pagination and the table remains responsive.

### Key Spec Constraints
- `NeedRow` type = `Need & { link_count: number }` with `link_count` hardcoded `0` (Story 4.1 upgrades)
- Sort state owned by URL params only — no client-side sort
- `export const dynamic = 'force-dynamic'` required on `app/page.tsx`
- `import 'server-only'` required on `lib/queries/needs.ts`
- Sort column whitelist guards against injection; default = `created_at`
- `parseTags` must handle `null | undefined | string`
- `<thead>` must have `sticky top-0 bg-background z-10`
- Row `tabIndex={0}` + `onKeyDown` groundwork required (keyboard nav AC, Story 3.3)
- "New Need" button in empty state must be `disabled` (Story 3.2 wires it)
- Links column always shows `—`
- No shadcn `table` component — native HTML `<table>` with Tailwind

---

## Diff

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
--- a/sphinx-needs-clone/lib/utils.ts
+++ b/sphinx-needs-clone/lib/utils.ts
@@ -4,3 +4,8 @@
 export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
 }
+
+export function parseTags(tags: string | null | undefined): string[] {
+  if (!tags) return []
+  return tags.split(',').map(t => t.trim()).filter(Boolean)
+}

diff --git a/sphinx-needs-clone/types/index.ts b/sphinx-needs-clone/types/index.ts
--- a/sphinx-needs-clone/types/index.ts
+++ b/sphinx-needs-clone/types/index.ts
@@ -64,6 +64,7 @@
   STATUS: 'status',
   TAG: 'tags',
   SORT: 'sort',
+  DIR: 'dir',
 } as const
```
