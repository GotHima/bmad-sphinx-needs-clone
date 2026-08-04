---
baseline_commit: d996965
---

# Story 4.2: Display Backlinks on Need Detail

Status: done

## Story

As a user,
I want to see which other needs link to the need I'm viewing,
so that I can understand where a requirement is referenced without manually searching.

## Acceptance Criteria

**AC1 — "← Linked by" section visible in edit mode with backlinks**
**Given** the `NeedSheet` is open in edit mode for a need that has incoming links
**When** I scroll below the outgoing Links section
**Then** a read-only "← Linked by" section is visible showing each linking need as an `IdChip` chip (not removable)

**AC2 — Empty state in edit mode with no incoming links**
**Given** the `NeedSheet` is open in edit mode for a need with no incoming links
**When** the backlinks section has loaded
**Then** the section shows "No backlinks." as muted text

**AC3 — No backlinks section in create mode**
**Given** the `NeedSheet` is open in create mode (need not yet saved)
**When** I inspect the sheet
**Then** no backlinks section is shown (an unsaved need cannot be linked to by others)

**AC4 — Backlinks computed at read time (AD-3)**
**Given** backlinks are displayed
**When** I inspect the query powering them
**Then** they are computed via `SELECT from_id FROM need_link WHERE to_id = ?` — never from a stored column on `need` (AD-3)

**AC5 — Deleted need leaves no ghost backlinks (AD-11)**
**Given** a need that has backlinks is deleted
**When** `deleteNeed` runs
**Then** the `need_link` rows where `to_id = deleted_id` are also deleted in the same transaction (AD-11 — already implemented); no ghost backlinks appear on other needs

## Tasks / Subtasks

- [x] Task 1 — Add `getBacklinksForNeed` Server Action to `lib/actions/needs.ts` (AC: 1, 2, 4)
  - [x] Add the following export immediately after `getLinksForNeed` (line 18):
    ```ts
    export async function getBacklinksForNeed(id: string): Promise<ActionResult<string[]>> {
      try {
        const rows = db
          .prepare('SELECT from_id FROM need_link WHERE to_id = ?')
          .all(id) as { from_id: string }[]
        return { success: true, data: rows.map(r => r.from_id) }
      } catch {
        return { success: false, error: 'Failed to load backlinks' }
      }
    }
    ```
  - [x] No new imports needed — `db`, `ActionResult` already imported at top of file
  - [x] No new types needed — returns `ActionResult<string[]>` like `getLinksForNeed`

- [x] Task 2 — Update `components/needs/NeedSheet.tsx` (AC: 1, 2, 3)
  - [x] Add `getBacklinksForNeed` to the existing import on line 34:
    ```ts
    import { suggestNeedId, createNeed, updateNeed, deleteNeed, getLinksForNeed, getBacklinksForNeed } from '@/lib/actions/needs'
    ```
  - [x] Add `backlinks` state immediately after line 80 (`const initialLinksRef = useRef<string[]>([])`):
    ```tsx
    const [backlinks, setBacklinks] = useState<string[] | null>(null)
    ```
    - `null` = not yet loaded (hides the section while fetching; prevents flash of "No backlinks.")
    - `[]` = loaded, no incoming links → shows "No backlinks."
    - `[...ids]` = loaded, has backlinks → shows chips
  - [x] Update `useEffect([open])` edit branch to call both actions together with `Promise.all`
  - [x] In the create branch of `useEffect([open])`, added `setBacklinks(null)`
  - [x] Added the "← Linked by" JSX section between the Links section and the Description section
    - `{mode === 'edit' && backlinks !== null && ...}` — guards both mode AND load completion
    - `IdChip` already imported — no new import needed
    - No remove button — backlinks are read-only (not editable)

- [x] Task 3 — Verify AC5 (AD-11 compliance — no change needed)
  - [x] Confirmed `deleteNeed` in `lib/actions/needs.ts` already runs:
    `db.prepare('DELETE FROM need_link WHERE from_id = ? OR to_id = ?').run(needId, needId)`
  - [x] The `OR to_id = ?` clause already handles backlink cleanup on delete — **no code change required**

- [x] Task 4 — Verify all ACs
  - [x] `npx tsc --noEmit` → exit 0
  - [x] `npm run build` → exit 0 (compiled in 18.4s)
  - [x] Dev server at http://localhost:3000 — verify:
    - AC1: Open edit mode for a need that another need links to → "← Linked by" section with `IdChip` chips appears below Links section
    - AC2: Open edit mode for a need with no incoming links → "No backlinks." shown in muted text
    - AC3: Open create mode ("New Need") → no "← Linked by" section visible
    - AC4: Section appears only after `Promise.all` resolves, no flash of "No backlinks." during load
    - AC5: Delete a need that is referenced → open the linking need, "← Linked by" section no longer shows deleted ID

### Review Findings

- [x] [Review][Defer] `<Label>← Linked by</Label>` has no `htmlFor` — unassociated `<label>` element (WCAG 1.3.1) [`NeedSheet.tsx:381`] — deferred, pre-existing (same pattern as `<Label>Links</Label>` at line 371, established in Story 4.1)
- [x] [Review][Defer] Partial `Promise.all` failure leaves silent/inconsistent UI — if `getBacklinksForNeed` fails, section stays hidden with no user feedback; if only one action fails, UI is partially stale [`NeedSheet.tsx:119-131`] — deferred, pre-existing error-handling pattern from `getLinksForNeed` (Story 4.1)
- [x] [Review][Defer] `Promise.all` rejection swallowed by React transition — if either Server Action `throw`s, the `startTransition` async rejection is unhandled; not currently reachable (both actions have try/catch) [`NeedSheet.tsx:118`] — deferred, pre-existing pattern, not reachable

## Dev Notes

### ⚠️ CRITICAL: `null` State Prevents Flash

`backlinks` is typed as `string[] | null`:
- `null` = loading (section hidden entirely via `backlinks !== null` guard)
- `[]` = loaded, empty
- `[...ids]` = loaded, with backlinks

Do NOT initialize `backlinks` to `[]` — this causes a flash of "No backlinks." while the fetch is in flight. `null` hides the section during the `startTransition` fetch period (same pattern used to prevent premature empty states).

### ⚠️ CRITICAL: `Promise.all` with Two Server Actions

`getLinksForNeed` and `getBacklinksForNeed` are both called inside the same `startTransition` via `Promise.all`:

```tsx
const [linksResult, backlinksResult] = await Promise.all([
  getLinksForNeed(initialNeed.id),
  getBacklinksForNeed(initialNeed.id),
])
```

- Both are read-only Server Actions — safe to call concurrently
- A single cancellation token (`linksRequestRef`) guards both state updates
- Both results are checked in the same `if (token === linksRequestRef.current)` block
- Only one `startTransition` call — `isPending` covers both fetches

### ⚠️ CRITICAL: `linksRequestRef` Cancellation Applies to Both

The existing `linksRequestRef` cancellation token (added in Story 4.1 review) prevents stale results from rapidly-opened different needs populating wrong state. This token guards **both** the links and backlinks state updates — no separate ref needed.

### ⚠️ CRITICAL: No DB Changes Required

- AD-3: `SELECT from_id FROM need_link WHERE to_id = ?` — no stored column, computed at read time ✅
- AD-11: `deleteNeed` already has `DELETE FROM need_link WHERE from_id = ? OR to_id = ?` (Story 4.1) ✅
- No new migrations, no schema changes, no index changes (deferred: `idx_need_link_to_id` in `deferred-work.md`)

### ⚠️ CRITICAL: `setBacklinks(null)` Must Be Called in BOTH Branches

In `useEffect([open])`, `setBacklinks(null)` must be called:
1. **Edit branch** (before `startTransition`) — resets from any previous need's backlinks
2. **Create branch** (alongside `initialLinksRef.current = []`) — ensures clean state if user switches from edit to create mode

### ⚠️ CRITICAL: better-sqlite3 Is Synchronous

`getBacklinksForNeed` uses synchronous `db.prepare().all()`. Do NOT add `async` to the DB callback. The `async` keyword is on the Server Action function wrapper only, not on any DB call.

### ⚠️ CRITICAL: Backlinks Are Read-Only — No isDirty Impact

Backlinks are not part of `FormState`. They have no `initialRef`, no `isDirty` comparison, no `handleSave` passthrough. They are display-only. The `isDirty` logic in `NeedSheet` does **not** change.

### Current `NeedSheet.tsx` State (as of Story 4.1 completion)

Key facts the dev agent must know:
- Line 34: existing import includes `getLinksForNeed` — extend this line, do not add a second import
- Line 79: `linksRequestRef = useRef(0)` — reuse as cancellation token for both calls
- Line 80: `initialLinksRef = useRef<string[]>([])` — unchanged, links dirty tracking only
- Lines 104–123: edit branch of `useEffect([open])` — this is the block to modify
- Lines 125–136: create branch — add `setBacklinks(null)` here
- Line 359–366: Links `<div>` section — insert backlinks `<div>` immediately after its closing `</div>`
- Line 34 imports from `@/lib/actions/needs`: add `getBacklinksForNeed` to this destructure
- `IdChip` already imported at line 36: `import { IdChip } from '@/components/needs/IdChip'`

### Stack Versions (Carry-forward from Story 4.1)

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
| AD-1 — Server-side DB access only | `getBacklinksForNeed` is a `'use server'` action; `NeedSheet` never imports `db` directly |
| AD-2 — Server Actions for reads + mutations | `getBacklinksForNeed` is a Server Action (not a Route Handler) — same pattern as `getLinksForNeed` |
| AD-3 — Backlinks computed at read time | `SELECT from_id FROM need_link WHERE to_id = ?` — never a stored column |
| AD-6 — Single generic link type | `need_link` queried with no type column; backlinks are all incoming `from_id` values |
| AD-11 — need_link cleanup on delete | `deleteNeed` already handles `OR to_id = ?` — no change needed |
| `'use client'` scope | Only `NeedSheet` (already `'use client'`) is modified; no scope changes |
| Server Action return shape | `getBacklinksForNeed` returns `ActionResult<string[]>` |

### Project Structure After This Story

```
lib/actions/needs.ts              ← UPDATE (add getBacklinksForNeed)
components/needs/NeedSheet.tsx    ← UPDATE (backlinks state, Promise.all fetch, "← Linked by" JSX)
```

No new files. No schema changes. No new types.

### Cross-Story Awareness

- **Story 5.1 (Filter Bar)**: No impact on backlinks display — filter state is URL-only (AD-5); NeedSheet is independent of filter bar state.
- **Story 4.1 (previous)**: `deleteNeed` AD-11 cleanup already correct; `LinksInput` unchanged. The new "← Linked by" section renders **below** the existing `LinksInput` section in the form body.

### Note on `deferred-work.md` Carry-Forward

No new deferred items from this story. Pre-existing deferred item from Story 4.1 review remains:
> **No index on `need_link.to_id`** (`lib/db.ts:52`) — `SELECT from_id FROM need_link WHERE to_id = ?` is a full table scan. Add `CREATE INDEX IF NOT EXISTS idx_need_link_to_id ON need_link(to_id)` when row count warrants it (NFR-2: ≤500 rows in MVP).

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2; FR-9
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-3 (backlinks at read time), AD-6, AD-11
- UX Experience: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — Links Input component pattern; Flow 2; UX-DR10
- Previous Story: `_bmad-output/implementation-artifacts/4-1-link-needs-together-and-show-link-counts-in-table.md` — `getLinksForNeed` pattern, `linksRequestRef` cancellation token, `NeedSheet` current state
- Existing files modified: `sphinx-needs-clone/lib/actions/needs.ts`, `sphinx-needs-clone/components/needs/NeedSheet.tsx`

## Dev Agent Record

### Agent Model Used

Windsurf Cascade (bmad-dev-story workflow) — 2026-08-04

### Debug Log References

None — tsc and build passed clean on first attempt.

### Completion Notes List

- Task 1: Added `getBacklinksForNeed` Server Action to `lib/actions/needs.ts` immediately after `getLinksForNeed`. Uses `SELECT from_id FROM need_link WHERE to_id = ?` per AD-3. No new imports or types required.
- Task 2: Updated `NeedSheet.tsx` — extended import, added `backlinks: string[] | null` state, replaced single `getLinksForNeed` call with `Promise.all([getLinksForNeed, getBacklinksForNeed])` in same `startTransition` (shared cancellation token), added `setBacklinks(null)` reset in both edit and create branches, inserted read-only "← Linked by" section between Links and Description (only renders when `mode === 'edit' && backlinks !== null`).
- Task 3: Confirmed `deleteNeed` already executes `DELETE FROM need_link WHERE from_id = ? OR to_id = ?` — no code change required for AC5.
- Task 4: `npx tsc --noEmit` exit 0; `npm run build` exit 0 (18.4s, Turbopack).

### File List

- sphinx-needs-clone/lib/actions/needs.ts (MODIFIED)
- sphinx-needs-clone/components/needs/NeedSheet.tsx (MODIFIED)

### Change Log

- 2026-08-04: Implemented Story 4.2 — added `getBacklinksForNeed` Server Action, read-only "← Linked by" backlinks section in NeedSheet edit mode with `null`-guarded load state and shared `Promise.all` fetch
