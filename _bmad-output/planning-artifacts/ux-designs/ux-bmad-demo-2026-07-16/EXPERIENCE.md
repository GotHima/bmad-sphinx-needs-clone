---
name: Sphinx Needs Clone
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-bmad-demo-2026-07-16/prd.md
updated: 2026-07-16
---

# Sphinx Needs Clone — Experience Spine

## Foundation

Single-surface responsive web. shadcn/ui on Next.js (App Router) with Tailwind CSS and TypeScript. `DESIGN.md` is the visual identity reference. Single-user, no auth. System-default theme (light/dark). The primary use surface is desktop/laptop; mobile is not a target for MVP but must not be broken.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Needs Table | App root `/` | Full list of all needs; primary workspace |
| Need Detail Sheet | Table row click | View, edit, delete a single need |
| New Need Sheet | "New Need" button / `n` shortcut | Create a new need |
| Settings | Top bar "Settings" link / `s` shortcut | Manage need types and status values |

Navigation is flat — no sidebar, no nesting. The top bar carries the only persistent chrome: app name (left) and two action slots (New Need button + Settings link, right). The table fills the rest of the viewport.

The Need Detail Sheet and New Need Sheet are the same component in two modes — they slide in from the right and overlay the table without leaving the page. Modal stacks one level deep maximum; the delete confirm is a shadcn `AlertDialog` on top of the sheet, not a third level.

## Voice and Tone

Terse and precise. This is a tool, not a product with a personality. Microcopy tells the user what happened or what to do — nothing more.

| Do | Don't |
|---|---|
| "No needs yet. Create the first one." | "You haven't added any needs yet! Get started below 🚀" |
| "ID already in use." | "Oops! That ID is taken. Please choose a different one." |
| "Deleted." | "Need successfully deleted!" |
| "Linked to REQ_001, SPEC_003" | "This need is linked to 2 other needs" |
| "No results." | "We couldn't find any needs matching your search." |

Error messages name the constraint, not the feeling. Success confirmations are a Toast that disappears — they don't block.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components` and shadcn defaults.

| Component | Use | Behavioral rules |
|---|---|---|
| Needs Table | `/` | Full-width, sortable by any column header click (toggle asc/desc). Sticky header. Row click anywhere opens Need Detail Sheet. Hover reveals a row-level delete icon (right-aligned, destructive). No multi-select for MVP. |
| Filter Bar | Above table | Three filter controls inline: Type (multi-select dropdown), Status (multi-select dropdown), Tags (token input, any-of match). Plus a free-text search input (searches id + title, debounced 200ms). All filters compose with AND logic. Clear-all button appears when any filter is active. |
| Need Detail / New Need Sheet | Slides from right | 480px wide on `≥ lg`; full-width on `< lg`. Contains the need form. Sheet header: need ID chip + type badge (detail mode) or "New Need" + type selector (create mode). Save button in footer. Escape or backdrop click closes without saving (with unsaved-changes guard). |
| Need Form | Inside sheet | Fields in order: Type (Select), ID (Input, monospace, editable, auto-generated default), Title (Input), Status (Select), Tags (token input, comma-separated), Links (search-and-select, see below), Description (Textarea, resizable). Labels above inputs. Inline validation on blur. |
| Links Input | Need Form | Text input that searches needs by ID or title as the user types (debounced 200ms). Results appear in a popover list. Selecting a result adds it as a removable chip below the input. Backlinks (computed) shown as a read-only chip list below the outgoing links section with a "← Linked by" label — not editable here. |
| Tags Input | Need Form | Free-text input; pressing comma or Enter adds the current text as a removable chip. Chips are inline. On save, stored as a comma-separated string. |
| Settings — Need Types | `/settings` → Types tab | Table of configured need types: columns Name, Prefix, Color (color swatch). "Add type" row at bottom. Inline edit on row click. Delete icon per row (disabled if any needs use that type — show tooltip "In use"). Color picker is a native `<input type="color">`. |
| Settings — Status Values | `/settings` → Statuses tab | Flat list of configured status strings. Drag-to-reorder deferred to v2; add/delete only. "open" is the default and cannot be deleted. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Initial load | Needs Table | shadcn `Skeleton` rows (5 rows × full width). Resolves on first data fetch. |
| Empty table (no needs) | Needs Table | Centered empty state: label text "No needs yet." + primary "New Need" button. No illustration. |
| Empty filter results | Needs Table | Table body shows one full-width row: "No results. Try adjusting the filters." Clear-all link inline. |
| Need form loading | Sheet | Form fields show `Skeleton` while type/status options load. Rare — data is local. |
| Duplicate ID | Need Form — ID field | Inline error below field on blur: "ID already in use." Save button disabled until resolved. Does not fire on the current need's own ID in edit mode. |
| Unsaved changes | Sheet close | shadcn `AlertDialog`: "Discard changes?" with Discard + Keep Editing actions. Triggered when: form is dirty and user presses Escape, clicks backdrop, or navigates away. |
| Delete confirm | Row hover / sheet | shadcn `AlertDialog`: "Delete [ID]? This will also remove all links to it." Destructive confirm button. |
| Save success | Sheet | Sheet closes. shadcn `Toast` (bottom-right, 3s): "Saved." Table row updates optimistically. |
| Save error | Sheet | Sheet stays open. shadcn `Toast` (destructive): "Couldn't save. Try again." Form state retained. |
| Delete success | Table | Row removed optimistically. `Toast`: "Deleted." No undo for MVP. |
| Type in use — delete blocked | Settings Types | Row delete icon shows tooltip: "In use by N needs." Icon is visually disabled (muted, cursor not-allowed). |

## Interaction Primitives

Keyboard shortcuts for power users — this tool's user is a developer.

| Key | Context | Action |
|---|---|---|
| `n` | Table focused | Open New Need sheet |
| `Escape` | Sheet open | Close sheet (with unsaved-changes guard) |
| `s` | Global | Go to Settings |
| `Enter` | Table row focused | Open Need Detail sheet for that row |
| `↑` / `↓` | Table | Move row focus |
| `Ctrl+S` / `⌘S` | Sheet open | Save the form |
| `Ctrl+F` / `⌘F` | Table | Focus the free-text search input |

**Mouse:** click row to open detail, click column header to sort, click backdrop to close sheet. Hover on row reveals delete icon.

**No drag-and-drop** in MVP — table order is sort-order only.

## Accessibility Floor

Behavioral. Visual contrast inherits from shadcn's WCAG AA-compliant defaults; primary blue override (`#2563EB`) verified at ≥ 4.5:1 against white.

- WCAG 2.2 AA across all surfaces.
- Keyboard shortcuts are supplemental — every action is reachable via mouse + keyboard navigation without shortcuts.
- `Tab` order matches visual reading order on every surface. Sheet traps focus while open; focus returns to the triggering row on close.
- `Escape` always closes the topmost sheet or dialog.
- Table rows are keyboard-navigable with `↑`/`↓`; `Enter` opens detail.
- Links popover announces results via `aria-live="polite"` as they update.
- Form fields have explicit `<label>` associations (not placeholder-only). Inline error messages are linked via `aria-describedby`.
- Color alone is never the sole signal — the need-type badge includes the type name text, not just color.
- Delete `AlertDialog` receives focus on open; confirm button is not the default focus target (destructive action guard).

## Key Flows

### Flow 1 — Gan creates his first requirement (day one, fresh install)

1. Gan opens the app in a browser tab. Table loads with the empty state: "No needs yet." and a "New Need" button.
2. He clicks "New Need". The sheet slides in from the right. Type defaults to the first configured type (`req`). ID auto-populates as `REQ_001`.
3. He types a title: "System shall support user-defined need types." Leaves status as `open`. Adds tag `configuration`.
4. He clicks Save (or presses `Ctrl+S`).
5. **Climax:** The sheet closes. The table now shows one row: `REQ_001 · req · System shall support user-defined need types · open · configuration`. The empty state is gone. The tool is alive.

### Flow 2 — Gan links a spec to a requirement

1. Gan has `REQ_001` in the table. He presses `n`, creates `SPEC_001` ("Need type configuration screen") of type `spec`.
2. In the Links field he types "REQ" — the popover shows `REQ_001 · System shall support...`. He clicks it. It appears as a chip: `REQ_001`.
3. He saves. Table shows `SPEC_001` with a "1 link" indicator in the Links column.
4. **Climax:** He clicks `REQ_001` to open its detail. The "← Linked by" section now shows `SPEC_001` as a backlink — computed automatically. The traceability is bidirectional without any extra step.

### Flow 3 — Gan filters the table to find all open specs

1. Gan has 20 needs across types and statuses.
2. He opens the Type dropdown and selects `spec`. The table immediately filters to specs only.
3. He opens the Status dropdown and selects `open`. Table narrows further.
4. **Climax:** He sees 4 open specs at a glance. He clicks one to edit it, changes status to `in_review`, saves. The table re-filters — that row disappears from the result set. The filter holds; he didn't lose his place.
