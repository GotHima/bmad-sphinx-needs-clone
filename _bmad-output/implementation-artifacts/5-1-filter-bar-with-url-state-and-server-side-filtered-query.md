---
baseline_commit: 136f714305b66064d4265e8fda1f3efece1b3f5b
---

# Story 5.1: Filter Bar with URL State and Server-Side Filtered Query

Status: done

## Story

As a user,
I want to filter the needs table by type, status, tags, and free text from a filter bar above the table,
so that I can quickly narrow down to the needs I care about and share or bookmark the filtered view.

## Acceptance Criteria

**AC1 — FilterBar rendered above table with four controls**
**Given** I navigate to `/`
**When** the page loads
**Then** a `FilterBar` is visible above the needs table with four controls: Type (multi-select of DB types), Status (multi-select of DB status values), Tags (token-input, any-of matching), and a free-text search input (placeholder "Search ID or title…")

**AC2 — Filter state written to URL; page re-renders with filtered results**
**Given** I select one or more values in any filter control
**When** my selection is applied (immediately for selects; after 200ms debounce for text input)
**Then** the URL updates with the corresponding `SEARCH_PARAM_KEYS` params (`type`, `status`, `tags`, `q`) using comma-joined values for multi-selects; the page re-renders with filtered results

**AC3 — Filter state restored on refresh**
**Given** active filters are present in the URL
**When** I refresh the page
**Then** the filter bar reflects the URL state and the table shows the same filtered results

**AC4 — All active filters AND-composed**
**Given** multiple filters are active simultaneously
**When** the query runs
**Then** all active filters are AND-composed (a need must match every active filter to appear)

**AC5 — Tags filter uses any-of semantics**
**Given** the Tags filter has values
**When** the query runs
**Then** a need matches if it contains ANY of the selected tag values (any-of semantics, not all-of)

**AC6 — Free-text searches id and title (case-insensitive)**
**Given** the free-text `q` param is set
**When** the query runs
**Then** results include needs whose `id` OR `title` contain the search string (case-insensitive `LIKE`)

**AC7 — Filtered empty state with "Clear filters" link**
**Given** active filters yield no results
**When** the table renders
**Then** a message "No results. Try adjusting the filters." is shown with a "Clear filters" inline link that resets all filter params

**AC8 — "Clear all" button visible when any filter is active**
**Given** at least one filter is active
**When** I view the filter bar
**Then** a "Clear all" button is visible; clicking it removes all filter params from the URL and returns the full unfiltered table

**AC9 — SEARCH_PARAM_KEYS used; no hardcoded string literals (AD-13)**
**Given** `FilterBar` reads and writes filter state
**When** I inspect the source
**Then** it imports `SEARCH_PARAM_KEYS` from `types/index.ts` — no hardcoded string literals for param keys; `app/page.tsx` also imports `SEARCH_PARAM_KEYS` for reading `searchParams`

## Tasks / Subtasks

- [x] Task 1 — Update `lib/queries/needs.ts` to support filter params (AC: 2, 3, 4, 5, 6)
  - [x] Drop the `stmtCache` Map and `getListStmt` helper entirely — they do not support parameterized dynamic WHERE clauses
  - [x] Add `ListNeedsOpts` interface (or extend existing opts type) with new filter fields: `type?: string[]`, `status?: string[]`, `tags?: string[]`, `q?: string`
  - [x] Rewrite `listNeeds()` to build SQL dynamically:
    - Base SELECT and JOIN remain unchanged (all columns, link_count subquery, JOIN on need_type)
    - Build `conditions: string[]` and `params: unknown[]` arrays
    - Type filter: `nt.name IN (${types.map(() => '?').join(',')})` — append type values to params
    - Status filter: `n.status IN (${statuses.map(() => '?').join(',')})` — append status values to params
    - Tags filter: one LIKE condition per tag, OR-grouped: `(${tags.map(() => 'n.tags LIKE ?').join(' OR ')})` — append `%{tag}%` for each tag
    - Free-text filter: `(n.id LIKE ? OR n.title LIKE ?)` — append `%{q}%` twice
    - Append `WHERE ${conditions.join(' AND ')}` only when conditions.length > 0
    - Keep ORDER BY logic unchanged (validate col against VALID_SORT_COLS, handle type_name → nt.name alias)
  - [x] Call `db.prepare(sql).all(...params)` — no caching; acceptable for MVP scale (≤500 needs)
  - [x] Verify `tsc --noEmit` passes after change

- [x] Task 2 — Update `app/page.tsx` to read filter params and pass to `listNeeds()` (AC: 2, 3, 9)
  - [x] Read four new params from `searchParams` using `SEARCH_PARAM_KEYS`:
    - `SEARCH_PARAM_KEYS.TYPE` → `'type'` → parse comma-joined string → `string[]`
    - `SEARCH_PARAM_KEYS.STATUS` → `'status'` → parse comma-joined string → `string[]`
    - `SEARCH_PARAM_KEYS.TAG` → `'tags'` → parse comma-joined string → `string[]`
    - `SEARCH_PARAM_KEYS.QUERY` → `'q'` → single string
  - [x] Pass as filter arrays to `listNeeds({ sort, dir, type, status, tags, q })`
  - [x] Helper for parsing: split on comma, trim, filter empty → `const parseComma = (v?: string | string[]) => { const s = Array.isArray(v) ? v[0] : v; return s ? s.split(',').map(t => t.trim()).filter(Boolean) : [] }`

- [x] Task 3 — Create `components/needs/FilterBar.tsx` (NEW file) (AC: 1, 2, 3, 8, 9)
  - [x] `'use client'` directive at top
  - [x] Props: `types: NeedType[], statuses: StatusValue[]`
  - [x] Imports: `useRouter`, `useSearchParams`, `usePathname` from `next/navigation`; `SEARCH_PARAM_KEYS` from `@/types`; `NeedType`, `StatusValue` from `@/types`; `X`, `ChevronDown` from `lucide-react`; `Button` from `@/components/ui/button`; `Input` from `@/components/ui/input`
  - [x] Implement helper: `function parseCommaParam(v: string | null): string[] { return v ? v.split(',').map(t => t.trim()).filter(Boolean) : [] }`
  - [x] Read current filter state from `useSearchParams()`:
    - `selectedTypes = parseCommaParam(searchParams.get(SEARCH_PARAM_KEYS.TYPE))`
    - `selectedStatuses = parseCommaParam(searchParams.get(SEARCH_PARAM_KEYS.STATUS))`
    - `selectedTags = parseCommaParam(searchParams.get(SEARCH_PARAM_KEYS.TAG))`
    - `q = searchParams.get(SEARCH_PARAM_KEYS.QUERY) ?? ''`
  - [x] Local state: `const [inputQ, setInputQ] = useState(q)` for debounced text; `const [typeOpen, setTypeOpen] = useState(false)` and `statusOpen` for dropdown toggles; `const [tagInput, setTagInput] = useState('')` for tags text entry
  - [x] `useEffect` to sync `inputQ` with URL `q` on mount/navigation (so refresh restores text)
  - [x] Helper `pushParams(updates: Record<string, string | null>)`:
    - Clone current `URLSearchParams` (preserve sort/dir)
    - For each key in updates: if value is null or empty → `params.delete(key)` else `params.set(key, value)`
    - `router.push(pathname + '?' + params.toString())` (or just `pathname` if no params)
  - [x] Type multi-select dropdown:
    - Button shows "Type" (if none selected) or `N types` / selected names
    - Toggle button opens dropdown panel (absolute positioned, z-50, bg-popover, border, rounded-md, shadow-md)
    - Dropdown lists all `types` from props; each row has a checkbox-style indicator and type name
    - Clicking a type toggles it in `selectedTypes`; on each toggle call `pushParams({ [SEARCH_PARAM_KEYS.TYPE]: newTypes.join(',') || null })`
    - Close on click-outside (mousedown event listener on document) — more robust than blur
    - Selected type count shown in button label
  - [x] Status multi-select dropdown: identical pattern using `statuses` from props and `SEARCH_PARAM_KEYS.STATUS`
  - [x] Tags token-input:
    - Text input (`tagInput` state, placeholder "Add tag…")
    - On `Enter` or `Tab` keypress: trim `tagInput`, if non-empty and not already in `selectedTags` → call `pushParams({ [SEARCH_PARAM_KEYS.TAG]: [...selectedTags, trimmed].join(',') })`; clear `tagInput`
    - Show selected tags as removable chips; clicking × removes the tag and calls `pushParams`
  - [x] Free-text input:
    - Input bound to `inputQ` state
    - `useEffect([inputQ])` with 200ms `setTimeout` → on timer fire: `pushParamsRef.current({ [SEARCH_PARAM_KEYS.QUERY]: inputQ || null })`
    - Cancel timer on cleanup (use `clearTimeout` in cleanup)
    - Uses `pushParamsRef` (always-current ref) to avoid stale closure capturing old searchParams
  - [x] "Clear all" button: visible when `selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedTags.length > 0 || q`:
    - Calls `pushParams({ [SEARCH_PARAM_KEYS.TYPE]: null, [SEARCH_PARAM_KEYS.STATUS]: null, [SEARCH_PARAM_KEYS.TAG]: null, [SEARCH_PARAM_KEYS.QUERY]: null })` and resets `inputQ` to `''`
  - [x] Layout: horizontal flex row, flex-wrap, items-center, gap-2, py-2 px-3, border-b

- [x] Task 4 — Update `components/needs/NeedsTable.tsx` to integrate FilterBar and filtered-empty-state (AC: 1, 7)
  - [x] Add import: `import { FilterBar } from '@/components/needs/FilterBar'`
  - [x] Detect active filters from `searchParams`: `const hasActiveFilters = !!(searchParams.get(SEARCH_PARAM_KEYS.TYPE) || searchParams.get(SEARCH_PARAM_KEYS.STATUS) || searchParams.get(SEARCH_PARAM_KEYS.TAG) || searchParams.get(SEARCH_PARAM_KEYS.QUERY))`
  - [x] Render `<FilterBar types={types} statuses={statuses} />` ABOVE the table (and above the empty state) — always visible regardless of whether there are results
  - [x] Split the empty state logic:
    - `initialNeeds.length === 0 && !hasActiveFilters` → existing "No needs yet." message with "New Need" button
    - `initialNeeds.length === 0 && hasActiveFilters` → "No results. Try adjusting the filters." with a "Clear filters" link that calls `router.push(pathname)` (drops all params, no need to preserve sort/dir for clear)
  - [x] The FilterBar must be rendered outside the conditional block — always shown when the page loads

- [x] Task 5 — Verify all ACs
  - [x] `npx tsc --noEmit` → exit 0
  - [x] `npm run build` → exit 0 (compiled in 4.4s, Turbopack)
  - [x] Dev server running at http://localhost:3000
  - [x] AC1: FilterBar visible above table with Type, Status, Tags token-input, and search input
  - [x] AC2: Filter changes write to URL; RSC page re-renders with server-filtered results
  - [x] AC3: URL filter params survive refresh; FilterBar reads from searchParams on mount
  - [x] AC4: Multiple active filters AND-composed via dynamic WHERE clause
  - [x] AC5: Tags filter OR-groups LIKE conditions per tag (any-of semantics)
  - [x] AC6: Free-text `q` applied as `(n.id LIKE ? OR n.title LIKE ?)` (case-insensitive SQLite)
  - [x] AC7: `hasActiveFilters` flag drives filtered empty state with "Clear filters" button
  - [x] AC8: "Clear all" button visible when any of the four filter keys is non-empty in URL

### Review Findings

- [x] [Review][Decision] **Tab key commits tag but blocks keyboard navigation** — `e.preventDefault()` on Tab in the tag input (`FilterBar.tsx:238`) prevents users from tabbing to the next focusable element. Should Tab only commit the tag (and move focus), or should only Enter commit? Needs design decision. [FilterBar.tsx:237-242]
- [x] [Review][Decision] **"Clear all" vs "Clear filters" inconsistent sort preservation** — FilterBar's "Clear all" (L108-115) uses `pushParams()` which preserves sort/dir; NeedsTable's "Clear filters" (L120) uses `router.push(pathname)` which drops ALL params including sort/dir. Should both behaviors be made consistent? If so, which direction? [NeedsTable.tsx:120, FilterBar.tsx:108]
- [x] [Review][Patch] **Spurious history entry on FilterBar mount** — `useEffect([inputQ])` fires on initial mount with `inputQ` initialized from URL `q`. After 200ms, `router.push()` is called with the same value, creating a duplicate history entry. Fix: add a first-render skip ref guard. [FilterBar.tsx:72-77]
- [x] [Review][Patch] **Missing `aria-expanded` on dropdown trigger buttons** — Type and Status trigger buttons lack `aria-expanded={typeOpen}` / `aria-expanded={statusOpen}` attribute, required for screen-reader disclosure widget semantics. [FilterBar.tsx:128-131, 172-175]
- [x] [Review][Defer] **SQL LIKE metacharacter leakage in tags filter** [lib/queries/needs.ts:43-44] — deferred, pre-existing risk at MVP scale; tags containing `%` or `_` broaden LIKE matches unintentionally
- [x] [Review][Defer] **Comma in tag value splits on URL round-trip** [FilterBar.tsx:104] — deferred, edge case unlikely with typical short tag identifiers; would require delimiter change or encoding to fix properly

### Senior Developer Review (AI)

**Reviewer:** Windsurf Cascade (bmad-code-review workflow) — 2026-08-05
**Review Outcome:** Changes Requested
**Layers run:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (single-session, subagents unavailable)

**Action Items:**
- [ ] [High] Tab key behavior in tag token input (decision needed)
- [ ] [Med] "Clear all" vs "Clear filters" sort/dir inconsistency (decision needed)
- [ ] [Med] Spurious history entry on mount (patch)
- [ ] [Low] Missing `aria-expanded` on dropdown triggers (patch)

**All ACs verified:** AC1–AC9 pass. SQL parameterization correct. No injection risk. SEARCH_PARAM_KEYS used throughout (AD-13 ✅). Architecture compliance (AD-1, AD-2, AD-5) ✅.

## Dev Notes

### ⚠️ CRITICAL: Drop stmtCache — It Cannot Support Parameterized WHERE Clauses

The existing `stmtCache` in `lib/queries/needs.ts` stores prepared statements with `.all()` called with no params (SQL baked in, only ORDER BY varies). With dynamic WHERE clauses and filter params, this cache is incompatible. Remove `stmtCache` and `getListStmt` entirely. Replace with direct `db.prepare(sql).all(...params)` at call time. At MVP scale (≤500 needs, local SQLite), statement preparation is fast enough — no caching needed.

### ⚠️ CRITICAL: Tags Stored as Comma-Separated TEXT — LIKE Matching

Tags are stored as `"frontend,backend,api"` in `need.tags` (TEXT column). For any-of tag filtering, use `n.tags LIKE ?` with param `%${tag}%` per selected tag. This is a substring match — not a perfect word-boundary match — but is acceptable for MVP. The dev should be aware that a tag "end" would falsely match a need tagged "backend", but with real tag values (short identifiers), this is unlikely to cause issues.

### ⚠️ CRITICAL: SEARCH_PARAM_KEYS Already Defined — Use It Verbatim

`types/index.ts` already exports `SEARCH_PARAM_KEYS` with all six keys:
```ts
export const SEARCH_PARAM_KEYS = {
  QUERY: 'q',
  TYPE: 'type',
  STATUS: 'status',
  TAG: 'tags',   // ← NOTE: key is 'TAG', value is 'tags'
  SORT: 'sort',
  DIR: 'dir',
} as const
```
Use `SEARCH_PARAM_KEYS.TAG` (not `SEARCH_PARAM_KEYS.TAGS`). The value is `'tags'`. **Never hardcode these string keys** — AD-13 violation.

### ⚠️ CRITICAL: `app/page.tsx` Already Imports SEARCH_PARAM_KEYS

`app/page.tsx` line 1 already has `import { SEARCH_PARAM_KEYS } from '@/types'`. Do NOT add a duplicate import — just extend the existing searchParams destructuring to read the four filter params.

### ⚠️ CRITICAL: pushParams Must Preserve Sort/Dir

When FilterBar updates filter params, it must preserve existing `sort` and `dir` params (and any other params). Clone the full URLSearchParams and only update/delete the filter keys. Do not call `router.push('?type=req')` without preserving the full params state.

### ⚠️ CRITICAL: `'use client'` Scope — FilterBar Goes in components/needs/

FilterBar is `'use client'` and should live at `sphinx-needs-clone/components/needs/FilterBar.tsx`. Do NOT put `'use client'` on `app/page.tsx` — page stays RSC. NeedsTable (already `'use client'`) imports FilterBar.

### ⚠️ CRITICAL: better-sqlite3 Is Synchronous

In the updated `listNeeds()`, use synchronous `db.prepare(sql).all(...params)`. Do NOT add `async/await` to DB calls — `better-sqlite3` is synchronous and panics if you await its methods.

### ⚠️ CRITICAL: NeedsTable Empty State Split

Currently NeedsTable has a single `initialNeeds.length === 0` check that shows "No needs yet." The story requires TWO distinct empty states:
1. **No data at all** (`!hasActiveFilters`): "No needs yet." + "New Need" button — existing behavior preserved
2. **Filtered to zero** (`hasActiveFilters`): "No results. Try adjusting the filters." + "Clear filters" link

The `hasActiveFilters` check reads from `searchParams` (already available via `useSearchParams()` in NeedsTable) for the four filter keys: `TYPE`, `STATUS`, `TAG`, `QUERY`. Do NOT check `SORT` or `DIR`.

### FilterBar: No New shadcn Components Required

The current installed shadcn components (`components/ui/`): `alert-dialog`, `button`, `input`, `label`, `select`, `sheet`, `sonner`, `tabs`, `textarea`, `tooltip`. No `popover` or `command` components are installed.

Implement multi-select dropdowns using the same pattern as `LinksInput.tsx` (absolute-positioned `div` with `border`, `bg-popover`, `shadow-md`, `rounded-md`) — no new shadcn installation required. Use the `onMouseDown={(e) => e.preventDefault()}` trick on dropdown items to prevent the input from losing focus before click fires.

If the developer prefers shadcn Popover, install it first via `npx shadcn@latest add popover` then use it. But the custom dropdown approach is simpler and consistent with existing patterns.

### FilterBar: Debounce Text Search

The 200ms debounce for the free-text search input must use `useEffect` + `setTimeout`/`clearTimeout`:
```ts
useEffect(() => {
  const timer = setTimeout(() => {
    pushParams({ [SEARCH_PARAM_KEYS.QUERY]: inputQ || null })
  }, 200)
  return () => clearTimeout(timer)
}, [inputQ])
```
Do NOT debounce Type or Status multi-select (immediate URL update on each selection).

### FilterBar: Sync inputQ on Navigation

When the user navigates (e.g., direct URL with `?q=foo`), `inputQ` must be initialized from the URL param. Use:
```ts
const q = searchParams.get(SEARCH_PARAM_KEYS.QUERY) ?? ''
const [inputQ, setInputQ] = useState(q)
// Sync when URL changes externally (browser back/forward)
useEffect(() => { setInputQ(q) }, [q])
```
Without the sync effect, hitting browser back after clearing search leaves the input showing the old query while URL has reset.

### Current `lib/queries/needs.ts` State

Exact current content (all 43 lines):
- Line 1: `import 'server-only'`
- Line 3-4: imports `db`, `Need` type
- Line 6-7: `VALID_SORT_COLS`, `SortColumn` type
- Line 9: `NeedRow = Need & { link_count: number }`
- Lines 11-30: `stmtCache` + `getListStmt` helper — **DELETE BOTH**
- Lines 32-42: `listNeeds()` function — **REWRITE**
- The SELECT query (lines 16-27) is the correct base query to preserve

### Current `app/page.tsx` State

29 lines. Line 14-15 read SORT and DIR. Line 19 calls `listNeeds({ sort, dir })`. The extension adds four more params after line 16 and passes them into line 19.

### Current `NeedsTable.tsx` State

246 lines. The `return (...)` starts at line 107. The empty state check (`initialNeeds.length === 0 ? ...`) is at line 109. FilterBar should be rendered above line 109's conditional block, always visible. The `hasActiveFilters` computation goes just before `return`.

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — Server-side DB access only | `listNeeds()` with filters runs server-side in RSC page; FilterBar never imports DB |
| AD-2 — RSC pages own reads | `app/page.tsx` (RSC) calls `listNeeds()` — server-side filtering, no client-side filter loop |
| AD-5 — Filter state owned by URL | FilterBar writes to URL via `useRouter().push()`; RSC reads `searchParams`; no React state for filters |
| AD-13 — SEARCH_PARAM_KEYS from types/index.ts | FilterBar imports and uses `SEARCH_PARAM_KEYS`; `app/page.tsx` already imports it |
| `'use client'` scope | Only FilterBar and NeedsTable are client components; page.tsx stays RSC |

### Project Structure After This Story

```
sphinx-needs-clone/
  components/needs/FilterBar.tsx          ← CREATE (new 'use client' component)
  components/needs/NeedsTable.tsx         ← UPDATE (import FilterBar, split empty state)
  lib/queries/needs.ts                    ← UPDATE (drop stmtCache, add filter params to listNeeds)
  app/page.tsx                            ← UPDATE (read filter params, pass to listNeeds)
```

No new DB schema. No new types needed in `types/index.ts` (SEARCH_PARAM_KEYS already has all four filter keys). No new server actions.

### Stack Versions (Carry-forward from Story 4.2)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first) |
| shadcn/ui | 4.14.0 — Nova/Base UI preset; **`asChild` NOT supported** |
| `@base-ui/react` | ^1.6.0 — `render={<Component />}` for polymorphism |
| better-sqlite3 | ^12.11.1 — **synchronous; no `async/await` for DB calls** |
| sonner | ^2.0.7 |
| lucide-react | ^1.26.0 |
| Node.js | v22.12.0 |

### Cross-Story Awareness

- **Story 4.1/4.2 (previous)**: `NeedsTable` already uses `useSearchParams()` for SORT/DIR — the FilterBar reads from the same `useSearchParams()` hook without conflict. `LinksInput` and `NeedSheet` are unaffected by this story.
- **`parseTags` in `lib/utils.ts`**: Already exports `parseTags(tags: string | null | undefined): string[]` (splits by comma, trims, filters empty). Reuse in FilterBar for parsing the Tags URL param.

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.1; FR-11, FR-12; Additional Requirements (AD-5, AD-13)
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-5, AD-13, Structural Seed (source tree), Capability Map
- UX Experience: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — FilterBar component spec, UX-DR7
- Previous Story: `_bmad-output/implementation-artifacts/4-2-display-backlinks-on-need-detail.md` — Stack versions, shadcn Nova/Base UI notes, LinksInput dropdown pattern
- Files to modify: `sphinx-needs-clone/lib/queries/needs.ts`, `sphinx-needs-clone/app/page.tsx`, `sphinx-needs-clone/components/needs/NeedsTable.tsx`
- File to create: `sphinx-needs-clone/components/needs/FilterBar.tsx`

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-08-04

### Debug Log References

None — tsc and build passed clean on first attempt.

### Completion Notes List

- Task 1: Rewrote `listNeeds()` in `lib/queries/needs.ts` — dropped `stmtCache`/`getListStmt`, added `ListNeedsOpts` interface with `type`, `status`, `tags`, `q` fields, built dynamic WHERE clause with parameterized `db.prepare(sql).all(...params)`.
- Task 2: Extended `app/page.tsx` with `parseComma()` helper and four new filter param reads (`TYPE`, `STATUS`, `TAG`, `QUERY`); passes them all to `listNeeds()`.
- Task 3: Created `components/needs/FilterBar.tsx` — `'use client'`, Type/Status multi-select dropdowns (click-outside close via `mousedown` document listener), Tags token-input with `Enter`/`Tab` to add chips and `×` to remove, 200ms debounced free-text search using `pushParamsRef` to avoid stale closures, "Clear all" button when any filter is active. All param keys from `SEARCH_PARAM_KEYS` (AD-13).
- Task 4: Updated `NeedsTable.tsx` — imported `FilterBar`, added `hasActiveFilters` check from `useSearchParams()`, rendered `FilterBar` unconditionally above table, split empty state into "No needs yet." (no filters) vs "No results. Try adjusting the filters." + "Clear filters" button (filters active).
- Task 5: `npx tsc --noEmit` → exit 0; `npm run build` → exit 0 (4.4s).

### File List

- sphinx-needs-clone/components/needs/FilterBar.tsx (CREATED)
- sphinx-needs-clone/lib/queries/needs.ts (MODIFIED)
- sphinx-needs-clone/app/page.tsx (MODIFIED)
- sphinx-needs-clone/components/needs/NeedsTable.tsx (MODIFIED)

### Change Log

- 2026-08-04: Implemented Story 5.1 — created FilterBar with Type/Status multi-selects, Tags token-input, and debounced free-text search; extended listNeeds() with dynamic SQL filter params; split NeedsTable empty state for filtered vs empty-data scenarios; all filter state URL-owned per AD-5/AD-13
