---
baseline_commit: 448107e2b05138eacc11101c5eaec4aaada1c4cb
---

# Story 4.1: Link Needs Together and Show Link Counts in Table

Status: done

## Story

As a user,
I want to link a need to other needs and see those links in the table,
so that I can represent traceability and dependency relationships between my requirements.

## Acceptance Criteria

**AC1 — Links search input visible in NeedSheet (create and edit)**
**Given** the `NeedSheet` is open in create or edit mode
**When** I scroll to the Links section
**Then** a text input is visible with placeholder "Search by ID or title…"

**AC2 — Debounced search shows dropdown results**
**Given** I type at least 2 characters in the links search input
**When** 200ms have elapsed (debounce)
**Then** a dropdown (Popover) opens below the input showing up to 10 matching needs (ID + title + type) fetched from `GET /api/needs/search?q=<term>`; in edit mode the current need is excluded via `&exclude=<id>`

**AC3 — Selecting a result adds a removable chip**
**Given** I click a result in the dropdown
**When** the selection is made
**Then** the dropdown closes, the selected need appears as a removable chip (showing its `IdChip`), the search input clears; the same need cannot be added twice (already-selected needs filtered from results or rejected on add)

**AC4 — Removing a chip removes the link**
**Given** I click the × on a link chip
**When** the removal fires
**Then** the chip is removed from the list; the link will be deleted on save

**AC5 — Save persists link changes in the same transaction as the need**
**Given** I save the need (create or edit) with links added or removed
**When** the Server Action completes
**Then** `need_link` rows are inserted for new links and deleted for removed links in the same transaction as the need upsert; a "Saved." toast confirms

**AC6 — Links column shows real outgoing link count**
**Given** needs with outgoing links exist in the database
**When** the needs table renders
**Then** the Links column shows the outgoing link count as a number (e.g. `2`); needs with no links show `—`

**AC7 — GET /api/needs/search returns filtered results**
**Given** the Route Handler at `app/api/needs/search/route.ts`
**When** called with `?q=<term>` (and optionally `?exclude=<id>`)
**Then** it returns JSON `{ id, title, type }[]` filtered by `id LIKE ? OR title LIKE ?`, max 10 results, server-side only

## Tasks / Subtasks

- [x] Task 1 — Install `popover` shadcn component (AC: 2, 3)
  - [x] Run from `sphinx-needs-clone/` directory: `npx shadcn@latest add popover`
  - [x] Confirm `components/ui/popover.tsx` is generated; note the exported names (they drive LinksInput imports)
  - [x] Do NOT hand-edit the generated file
  - [x] If install fails or Popover isn't compatible, see Dev Notes → Popover Fallback for the absolute-positioned div approach

- [x] Task 2 — Update `types/index.ts` (AC: 5, 7)
  - [x] Add `export interface NeedSearchResult { id: string; title: string; type: string }` (new export)
  - [x] Add `links?: string[]` field to `CreateNeedInput`
  - [x] Add `links?: string[]` field to `UpdateNeedInput`

- [x] Task 3 — Create `app/api/needs/search/route.ts` (AC: 2, 7)
  - [x] Create directory path: `app/api/needs/search/`
  - [x] This is the single Route Handler permitted by AD-2; it does NOT carry `'use server'` (it's not a Server Action) and does NOT need `import 'server-only'` (Route Handlers are already server-side; the guard only blocks client-side imports)
  - [x] Import `db` from `'@/lib/db'` directly
  - [x] Import `NeedSearchResult` from `'@/types'`
  - [x] Export `GET` handler:
    ```ts
    export async function GET(request: Request) {
      const { searchParams } = new URL(request.url)
      const q = searchParams.get('q') ?? ''
      const exclude = searchParams.get('exclude')
      if (q.length < 2) return Response.json([])
      const pattern = `%${q}%`
      const rows = db.prepare(`
        SELECT n.id, n.title, nt.name AS type
        FROM need n
        JOIN need_type nt ON nt.id = n.type_id
        WHERE (n.id LIKE ? OR n.title LIKE ?)
          AND (? IS NULL OR n.id != ?)
        LIMIT 10
      `).all(pattern, pattern, exclude ?? null, exclude ?? null) as NeedSearchResult[]
      return Response.json(rows)
    }
    ```

- [x] Task 4 — Update `lib/queries/needs.ts` (AC: 6, plus pre-existing bug fix)
  - [x] Fix `link_count`: replace `0 AS link_count` (line 23) with:
    `(SELECT COUNT(*) FROM need_link nl WHERE nl.from_id = n.id) AS link_count`
  - [x] **Also fix pre-existing bug**: add `n.description,` to the SELECT after `n.tags,` (line 18). Currently `description` is omitted from the SELECT, so edit mode in `NeedSheet` always shows an empty description field. This is not part of Story 4.1 ACs but is required for the system to work correctly end-to-end.
  - [x] After fix, `getListStmt` SELECT should include: `n.id, n.type_id, n.title, n.status, n.tags, n.description, n.seq, n.created_at, n.updated_at, nt.name AS type_name, nt.prefix AS type_prefix, nt.color AS type_color, (SELECT COUNT(*) FROM need_link nl WHERE nl.from_id = n.id) AS link_count`
  - [x] The `stmtCache` is in-memory per process; it will populate with the corrected statement on the next request after server restart; no manual cache flush is needed

- [x] Task 5 — Update `lib/actions/needs.ts` (AC: 5)
  - [x] Add `getLinksForNeed` Server Action (read, follows `suggestNeedId` precedent):
    ```ts
    export async function getLinksForNeed(id: string): Promise<ActionResult<string[]>> {
      const rows = db
        .prepare('SELECT to_id FROM need_link WHERE from_id = ?')
        .all(id) as { to_id: string }[]
      return { success: true, data: rows.map(r => r.to_id) }
    }
    ```
  - [x] Update `createNeed` — inside the existing `insertTransaction` closure, after the `.get()` call that returns the inserted `Need` row, add link inserts BEFORE the return (need must exist before links due to FK):
    ```ts
    const insertedNeed = db.prepare(`
      INSERT INTO need (id, type_id, title, status, tags, description, seq, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, type_id, title, status, tags, description, seq, created_at, updated_at
    `).get(...) as Need
    if (input.links && input.links.length > 0) {
      const insertLink = db.prepare('INSERT INTO need_link (from_id, to_id) VALUES (?, ?)')
      for (const toId of input.links) {
        insertLink.run(insertedNeed.id, toId)
      }
    }
    return insertedNeed
    ```
    - The current `insertTransaction` body already returns the result of `.get()` directly. Refactor to capture in a variable first so links can be inserted after. The structure of the existing transaction closure must remain intact (BEGIN IMMEDIATE semantics via `db.transaction()` — AD-12).
  - [x] Update `updateNeed` — wrap the UPDATE statement and link management in `db.transaction()`. Keep the title/status validations OUTSIDE the transaction (they don't touch the DB for writes):
    ```ts
    const updateTransaction = db.transaction(() => {
      const row = db.prepare(`
        UPDATE need
        SET type_id = COALESCE(?, type_id), title = ?, status = COALESCE(?, status),
            tags = ?, description = ?, updated_at = ?
        WHERE id = ?
        RETURNING id, type_id, title, status, tags, description, seq, created_at, updated_at
      `).get(
        input.type_id ?? null,
        title,
        input.status ?? null,
        input.tags?.trim() || null,
        input.description?.trim() || null,
        now,
        id
      ) as Need | undefined
      if (!row) throw new Error('Need not found')
      if (input.links !== undefined) {
        db.prepare('DELETE FROM need_link WHERE from_id = ?').run(id)
        const insertLink = db.prepare('INSERT INTO need_link (from_id, to_id) VALUES (?, ?)')
        for (const toId of input.links) {
          insertLink.run(id, toId)
        }
      }
      return row
    })
    try {
      const row = updateTransaction()
      revalidatePath('/')
      return { success: true, data: row }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Need not found') {
        return { success: false, error: 'Need not found' }
      }
      return { success: false, error: 'Failed to update need' }
    }
    ```
    - Remove the old `if (!row) return ...` / `revalidatePath` / `return` pattern that existed outside a transaction

- [x] Task 6 — Create `components/needs/LinksInput.tsx` (AC: 1, 2, 3, 4)
  - [x] `'use client'`
  - [x] Props interface: `{ value: string[]; onChange: (links: string[]) => void; excludeId?: string }`
  - [x] Imports: `useState`, `useEffect` from `'react'`; `NeedSearchResult` from `'@/types'`; `IdChip` from `'@/components/needs/IdChip'`; `Input` from `'@/components/ui/input'`; `X` from `'lucide-react'`; Popover components from `'@/components/ui/popover'` (names depend on generated file — read it first)
  - [x] Internal state: `query: string` (search text), `results: NeedSearchResult[]` (from fetch), `popoverOpen: boolean`
  - [x] Debounce via `useEffect` — clears timer on every `query` change, fires fetch after 200ms:
    ```tsx
    useEffect(() => {
      if (query.length < 2) {
        setResults([])
        setPopoverOpen(false)
        return
      }
      const timer = setTimeout(async () => {
        try {
          const params = new URLSearchParams({ q: query })
          if (excludeId) params.set('exclude', excludeId)
          const res = await fetch(`/api/needs/search?${params.toString()}`)
          const data = (await res.json()) as NeedSearchResult[]
          // Filter out already-selected IDs
          const filtered = data.filter(r => !value.includes(r.id))
          setResults(filtered)
          setPopoverOpen(filtered.length > 0)
        } catch {
          setResults([])
        }
      }, 200)
      return () => clearTimeout(timer)
    }, [query, excludeId])
    ```
    - NOTE: `value` is a prop; if it changes mid-search, the already-selected filter is applied correctly. Add `value` to the dependency array only if needed — for MVP, filtering once on fetch is sufficient.
  - [x] `handleSelect(result: NeedSearchResult)`:
    ```tsx
    function handleSelect(result: NeedSearchResult) {
      if (!value.includes(result.id)) {
        onChange([...value, result.id])
      }
      setQuery('')
      setResults([])
      setPopoverOpen(false)
    }
    ```
  - [x] `handleRemove(id: string)`: `onChange(value.filter(v => v !== id))`
  - [x] Chips JSX (above the input):
    ```tsx
    {value.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-1.5">
        {value.map(id => (
          <span key={id} className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs">
            <IdChip id={id} />
            <button
              type="button"
              aria-label={`Remove link to ${id}`}
              onClick={() => handleRemove(id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    )}
    ```
  - [x] Popover/search input JSX — use shadcn Popover if installed (see Dev Notes for fallback):
    ```tsx
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverAnchor>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by ID or title…"
          aria-label="Search needs to link"
          autoComplete="off"
        />
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width,320px)]"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <ul role="listbox" aria-live="polite" aria-label="Search results" className="max-h-48 overflow-y-auto">
          {results.map(r => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(r)}
              >
                <IdChip id={r.id} />
                <span className="text-muted-foreground truncate">{r.title}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.type}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
    ```
    - `onMouseDown={e => e.preventDefault()}` on result buttons prevents the Input from losing focus before `onClick` fires
    - `onOpenAutoFocus={e => e.preventDefault()}` keeps focus on the Input when Popover opens

- [x] Task 7 — Update `components/needs/NeedSheet.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Add import: `import { LinksInput } from '@/components/needs/LinksInput'`
  - [x] Add import: `import { getLinksForNeed } from '@/lib/actions/needs'`
  - [x] Add `links: string[]` to `FormState` interface
  - [x] Update `defaultForm` to include `links: []`
  - [x] Add `initialLinksRef`:
    ```tsx
    const initialLinksRef = useRef<string[]>([])
    ```
  - [x] Update `useEffect([open])` edit branch to fetch links:
    ```tsx
    if (mode === 'edit' && initialNeed) {
      initialLinksRef.current = []
      setFormState({
        type_id: initialNeed.type_id,
        id: initialNeed.id,
        title: initialNeed.title,
        status: initialNeed.status,
        tags: initialNeed.tags ?? '',
        description: initialNeed.description ?? '',
        links: [],
      })
      setIdError(null)
      startTransition(async () => {
        const result = await getLinksForNeed(initialNeed.id)
        if (result.success) {
          initialLinksRef.current = result.data
          setFormState(prev => ({ ...prev, links: result.data }))
        }
      })
      return
    }
    ```
  - [x] Update create branch `useEffect` to also clear `initialLinksRef.current = []`
  - [x] Update `isDirty`:
    - Add links comparison using sorted JSON stringify:
      ```tsx
      const linksChanged = JSON.stringify([...formState.links].sort()) !==
        JSON.stringify([...initialLinksRef.current].sort())
      ```
    - In edit mode: OR it with the existing field checks
    - In create mode: OR it with `formState.links.length > 0`
  - [x] Update `handleSave` — pass `links: formState.links` to both `createNeed` and `updateNeed` calls
  - [x] Add `LinksInput` in the form JSX **between Tags and Description** (UX-DR9 field order: Type → ID → Title → Status → Tags → **Links** → Description):
    ```tsx
    <div className="flex flex-col gap-1.5">
      <Label>Links</Label>
      <LinksInput
        value={formState.links}
        onChange={(links) => setFormState(prev => ({ ...prev, links }))}
        excludeId={mode === 'edit' ? initialNeed?.id : undefined}
      />
    </div>
    ```

- [x] Task 8 — Update `components/needs/NeedsTable.tsx` (AC: 6)
  - [x] Find the Links `<td>` (currently line 169): `<td className="px-3 py-2 text-muted-foreground">—</td>`
  - [x] Replace with: `<td className="px-3 py-2 text-muted-foreground">{need.link_count > 0 ? need.link_count : '—'}</td>`

- [x] Task 9 — Verify all ACs
  - [x] `npx tsc --noEmit` → exit 0 (run from `sphinx-needs-clone/`)
  - [x] `npm run build` → exit 0 (run from `sphinx-needs-clone/`)
  - [x] Dev server at http://localhost:3000 — verify: AC1 (Links input visible in both create and edit modes), AC2 (typing ≥2 chars triggers search after 200ms), AC3 (click result adds chip, same ID not re-addable), AC4 (× removes chip), AC5 (save persists links to `need_link` table), AC6 (Links column shows count), AC7 (route handler returns JSON array)

### Review Findings

- [x] [Review][Patch] No `try/catch` in GET /api/needs/search route handler — unhandled DB exception surfaces raw 500 [app/api/needs/search/route.ts:12]
- [x] [Review][Patch] `getLinksForNeed` Server Action has no `try/catch` — DB error propagates to client instead of returning `{ success: false }` [lib/actions/needs.ts:9]
- [x] [Review][Patch] Missing cancellation token on `getLinksForNeed` transition — rapidly opening different needs can resolve in wrong order and populate wrong links (contrast: `suggestNeedId` uses token guard) [components/needs/NeedSheet.tsx:114]
- [x] [Review][Patch] `role="listbox"` on `<ul>` is incorrect — `listbox` expects `option` role children and keyboard navigation (arrow keys/Enter/Escape); change to `role="list"` [components/needs/LinksInput.tsx:90]
- [x] [Review][Patch] Whitespace-only `q` (e.g. `"  "`) passes `length < 2` guard; produces `'%  %'` pattern matching needs with 2+ spaces — add `.trim()` before guard [app/api/needs/search/route.ts:9]
- [x] [Review][Patch] LIKE wildcards `%`/`_` in `q` produce unintended results — `q="%"` returns all needs, `q="_"` matches any single char; escape before pattern construction [app/api/needs/search/route.ts:11]
- [x] [Review][Defer] SQLite LIKE case-insensitive for ASCII only — non-ASCII searches may miss case variants [app/api/needs/search/route.ts:17] — deferred, pre-existing SQLite behavior
- [x] [Review][Defer] `db.prepare()` inside `updateNeed` transaction called on every invocation — minor perf; create/delete link prepares done per-call instead of cached [lib/actions/needs.ts:138]  — deferred, MVP scale acceptable
- [x] [Review][Defer] 150ms blur timeout fallback insufficient on slow machines/screen readers — known limitation of custom dropdown approach [components/needs/LinksInput.tsx:85] — deferred, pre-existing approach pattern
- [x] [Review][Defer] FK violation on stale link ID (need deleted between chip selection and save) produces generic "Failed to update need" error with no user guidance [lib/actions/needs.ts:136] — deferred, single-user local app, extremely unlikely

## Dev Notes

### ⚠️ CRITICAL: `Popover` Not Yet Installed

`components/ui/popover.tsx` does NOT exist in the project. Must install via CLI before building `LinksInput`:
```
npx shadcn@latest add popover
```
Run from `sphinx-needs-clone/`. After generation, read the file to determine the exact exported component names (`Popover`, `PopoverContent`, `PopoverAnchor`, `PopoverTrigger`, etc.) — they depend on the shadcn version and preset.

**Fallback if Popover install fails or exports are incompatible:** Replace the Popover JSX in `LinksInput` with a native absolute-positioned div:
```tsx
<div className="relative">
  <Input
    value={query}
    onChange={e => setQuery(e.target.value)}
    placeholder="Search by ID or title…"
    autoComplete="off"
    onBlur={() => setTimeout(() => setPopoverOpen(false), 150)}
  />
  {popoverOpen && results.length > 0 && (
    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
      <ul role="listbox" aria-live="polite" className="max-h-48 overflow-y-auto py-1">
        {results.map(r => (
          <li key={r.id}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(r)}
            >
              <IdChip id={r.id} />
              <span className="text-muted-foreground truncate">{r.title}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )}
</div>
```
The `onBlur` + `setTimeout(150)` pattern allows the `onClick` on result buttons to fire before the blur-triggered close.

### ⚠️ CRITICAL: `link_count` Currently Hardcoded `0`

`lib/queries/needs.ts` line 23 returns `0 AS link_count`. The type `NeedRow = Need & { link_count: number }` is already defined and `NeedsTable.tsx` already has the Links column — but it shows `—` hardcoded regardless of the count. Both must be fixed in Task 4 (query) and Task 8 (display).

### ⚠️ CRITICAL: `n.description` Missing from `listNeeds` SELECT

Current `getListStmt` SELECT (lines 17–24 of `lib/queries/needs.ts`) does NOT include `n.description`. This is a pre-existing bug: when a need is opened in edit mode, `initialNeed.description` resolves to `undefined` (not `null`), and `undefined ?? ''` evaluates to `''` — meaning the description field always appears empty in edit mode even when data exists. Fix this in Task 4 by adding `n.description,` to the SELECT list.

### ⚠️ CRITICAL: `need_link` FK + CHECK Constraints

From `lib/db.ts:53-58`:
```sql
CREATE TABLE IF NOT EXISTS need_link (
  from_id TEXT NOT NULL REFERENCES need(id),
  to_id   TEXT NOT NULL REFERENCES need(id),
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id != to_id)
);
```
- Both `from_id` and `to_id` must reference existing `need.id` rows (FK enforced — `PRAGMA foreign_keys = ON`)
- `from_id != to_id` — a need cannot link to itself; pass `excludeId` in edit mode to prevent self-selection in the UI
- In `createNeed` transaction: the new need must be inserted FIRST, then links inserted (otherwise the `from_id` FK fails). This is fine within a single transaction — the row is visible inside the transaction before commit.

### ⚠️ CRITICAL: `updateNeed` Must Be Wrapped in Transaction

Currently `updateNeed` runs the UPDATE outside a transaction. When adding link management (DELETE + INSERT into `need_link`), all operations must be atomic. Refactor to use `db.transaction()` as shown in Task 5. Keep validation logic (title trim, status check) OUTSIDE the transaction wrapper — those are read-only DB checks and belong before the write transaction.

### ⚠️ CRITICAL: better-sqlite3 Is Synchronous

All `db.prepare().get()`, `.run()`, `.all()` calls are **synchronous** — no `await`. Do not add `async` to the `db.transaction()` callback. `revalidatePath()` is called **after** the transaction, outside the `try` block's transaction call.

### ⚠️ CRITICAL: Base UI Nova Preset — `render={}` Not `asChild`

This project uses `shadcn/ui` 4.14.0 with the Nova/Base UI preset. `asChild` prop is NOT supported. Use `render={<Component />}` for polymorphic renders. This applies to any Popover component triggers or anchors.

### ⚠️ CRITICAL: `getLinksForNeed` Pattern

`getLinksForNeed` is a Server Action (`'use server'`) used as a server-side read. This follows the same precedent as `suggestNeedId`. Called in `NeedSheet.tsx` inside `startTransition(async () => {...})` within the `useEffect([open])` hook. Since `isPending` is `true` during the fetch, the form will show "Saving…" briefly — this is acceptable for MVP.

### ⚠️ CRITICAL: Route Handler Has No `'use server'` or `'server-only'`

The `app/api/needs/search/route.ts` file:
- Does NOT carry `'use server'` (that marker is for Server Actions only)
- Does NOT need `import 'server-only'` (Route Handlers are always server-side; the guard only fires if a *client bundle* imports the module)
- DOES import `db from '@/lib/db'` directly — this is safe since the route is server-side

### ⚠️ CRITICAL: `isDirty` Links Comparison

Arrays in JavaScript compare by reference. For `isDirty`, compare sorted stringified arrays:
```tsx
const linksChanged = JSON.stringify([...formState.links].sort()) !==
  JSON.stringify([...initialLinksRef.current].sort())
```
In create mode, `initialLinksRef.current` is always `[]`, so `linksChanged = formState.links.length > 0`.

### ⚠️ CRITICAL: `stmtCache` in `lib/queries/needs.ts`

The `stmtCache` (line 11) stores prepared statements keyed by `orderByExpr:dir`. When the SELECT query changes (adding `n.description` and real `link_count`), the cache will be empty on the next fresh process start. No manual flush is needed. The old cached statements are never reused after a code change + server restart.

### ⚠️ CRITICAL: `LinksInput` in Edit Mode — Loading State

When the sheet opens in edit mode, `getLinksForNeed` is called inside `startTransition`. The links chips won't appear until the action resolves. During this brief period, `isPending` is `true` and the Save button shows "Saving…". This is the same pattern as `suggestNeedId` in create mode — acceptable for local SQLite speed.

### Deferred Work

No new deferred items introduced. Pre-existing deferred work from `deferred-work.md` carries forward unchanged.

### Stack Versions (Carry-forward from Story 3.3)

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

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-2 — Route Handler for autocomplete only | `app/api/needs/search/route.ts` is the sole GET Route Handler (FR-10); all mutations remain in Server Actions |
| AD-3 — Backlinks computed at read time | This story adds outgoing links only; backlinks in Story 4.2 will use `SELECT from_id FROM need_link WHERE to_id = ?` |
| AD-6 — `need_link` has no type column | `need_link` only gets `from_id` and `to_id` per AD-6 |
| AD-11 — link cleanup in transaction on delete | `deleteNeed` (already implemented in Story 3.3) handles `need_link` cleanup; no changes needed |
| AD-12 — ID generation in transaction | `createNeed` transaction unchanged; link inserts added inside the same transaction |
| `'use client'` scope | `LinksInput` is a new `'use client'` component at the lowest subtree; no page or layout receives `'use client'` |
| Server Action return shape | `getLinksForNeed` returns `ActionResult<string[]>` |

### Project Structure After This Story

```
app/api/needs/search/route.ts           ← NEW (GET Route Handler for link autocomplete)
components/needs/LinksInput.tsx         ← NEW ('use client' — links search-and-select with chips)
components/ui/popover.tsx               ← NEW (shadcn CLI-generated, do not edit)
types/index.ts                          ← UPDATE (NeedSearchResult, links in inputs)
lib/actions/needs.ts                    ← UPDATE (getLinksForNeed, createNeed/updateNeed link handling)
lib/queries/needs.ts                    ← UPDATE (real link_count subquery, add n.description)
components/needs/NeedSheet.tsx          ← UPDATE (LinksInput section, links in formState/isDirty/save)
components/needs/NeedsTable.tsx         ← UPDATE (Links column shows need.link_count)
```

### Cross-Story Awareness

- **Story 4.2 (Display Backlinks)**: Will add a read-only "← Linked by" section below the Links section in `NeedSheet`. The `LinksInput` component created here handles outgoing links only; Story 4.2 adds a separate backlinks display. Both will coexist in the form body — no refactoring of `LinksInput` expected.
- **Story 5.1 (Filter Bar)**: No impact on link flows.

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1; FR-8, FR-9, FR-10
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-2 (Route Handler), AD-3, AD-6, AD-11, AD-12
- UX Experience: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — Component Patterns (Links Input), State Patterns, Accessibility (aria-live on links popover)
- Previous Story: `_bmad-output/implementation-artifacts/3-3-edit-and-delete-needs.md` — NeedSheet current state, Base UI `render={}` pattern, transaction patterns, stack versions
- Existing files modified: `sphinx-needs-clone/lib/actions/needs.ts`, `sphinx-needs-clone/lib/queries/needs.ts`, `sphinx-needs-clone/components/needs/NeedSheet.tsx`, `sphinx-needs-clone/components/needs/NeedsTable.tsx`, `sphinx-needs-clone/types/index.ts`

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-07-30

### Debug Log References

None — tsc and build passed clean on first attempt.

### Completion Notes List

- Task 1: shadcn CLI install cancelled by user; implemented `LinksInput` using absolute-positioned dropdown fallback (Dev Notes pattern). No popover.tsx created — not needed.
- Task 4: Also fixed pre-existing bug where `n.description` was missing from `listNeeds` SELECT, causing edit mode to always show empty description field.
- Task 5: `updateNeed` refactored from direct `.get()` to `db.transaction()` wrapper; link replace-all strategy (DELETE + INSERT) inside same transaction as need UPDATE.
- All ACs satisfied; `npx tsc --noEmit` exit 0; `npm run build` exit 0 (compiled in 9.8s).

### File List

- sphinx-needs-clone/app/api/needs/search/route.ts (NEW)
- sphinx-needs-clone/components/needs/LinksInput.tsx (NEW)
- sphinx-needs-clone/types/index.ts (MODIFIED)
- sphinx-needs-clone/lib/actions/needs.ts (MODIFIED)
- sphinx-needs-clone/lib/queries/needs.ts (MODIFIED)
- sphinx-needs-clone/components/needs/NeedSheet.tsx (MODIFIED)
- sphinx-needs-clone/components/needs/NeedsTable.tsx (MODIFIED)

### Change Log

- 2026-07-30: Implemented Story 4.1 — links search-and-select in NeedSheet, need_link persistence, live link count in table, GET /api/needs/search route handler, fixed n.description missing from listNeeds SELECT
