---
baseline_commit: b5de60afcbf79bd48556079d3c828bcd37447afa
---

# Story 3.1: Needs Table with Sortable Columns

Status: done

## Story

As a user,
I want to see all my needs in a sortable table on the home page,
So that I can get an overview of everything in the system and navigate to any need.

## Acceptance Criteria

**AC1 — Table renders with correct columns**
**Given** I navigate to `/`
**When** the page loads
**Then** a table renders with sticky header and columns: ID (`IdChip` — monospace, primary color), Type (`NeedTypeBadge` — color from DB), Title, Status (`StatusBadge`), Tags (comma-separated), Links (shows `—` as placeholder)

**AC2 — Empty state**
**Given** the database contains no needs
**When** the table renders
**Then** an empty state message "No needs yet." is shown with a "New Need" button inline

**AC3 — Skeleton rows on initial load**
**Given** the database contains needs
**When** the page first loads
**Then** skeleton rows are shown briefly while data streams from the RSC layer, then replaced with real rows — no layout shift

**AC4 — Sort by column header click**
**Given** the table has data
**When** I click a column header
**Then** the table sorts by that column ascending; clicking again toggles to descending; the active sort column and direction are reflected in URL search params (`?sort=title&dir=asc`)

**AC5 — Sort persists on refresh**
**Given** the table is sorted via URL params
**When** I refresh the page
**Then** the same sort order is preserved

**AC6 — Up to 500 needs without pagination**
**Given** the table contains up to 500 needs
**When** the page renders
**Then** all rows are visible without pagination and the table remains responsive

## Tasks / Subtasks

- [x] Task 1 — Add `parseTags` utility to `lib/utils.ts` (AC: 1; deferred from Story 1.2)
  - [x] Add `export function parseTags(tags: string | null | undefined): string[]` — returns `[]` if null/empty, else splits on `,` and trims each segment, filters empty strings

- [x] Task 2 — Add `DIR` key to `SEARCH_PARAM_KEYS` in `types/index.ts` (AC: 4, 5)
  - [x] Add `DIR: 'dir'` to the `SEARCH_PARAM_KEYS` constant alongside the existing `SORT: 'sort'`

- [x] Task 3 — Create `lib/queries/needs.ts` (AC: 1, 4, 5, 6)
  - [x] `import 'server-only'` at top
  - [x] Import `db` from `@/lib/db` and `Need` from `@/types`
  - [x] Define `VALID_SORT_COLS` whitelist: `['id', 'title', 'status', 'tags', 'created_at']`
  - [x] `listNeeds(opts?: { sort?: string; dir?: string }): (Need & { link_count: number })[]`
    - Whitelist `sort` against `VALID_SORT_COLS`; default to `'created_at'` if missing or invalid
    - Whitelist `dir` to `'asc' | 'desc'`; default to `'asc'` if anything else
    - JOIN `need_type nt ON nt.id = n.type_id` — fetch `type_name`, `type_prefix`, `type_color`
    - Hardcode `0 AS link_count` — Story 4.1 replaces with real count via LEFT JOIN on `need_link`
    - `ORDER BY n.${col} ${dir}` — safe only because both values are whitelisted
    - No LIMIT — returns all rows (NFR-2: ≤ 500 rows in MVP)

- [x] Task 4 — Create `components/needs/IdChip.tsx` (UX-DR4, AC: 1)
  - [x] No `'use client'` — purely presentational; usable in RSC and client components
  - [x] Props: `id: string`, `className?: string`
  - [x] Classes: `font-mono text-[12px] font-medium text-primary` — uses Tailwind token, no inline style

- [x] Task 5 — Create `components/needs/NeedsTable.tsx` (AC: 1–6)
  - [x] `'use client'` directive
  - [x] Import `useRouter`, `useSearchParams`, `usePathname` from `'next/navigation'`
  - [x] Import `SEARCH_PARAM_KEYS`, `Need`, `NeedType` from `'@/types'`
  - [x] Import `NeedTypeBadge`, `StatusBadge`, `IdChip`, `Button` from their respective paths
  - [x] Import `ChevronUp`, `ChevronDown`, `ChevronsUpDown` from `'lucide-react'`
  - [x] Import `parseTags` from `'@/lib/utils'`
  - [x] Props: `initialNeeds: (Need & { link_count: number })[]`, `types: NeedType[]`
  - [x] Read sort state from URL: `searchParams.get(SEARCH_PARAM_KEYS.SORT) ?? 'created_at'` and `searchParams.get(SEARCH_PARAM_KEYS.DIR) ?? 'asc'`
  - [x] `handleSort(col: string)`: if `currentSort === col`, toggle dir; else set col with `'asc'`; push to `router`
  - [x] Table structure with `<div className="overflow-auto flex-1">` wrapping `<table className="w-full text-sm">`
  - [x] `<thead>` with `className="sticky top-0 bg-background z-10 border-b border-border"`
  - [x] Column headers: ID, Type, Title, Status, Tags (all sortable); Links (not sortable — placeholder)
  - [x] Sort indicator: active column shows `ChevronUp` (asc) or `ChevronDown` (desc); inactive shows `ChevronsUpDown` muted
  - [x] Empty state (`initialNeeds.length === 0`): centered message "No needs yet." + disabled `<Button>New Need</Button>`
  - [x] Row: `className="border-b border-border cursor-pointer hover:bg-muted/50"`, `onClick` is no-op placeholder comment `// TODO Story 3.2: open NeedSheet`
  - [x] Tags cell: `parseTags(need.tags).join(', ')` or em-dash if empty
  - [x] Links cell: always `—`

- [x] Task 6 — Create `app/loading.tsx` (AC: 3)
  - [x] No `'use client'` needed — static skeleton
  - [x] Render skeleton matching exact table layout: `<main>` → `<div className="overflow-auto flex-1">` → `<table>` with sticky `<thead>` (same classes as real table) + 5 skeleton body rows
  - [x] Skeleton cells: `<div className="h-4 bg-muted rounded animate-pulse">` with varying widths per column

- [x] Task 7 — Update `app/page.tsx` (AC: 1–6)
  - [x] Add `export const dynamic = 'force-dynamic'`
  - [x] Import `listNeeds` from `'@/lib/queries/needs'`, `listNeedTypes` from `'@/lib/queries/config'`
  - [x] Import `NeedsTable` from `'@/components/needs/NeedsTable'`
  - [x] Read `sort` and `dir` from `params` using `SEARCH_PARAM_KEYS.SORT` and `SEARCH_PARAM_KEYS.DIR` with `typeof x === 'string'` guard
  - [x] Call `listNeeds({ sort, dir })` and `listNeedTypes()` synchronously
  - [x] Render `<main className="flex flex-1 flex-col min-h-0"><NeedsTable initialNeeds={needs} types={types} /></main>`
  - [x] Remove `void params` and `void SEARCH_PARAM_KEYS` placeholders

- [x] Task 8 — Verify all ACs
  - [x] `npm run dev` from `sphinx-needs-clone/`; navigate to `/`
  - [x] Verify 6 columns render with correct badge components; Links column shows `—`
  - [x] Add needs via `/settings` need types first, then verify table rows appear
  - [x] Verify empty state "No needs yet." + disabled New Need button when DB empty
  - [x] Verify skeleton rows appear briefly (use Network throttle in DevTools → Fast 3G)
  - [x] Click column headers → URL updates to `?sort=<col>&dir=asc`; clicking same header again toggles to `dir=desc`
  - [x] Refresh with sort params in URL → same sort preserved
  - [x] `npx tsc --noEmit` → exit 0
  - [x] `npm run build` → exit 0

### Review Findings

- [x] [Review][Patch] NeedRow type re-declared locally — import `type { NeedRow }` from `@/lib/queries/needs` instead of duplicating [sphinx-needs-clone/components/needs/NeedsTable.tsx:13]
- [x] [Review][Patch] SortIcon defined inside NeedsTable body — move outside component to prevent remount on every parent render [sphinx-needs-clone/components/needs/NeedsTable.tsx:45]
- [x] [Review][Patch] aria-sort missing on sortable column headers — add `aria-sort` attribute to communicate sort state to screen readers [sphinx-needs-clone/components/needs/NeedsTable.tsx:71-79]
- [x] [Review][Patch] IdChip manual class concatenation — replace with `cn()` from `@/lib/utils` for consistency [sphinx-needs-clone/components/needs/IdChip.tsx:8]
- [x] [Review][Patch] db.prepare() called per listNeeds() invocation — cache prepared statement at module scope [sphinx-needs-clone/lib/queries/needs.ts:20]
- [x] [Review][Patch] currentDir unsafe type cast — normalize with `=== 'desc' ? 'desc' : 'asc'` pattern instead of `as` cast [sphinx-needs-clone/components/needs/NeedsTable.tsx:35]
- [x] [Review][Patch] Array URL param discarded instead of first value extracted — use `Array.isArray(rawSort) ? rawSort[0] : rawSort` in page.tsx [sphinx-needs-clone/app/page.tsx:13-14]
- [x] [Review][Defer] loading.tsx column structure duplicated from NeedsTable — deferred, pre-existing structural coupling; extract shared constant in future refactor story [sphinx-needs-clone/app/loading.tsx]

## Dev Notes

### Current File State — What Exists & What to Preserve

| File | Current State | This Story Action |
|---|---|---|
| `app/page.tsx` | Stub: `await searchParams`, `void SEARCH_PARAM_KEYS` placeholder, empty `<main>` | UPDATE — wire `listNeeds`, `NeedsTable`, add `force-dynamic` |
| `types/index.ts` | `SEARCH_PARAM_KEYS` has `SORT: 'sort'` but no `DIR` | UPDATE — add `DIR: 'dir'` only; preserve all other exports |
| `lib/utils.ts` | Only `cn()` utility | UPDATE — add `parseTags()` at end |
| `lib/queries/config.ts` | `listNeedTypes()`, `listStatuses()`, `listNeedTypesWithCount()` — all synchronous | DO NOT TOUCH |
| `lib/db.ts` | Full schema with `need`, `need_link`, `need_type`, `status_value` tables | DO NOT TOUCH |
| `components/needs/NeedTypeBadge.tsx` | EXISTS — presentational, `style={{ backgroundColor: color }}`, uppercase 11px semibold | DO NOT TOUCH |
| `components/needs/StatusBadge.tsx` | EXISTS — presentational, `bg-muted text-muted-foreground`, 11px medium | DO NOT TOUCH |
| `components/layout/AppTopBar.tsx` | `<Button disabled>New Need</Button>` (placeholder) | DO NOT TOUCH — Story 3.2 wires both top bar + empty state buttons |
| `app/layout.tsx` | `<div className="flex flex-1 flex-col min-h-0 overflow-auto">` is the scroll container | DO NOT TOUCH |
| `lib/queries/needs.ts` | DOES NOT EXIST | CREATE |
| `components/needs/IdChip.tsx` | DOES NOT EXIST | CREATE |
| `components/needs/NeedsTable.tsx` | DOES NOT EXIST | CREATE |
| `app/loading.tsx` | DOES NOT EXIST | CREATE |

### ⚠️ CRITICAL: Sticky Header and the Scroll Container

`app/layout.tsx:36` has `<div className="flex flex-1 flex-col min-h-0 overflow-auto">` as the single scroll container. The `<main>` in `page.tsx` renders inside it.

**Sticky `<thead>` works correctly in this layout** because the sticky positioning is relative to the nearest `overflow` ancestor — which IS this div. Use:

```tsx
<thead className="sticky top-0 bg-background z-10 border-b border-border">
```

The deferred work from Story 1.3 warns about `overflow-auto` clipping portal-based overlays (dropdowns, tooltips). This story has **no portals** — the warning does not apply here. Acknowledge it in the file list section so future stories (3.2 with NeedSheet, 5.1 with FilterBar dropdowns) are aware.

### ⚠️ CRITICAL: SQL Injection Prevention for Sort Column

`listNeeds` uses URL-controlled values to build ORDER BY. **Always whitelist before interpolating:**

```ts
const VALID_SORT_COLS = ['id', 'title', 'status', 'tags', 'created_at'] as const
type SortColumn = typeof VALID_SORT_COLS[number]

const col: SortColumn = (VALID_SORT_COLS as readonly string[]).includes(opts?.sort ?? '')
  ? (opts!.sort as SortColumn)
  : 'created_at'
const dir: 'asc' | 'desc' = opts?.dir === 'desc' ? 'desc' : 'asc'
```

SQLite does NOT support binding column names as params — never use `?` for ORDER BY. The whitelist above makes string interpolation safe.

### ⚠️ `listNeeds` — Full Query Reference

```ts
'use server' // NOT needed — this is a query file, not an action file. DO NOT add 'use server'.
import 'server-only'
import db from '@/lib/db'
import type { Need } from '@/types'

const VALID_SORT_COLS = ['id', 'title', 'status', 'tags', 'created_at'] as const
type SortColumn = typeof VALID_SORT_COLS[number]

export type NeedRow = Need & { link_count: number }

export function listNeeds(opts?: { sort?: string; dir?: string }): NeedRow[] {
  const col: SortColumn = (VALID_SORT_COLS as readonly string[]).includes(opts?.sort ?? '')
    ? (opts!.sort as SortColumn)
    : 'created_at'
  const dir: 'asc' | 'desc' = opts?.dir === 'desc' ? 'desc' : 'asc'

  return db.prepare(`
    SELECT
      n.id, n.type_id, n.title, n.status, n.tags, n.seq,
      n.created_at, n.updated_at,
      nt.name   AS type_name,
      nt.prefix AS type_prefix,
      nt.color  AS type_color,
      0         AS link_count
    FROM need n
    JOIN need_type nt ON nt.id = n.type_id
    ORDER BY n.${col} ${dir}
  `).all() as NeedRow[]
}
```

**Story 4.1 upgrade path**: Replace `0 AS link_count` with `COUNT(nl.to_id) AS link_count` and add `LEFT JOIN need_link nl ON nl.from_id = n.id` + `GROUP BY n.id`. No other changes needed.

### ⚠️ `parseTags` Utility — Exact Spec (Deferred from Story 1.2)

```ts
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}
```

Add to `lib/utils.ts` after the `cn()` function. This resolves the Story 1.2 deferred: "`Need.tags` null parsing — `string | null` with no canonical null-safe utility. All call sites must guard; add a utility function in `lib/utils.ts` when the first consumer is written."

### ⚠️ `IdChip` Component — Exact Spec (UX-DR4)

```tsx
interface IdChipProps {
  id: string
  className?: string
}

export function IdChip({ id, className }: IdChipProps) {
  return (
    <span className={`font-mono text-[12px] font-medium text-primary${className ? ` ${className}` : ''}`}>
      {id}
    </span>
  )
}
```

No `'use client'` — purely presentational. `text-primary` resolves to `#2563EB` (light) / `#60A5FA` (dark) from the brand theme (UX-DR1, UX-DR4). No inline style needed — unlike `NeedTypeBadge` which uses a DB-stored hex color (AD-7), the primary color is a fixed design token.

### ⚠️ `NeedsTable` — Sort URL State Pattern

Sort is **server-side only** — NeedsTable pushes URL params → RSC re-renders with fresh sorted data → passes new `initialNeeds`. Do NOT implement client-side sort (would create dual source of truth and break AC5 refresh behavior).

```tsx
// Read current sort from URL
const searchParams = useSearchParams()
const currentSort = searchParams.get(SEARCH_PARAM_KEYS.SORT) ?? 'created_at'
const currentDir = (searchParams.get(SEARCH_PARAM_KEYS.DIR) ?? 'asc') as 'asc' | 'desc'

// Handler writes back to URL
function handleSort(col: string) {
  const newDir: 'asc' | 'desc' = currentSort === col && currentDir === 'asc' ? 'desc' : 'asc'
  const params = new URLSearchParams(searchParams.toString())
  params.set(SEARCH_PARAM_KEYS.SORT, col)
  params.set(SEARCH_PARAM_KEYS.DIR, newDir)
  router.push(`${pathname}?${params.toString()}`)
}
```

Sort indicator per column header:
- Active column, asc → `<ChevronUp className="size-3 ml-1 inline" />`
- Active column, desc → `<ChevronDown className="size-3 ml-1 inline" />`
- Inactive → `<ChevronsUpDown className="size-3 ml-1 inline text-muted-foreground" />`

### ⚠️ `app/page.tsx` — Target State After Update

```tsx
import { SEARCH_PARAM_KEYS } from '@/types'
import { listNeeds } from '@/lib/queries/needs'
import { listNeedTypes } from '@/lib/queries/config'
import { NeedsTable } from '@/components/needs/NeedsTable'

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const sort = typeof params[SEARCH_PARAM_KEYS.SORT] === 'string'
    ? params[SEARCH_PARAM_KEYS.SORT]
    : undefined
  const dir = typeof params[SEARCH_PARAM_KEYS.DIR] === 'string'
    ? params[SEARCH_PARAM_KEYS.DIR]
    : undefined

  const needs = listNeeds({ sort, dir })
  const types = listNeedTypes()

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <NeedsTable initialNeeds={needs} types={types} />
    </main>
  )
}
```

- Remove the `void params` and `void SEARCH_PARAM_KEYS` placeholders.
- `types` passed as prop even though `NeedsRow` already contains joined type fields. Useful for any type-lookup the component may need (e.g., building a type map for future filter integration in Story 5.1). If unused in NeedsTable, TypeScript will warn — remove the prop if tsc flags it.
- `export const dynamic = 'force-dynamic'` prevents Next.js from statically rendering and caching the page, ensuring sort params are always read fresh (same pattern as `app/settings/page.tsx`).

### ⚠️ Empty State — "New Need" Button

The empty state "New Need" button must remain `disabled` in this story. The top bar "New Need" button also remains disabled. **Both are wired in Story 3.2** when `NeedSheet` is implemented:

```tsx
{/* Empty state — Story 3.2 enables this button */}
<Button variant="outline" size="sm" disabled>
  New Need
</Button>
```

Do NOT enable or wire this button in Story 3.1.

### ⚠️ No shadcn Table Component — Use Native HTML

The shadcn `table` component is **NOT installed** in `components/ui/`. Do NOT run `npx shadcn add table`. Build with native `<table>` HTML elements styled with Tailwind — this is standard practice for this project's table needs. Structure:

```tsx
<div className="overflow-auto flex-1">
  <table className="w-full text-sm border-collapse">
    <thead className="sticky top-0 bg-background z-10 border-b border-border">
      <tr>
        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
          {/* column header with sort button */}
        </th>
      </tr>
    </thead>
    <tbody>
      {needs.map(need => (
        <tr
          key={need.id}
          className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => { /* TODO Story 3.2: open NeedSheet for need */ }}
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') { /* same as onClick */ } }}
        >
          {/* cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Note `tabIndex={0}` and `onKeyDown` on rows — required by UX-DR14 (WCAG 2.2 AA; `Enter` on focused row opens detail) and UX-DR13 (keyboard shortcut: `Enter` on focused row). The `↑`/`↓` row navigation (UX-DR13) is a Story 3.3 concern but the `tabIndex` groundwork should be laid here.

### ⚠️ Skeleton Matching Table Layout (app/loading.tsx)

The skeleton must match the real table's structure to avoid layout shift (AC3). Skeleton cell widths per column:
- ID: `w-16` (short IDs like `REQ_001`)
- Type: `w-12` (badge)
- Title: `w-48` (longer)
- Status: `w-14` (short badge)
- Tags: `w-24`
- Links: `w-8`

### shadcn Components Available for This Story

NO new `npx shadcn add` required. Only `button` is needed and it's already installed:
- `button` ✅ — from `@/components/ui/button` (`Button` import)

Components NOT needed for Story 3.1: `alert-dialog`, `tooltip`, `input`, `sheet`.

### Stack Versions (Confirmed from Stories 1.1–2.2)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first, no `tailwind.config.js`) |
| shadcn/ui | 4.14.0 — Base UI (Nova preset); **`asChild` NOT supported** |
| @base-ui/react | ^1.6.0 |
| better-sqlite3 | ^12.11.1 — **synchronous API only; no async/await** |
| lucide-react | ^1.26.0 — `ChevronUp`, `ChevronDown`, `ChevronsUpDown` |
| sonner | installed — `toast` from `'sonner'` (not used in this story) |
| Node.js | v22.12.0 |

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — server-only DB | `lib/queries/needs.ts` carries `import 'server-only'` |
| AD-2 — RSC pages own reads | `app/page.tsx` calls `listNeeds()` directly; no fetch, no Route Handler |
| AD-5 — URL search params own sort state | Sort state in `SEARCH_PARAM_KEYS.SORT` + `SEARCH_PARAM_KEYS.DIR` URL params; NeedsTable reads URL, never independent React state |
| AD-13 — `SEARCH_PARAM_KEYS` constant | `SORT` already defined; `DIR` added in Task 2; both imported verbatim in `NeedsTable` and `page.tsx` — no string literals |
| `'use client'` scope | Only `NeedsTable.tsx` is `'use client'`; `IdChip`, `app/loading.tsx`, `app/page.tsx` are RSC |
| TypeScript strict | `VALID_SORT_COLS` + `SortColumn` type for whitelist; `NeedRow` type for query return; no `any` |
| File naming | `NeedsTable.tsx`, `IdChip.tsx` — PascalCase; `needs.ts` — kebab-case; `loading.tsx` — Next.js convention |

### Project Structure Notes

Files created/modified in this story align with the architecture source tree:
```
components/needs/IdChip.tsx         ← NEW  (UX-DR4)
components/needs/NeedsTable.tsx     ← NEW  (UX-DR8; 'use client')
lib/queries/needs.ts                ← NEW  (listNeeds — AD-2)
lib/utils.ts                        ← UPDATE (parseTags added)
types/index.ts                      ← UPDATE (DIR key added to SEARCH_PARAM_KEYS)
app/page.tsx                        ← UPDATE (full RSC implementation)
app/loading.tsx                     ← NEW  (skeleton — AC3)
```

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.1; FR-11 (sortable), FR-13 (columns), FR-14 (row click → detail); UX-DR4, UX-DR8, UX-DR12, UX-DR13, UX-DR14
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-5, AD-13; source tree seed confirms `NeedsTable.tsx`, `lib/queries/needs.ts`
- Story 2.2: `_bmad-output/implementation-artifacts/2-2-status-values-management-in-settings.md` — stack versions, Base UI `asChild` incompatibility, `import 'server-only'` pattern, synchronous better-sqlite3, `force-dynamic` pattern
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` — Story 1.2 `parseTags` deferral (resolved in Task 1); Story 1.3 `overflow-auto` clip warning (documented in sticky header section)

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-07-27

### Debug Log References

- TypeScript narrowing fix: `typeof params[key] === 'string'` ternary doesn't narrow when same index is accessed twice; fixed by assigning to `rawSort`/`rawDir` first.
- `VALID_SORT_COLS` extended to include `'type_name'` (not in original story spec but required for all 5 columns to sort correctly); added `orderByExpr` special-case mapping `type_name` → `nt.name`.
- `NeedType` import/prop removed from `NeedsTable` — unused; `NeedRow` inlined as local type to avoid `import type` from server-only module in client component.

### Completion Notes List

- Task 1: Added `parseTags(tags: string | null | undefined): string[]` to `lib/utils.ts` — resolves Story 1.2 deferred item.
- Task 2: Added `DIR: 'dir'` to `SEARCH_PARAM_KEYS` in `types/index.ts`.
- Task 3: Created `lib/queries/needs.ts` with `listNeeds()` — `import 'server-only'`, whitelist-guarded ORDER BY, `0 AS link_count` placeholder, `type_name` column supported via `nt.name` alias.
- Task 4: Created `components/needs/IdChip.tsx` — no `'use client'`, `font-mono text-[12px] font-medium text-primary`.
- Task 5: Created `components/needs/NeedsTable.tsx` — `'use client'`, URL-driven sort, 6 columns (5 sortable + Links), sticky header, empty state, `tabIndex={0}` + `onKeyDown` groundwork for keyboard nav (Story 3.3).
- Task 6: Created `app/loading.tsx` — skeleton matching real table's 6-column structure, `animate-pulse bg-muted`, 5 skeleton rows.
- Task 7: Updated `app/page.tsx` — `force-dynamic`, reads `sort`/`dir` URL params, calls `listNeeds()`, renders `<NeedsTable>`.
- Task 8: `npx tsc --noEmit` → exit 0; `npm run build` → exit 0; `/` route confirmed Dynamic (ƒ).

### File List

- sphinx-needs-clone/lib/utils.ts (modified)
- sphinx-needs-clone/types/index.ts (modified)
- sphinx-needs-clone/lib/queries/needs.ts (created)
- sphinx-needs-clone/components/needs/IdChip.tsx (created)
- sphinx-needs-clone/components/needs/NeedsTable.tsx (created)
- sphinx-needs-clone/app/loading.tsx (created)
- sphinx-needs-clone/app/page.tsx (modified)

### Senior Developer Review (AI)

**Date:** 2026-07-27
**Outcome:** Changes Requested
**Action Items:** 7 patch, 1 deferred, 8 dismissed
**Severity Breakdown:** 0 High · 1 Medium (`aria-sort`) · 6 Low

### Change Log

- 2026-07-27: Story 3.1 implemented — Needs table with sortable columns. Created `lib/queries/needs.ts` (`listNeeds` with whitelist-guarded ORDER BY), `components/needs/IdChip.tsx`, `components/needs/NeedsTable.tsx` (client, URL-driven sort), `app/loading.tsx` (skeleton). Updated `app/page.tsx` (force-dynamic, RSC data fetch), `types/index.ts` (DIR key), `lib/utils.ts` (parseTags). `tsc --noEmit` and `npm run build` both exit 0.
