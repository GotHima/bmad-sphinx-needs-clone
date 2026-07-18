---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-bmad-demo-2026-07-16/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md
---

# Sphinx Needs Clone - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Sphinx Needs Clone (Next.js MVP), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: The system shall support user-defined need types (e.g., `req`, `spec`, `test`, `impl`).
FR-2: Each need type shall have: a name, a short prefix (used for ID generation), and a display color.
FR-3: Need types shall be configurable via a settings page (create, edit, delete).
FR-4: The system shall allow users to create a need with fields: id (auto-generated PREFIX_001 format, editable), type, title, status (default `open`), tags (comma-separated), description (plain textarea).
FR-5: The system shall allow users to edit any field of an existing need.
FR-6: The system shall allow users to delete a need; deletion shall also remove all link references to it from other needs.
FR-7: IDs shall be globally unique; the system shall prevent saving a need with a duplicate ID.
FR-8: A need shall support outgoing links to one or more other needs by ID.
FR-9: The system shall automatically compute and display incoming backlinks (which needs link to this one).
FR-10: Links shall be added/removed from the need edit form via an ID search-and-select input.
FR-11: The system shall display all needs in a sortable, filterable table.
FR-12: The table shall support filtering by: type, status, tags (any-of), and free-text search across id and title.
FR-13: Visible table columns: ID, Type, Title, Status, Tags, Links (count or IDs).
FR-14: Clicking a table row shall open the need detail/edit view.
FR-15: All data shall be persisted in a local SQLite database via a Next.js API route layer.
FR-16: The database shall be created automatically on first run if it does not exist.
FR-implicit-1: Status values shall be user-configurable (add/delete); `open` is the default and cannot be deleted.

### NonFunctional Requirements

NFR-1: Stack: Next.js (App Router), TypeScript (strict mode), Tailwind CSS, SQLite via `better-sqlite3`.
NFR-2: Performance: Table view shall render up to 500 needs without pagination.
NFR-3: Deployability: Must run locally with `npm run dev`; no external services or environment variables required.
NFR-4: Code quality: TypeScript strict mode; no `any` types in production code paths.

### Additional Requirements

- **Project scaffold**: No starter template is specified — greenfield Next.js App Router project initialized via `create-next-app`. Epic 1 Story 1 must set up the project.
- **DB schema init at startup**: `lib/db.ts` runs `CREATE TABLE IF NOT EXISTS` for all tables on module load + `PRAGMA foreign_keys = ON` (AD-8, AD-10). No manual migration step.
- **Server-only data layer**: `lib/db.ts` must carry `import 'server-only'`; never imported by Client Components (AD-1).
- **Server Actions for mutations**: All create/update/delete ops are `'use server'` functions in `lib/actions/`; one GET Route Handler for link autocomplete only (AD-2).
- **Backlinks computed at read time**: No stored backlinks column; derived via JOIN on `need_link` (AD-3).
- **ID generation in BEGIN IMMEDIATE transaction**: Prevents concurrent seq collision (AD-12).
- **need_link cleanup in transaction on delete**: Atomic delete of links + need (AD-11).
- **FK enforcement**: `PRAGMA foreign_keys = ON`; `need.type_id ON DELETE RESTRICT` (AD-10).
- **URL search params own filter state**: `SEARCH_PARAM_KEYS` constant exported from `types/index.ts` (AD-5, AD-13).
- **Need-type color via prop/inline style**: Never a hardcoded Tailwind class; always from DB config (AD-7).
- **Server Action return shape**: Always `{ success: true, data: T }` or `{ success: false, error: string, field?: string }`.
- **Tags stored as comma-separated TEXT**: Split/join at boundary — never stored as JSON.
- **`open` status seeded at DB init**: `INSERT OR IGNORE`; undeletable via Server Action guard (AD-9).
- **`'use client'` at lowest subtree**: Never on page files or root layout.
- **shadcn primitives in `components/ui/`**: CLI-generated, never hand-edited.

### UX Design Requirements

UX-DR1: Initialize shadcn/ui with the brand theme: primary color `#2563EB` (light) / `#60A5FA` (dark), tighter corner radii (`sm: 3px`, `md: 5px`, `lg: 7px`), system-default dark/light mode via `next-themes`.
UX-DR2: Implement `NeedTypeBadge` component: uppercase 11px semibold label, color via inline style from DB-stored hex, white foreground, `rounded-sm` (3px). Used in table Type column and need detail header.
UX-DR3: Implement `StatusBadge` component: muted background/foreground, 11px medium, `rounded-sm`. All statuses share muted palette in MVP.
UX-DR4: Implement `IdChip` component: monospace font, 12px medium, primary-color text — purely presentational. Used in table ID column, links list, backlinks list.
UX-DR5: App shell layout: full-viewport, top bar (48px) with app name left + "New Need" button + Settings link right; content area fills remaining height with needs table; no sidebar.
UX-DR6: Implement `NeedSheet` as a right-side shadcn `Sheet` (480px on `≥ lg`, full-width on `< sm`). Shared component for both create and edit modes. Escape + backdrop click closes with unsaved-changes guard (`AlertDialog`: "Discard changes?").
UX-DR7: Implement `FilterBar` above the table: Type multi-select, Status multi-select, Tags token-input (any-of), free-text search (debounced 200ms). All filters AND-composed. Clear-all button when any active.
UX-DR8: Needs table with sticky header, sortable columns (click to toggle asc/desc), row click opens Need Detail Sheet, hover reveals row-level delete icon (destructive, right-aligned).
UX-DR9: Need form field order: Type → ID → Title → Status → Tags → Links → Description. Labels above inputs. Inline validation on blur. ID field is monospace and editable.
UX-DR10: Links search-and-select input: debounced text input searches needs by ID or title; results in shadcn `Popover`; selected needs shown as removable chips. Backlinks shown as read-only chips with "← Linked by" label.
UX-DR11: Settings page with two tabs — "Need Types" (table: Name, Prefix, Color swatch; inline edit on row click; delete disabled with tooltip "In use by N needs" when referenced; native `<input type="color">` for picker) and "Status Values" (flat list; add/delete only; `open` undeletable).
UX-DR12: State patterns: `Skeleton` rows on initial table load; empty state "No needs yet." + "New Need" button; empty filter results "No results. Try adjusting the filters." + clear-all inline; save success `Toast` "Saved." (3s); save error `Toast` (destructive) "Couldn't save. Try again."; delete success `Toast` "Deleted."; delete confirm `AlertDialog` "Delete [ID]? This will also remove all links to it."
UX-DR13: Keyboard shortcuts: `n` = open New Need sheet, `Escape` = close sheet, `s` = go to Settings, `Enter` on focused row = open detail, `↑`/`↓` = table row navigation, `Ctrl+S`/`⌘S` = save form, `Ctrl+F`/`⌘F` = focus search.
UX-DR14: Accessibility floor: WCAG 2.2 AA; focus trap in open Sheet; `Tab` order matches visual order; `aria-live` on links popover results; explicit `<label>` associations on all form fields; `aria-describedby` for inline errors; delete `AlertDialog` focuses confirm button is NOT the default focus target.

### FR Coverage Map

| FR | Epic |
|---|---|
| FR-1 | Epic 2 — Need type: name, prefix, color |
| FR-2 | Epic 2 — Need type color stored in DB |
| FR-3 | Epic 2 — Settings: need type CRUD |
| FR-4 | Epic 3 — Create need with all fields |
| FR-5 | Epic 3 — Edit need fields |
| FR-6 | Epic 3 — Delete need + cascade links |
| FR-7 | Epic 3 — Unique ID enforcement |
| FR-8 | Epic 4 — Outgoing links |
| FR-9 | Epic 4 — Backlinks via JOIN |
| FR-10 | Epic 4 — Link search-and-select input |
| FR-11 | Epics 3 + 5 — Sortable (E3), Filterable (E5) |
| FR-12 | Epic 5 — Filter by type, status, tags, text |
| FR-13 | Epic 3 — Table columns (links count added in E4) |
| FR-14 | Epic 3 — Row click opens detail sheet |
| FR-15 | Epic 1 — SQLite persistence setup |
| FR-16 | Epic 1 — DB auto-created on first run |
| FR-implicit-1 | Epic 2 — Status CRUD, `open` undeletable |

## Epic List

### Epic 1: Project Foundation & App Shell
Users get a running Next.js app with the full stack wired up, brand theme applied, and SQLite database initialized and seeded — the substrate everything else is built on.
**FRs covered:** FR-15, FR-16
**NFRs:** NFR-1, NFR-3, NFR-4
**UX:** UX-DR1, UX-DR5
**Architecture:** Greenfield `create-next-app` scaffold; `lib/db.ts` with schema init + PRAGMA FK + `open` seed; app shell layout (top bar 48px, content area); shadcn brand theme delta.

### Epic 2: Need Type & Status Configuration
Users can configure the building blocks for needs — create, edit, and delete need types (names, prefixes, colors) and manage status values — through the Settings page. The app is now ready to accept real needs.
**FRs covered:** FR-1, FR-2, FR-3, FR-implicit-1
**UX:** UX-DR2, UX-DR3, UX-DR11

### Epic 3: Need Creation, Editing & Table View
Users can create needs, edit them in a side sheet, delete them, and see all needs in a sortable table with row-click detail open. The core CRUD loop is fully usable.
**FRs covered:** FR-4, FR-5, FR-6, FR-7, FR-11 (sortable), FR-13, FR-14
**NFR:** NFR-2
**UX:** UX-DR4, UX-DR6, UX-DR8, UX-DR9, UX-DR12, UX-DR13, UX-DR14

### Epic 4: Need Links & Backlinks
Users can link needs together from the edit form and see incoming backlinks on each need. The Links column in the table shows link counts.
**FRs covered:** FR-8, FR-9, FR-10
**UX:** UX-DR10

### Epic 5: Table Filtering & Search
Users can filter the needs table by type, status, tags, and free text. All filter state lives in the URL — filters are bookmarkable and refresh-safe.
**FRs covered:** FR-12, FR-11 (filterable)
**UX:** UX-DR7

---

## Epic 1: Project Foundation & App Shell

Users get a running Next.js app with the full stack wired up, brand theme applied, and SQLite database initialized and seeded — the substrate everything else is built on.

### Story 1.1: Initialize Next.js Project Scaffold with Brand Theme

As a developer,
I want a Next.js App Router project with TypeScript strict mode, Tailwind CSS 4, and shadcn/ui initialized with the brand theme delta,
So that all subsequent stories build on a consistent, typed, themed foundation running locally with `npm run dev`.

**Acceptance Criteria:**

**Given** I run `npm run dev` in the project root
**When** I open `http://localhost:3000`
**Then** the app loads without errors and renders a page with the correct background color in both light and dark modes (system default)

**Given** the shadcn/ui CLI has been initialized
**When** I inspect the generated CSS config
**Then** the primary color token is `#2563EB` (light) / `#60A5FA` (dark), corner radii are `sm: 3px`, `md: 5px`, `lg: 7px`, and `next-themes` is configured with `defaultTheme="system"`

**Given** `tsconfig.json` is present
**When** I run `tsc --noEmit`
**Then** it exits 0 with strict mode enabled (`"strict": true`)

**Given** the project file structure
**When** I inspect it
**Then** it follows kebab-case for directories and non-component files, `PascalCase.tsx` for React components, and `app/`, `components/`, `lib/`, `types/` directories exist

### Story 1.2: Initialize SQLite Database Layer

As a developer,
I want a server-only database module that creates all tables and seeds the default status on process start,
So that the app works on first run without any manual setup step.

**Acceptance Criteria:**

**Given** the app starts via `npm run dev` and `.data/db.sqlite` does not exist
**When** any server-side module is loaded
**Then** `lib/db.ts` creates the `.data/` directory and `db.sqlite` file automatically, and all four tables exist: `need_type`, `status_value`, `need`, `need_link`

**Given** `lib/db.ts` has been loaded
**When** I inspect the SQLite database
**Then** `PRAGMA foreign_keys` is ON, `need.type_id` is declared `ON DELETE RESTRICT`, and `need_link` has exactly `from_id TEXT` and `to_id TEXT` columns (composite PK, no other columns)

**Given** the DB has been initialized
**When** I query `SELECT value FROM status_value`
**Then** exactly one row exists with `value = 'open'`

**Given** `lib/db.ts` is imported by a client component
**When** I run `next build`
**Then** the build fails with "This module cannot be imported from a Client Component" due to `import 'server-only'`

**Given** `types/index.ts` is present
**When** I inspect it
**Then** it exports entity interfaces (`Need`, `NeedType`, `StatusValue`, `NeedLink`) and the `SEARCH_PARAM_KEYS` constant (`{ type, status, tags, q }`)

### Story 1.3: App Shell Layout

As a user,
I want a consistent app shell with a top bar and content area that adapts to my system's light/dark preference,
So that every page in the app has a predictable, professional layout to work within.

**Acceptance Criteria:**

**Given** I open the app in a browser
**When** the root layout renders
**Then** a top bar of exactly 48px height is visible, with the app name ("Sphinx Needs Clone" or equivalent) on the left, and placeholder "New Need" button and "Settings" link on the right

**Given** the app shell is rendered
**When** I inspect the layout
**Then** the content area below the top bar fills the remaining viewport height with no overflow or scroll on the shell itself

**Given** my OS is set to dark mode
**When** I load the app
**Then** the dark color scheme is applied automatically without any theme toggle interaction

**Given** I navigate to `/` (home) and `/settings`
**When** either page loads
**Then** the top bar is present on both pages with consistent appearance; `/` renders an empty content area (no table yet); `/settings` renders a placeholder or empty settings page

---

## Epic 2: Need Type & Status Configuration

Users can configure the building blocks for needs — create, edit, and delete need types (names, prefixes, colors) and manage status values — through the Settings page.

### Story 2.1: Need Types Management in Settings

As a user,
I want to create, edit, and delete need types with a name, prefix, and color in the Settings page,
So that I can define the categories of needs my project uses before creating any needs.

**Acceptance Criteria:**

**Given** I navigate to `/settings`
**When** the page loads
**Then** a "Need Types" tab is visible and active by default, showing a table with columns: Name, Prefix, Color (swatch), and Actions

**Given** the Need Types table is visible
**When** I click "Add Need Type"
**Then** an inline form row or modal appears with inputs for Name (text), Prefix (text, max 6 chars, uppercase enforced), and Color (native `<input type="color">`)

**Given** I fill in a valid Name, Prefix, and Color and submit
**When** the Server Action completes successfully
**Then** the new type appears in the table immediately, the `need_type` row is persisted in SQLite, and a "Saved." toast appears

**Given** an existing need type row in the table
**When** I click the row to edit
**Then** the row becomes editable inline; changes save on blur or explicit save; a "Saved." toast confirms

**Given** a need type that has no needs referencing it
**When** I click the delete icon
**Then** a confirm `AlertDialog` appears; on confirm the type is removed from the table and deleted from SQLite

**Given** a need type that has one or more needs referencing it
**When** I hover the delete icon
**Then** the icon is disabled and a tooltip reads "In use by N need(s)"

**Given** a `NeedTypeBadge` component is rendered anywhere in the app
**When** it receives `name` and `color` props
**Then** it renders as an uppercase 11px semibold label with the given hex color as background via inline style (never a Tailwind color class), white foreground text, and 3px border radius

### Story 2.2: Status Values Management in Settings

As a user,
I want to add and delete custom status values in the Settings page,
So that I can define the lifecycle states relevant to my project.

**Acceptance Criteria:**

**Given** I navigate to `/settings` and click the "Status Values" tab
**When** the tab renders
**Then** a flat list of all status values is displayed; each row shows the value and a delete button; `open` shows a lock icon and its delete button is disabled

**Given** I click "Add Status"
**When** I type a new value and confirm
**Then** the value is saved to the `status_value` table, appears in the list, and a "Saved." toast confirms

**Given** I attempt to delete `open`
**When** the Server Action is called
**Then** it returns `{ success: false, error: "Cannot delete the default status" }` and the UI shows an error toast; the `open` row remains

**Given** I delete a status value that is not `open`
**When** the confirm `AlertDialog` is accepted
**Then** the value is removed from the list and deleted from SQLite

**Given** the Settings page status list
**When** a `StatusBadge` is rendered
**Then** it uses muted background/foreground (shadcn defaults), 11px medium weight, 3px border radius — same style regardless of status value

---

## Epic 3: Need Creation, Editing & Table View

Users can create needs, edit them in a side sheet, delete them, and see all needs in a sortable table. The core CRUD loop is fully usable.

### Story 3.1: Needs Table with Sortable Columns

As a user,
I want to see all my needs in a sortable table on the home page,
So that I can get an overview of everything in the system and navigate to any need.

**Acceptance Criteria:**

**Given** I navigate to `/`
**When** the page loads
**Then** a table renders with sticky header and columns: ID (`IdChip` — monospace, primary color), Type (`NeedTypeBadge` — color from DB), Title, Status (`StatusBadge`), Tags (comma-separated), Links (shows `—` as placeholder)

**Given** the database contains no needs
**When** the table renders
**Then** an empty state message "No needs yet." is shown with a "New Need" button inline

**Given** the database contains needs
**When** the page first loads
**Then** skeleton rows are shown briefly while data is fetched from the RSC layer, then replaced with real rows — no layout shift

**Given** the table has data
**When** I click a column header
**Then** the table sorts by that column ascending; clicking again toggles to descending; the active sort column and direction are reflected in URL search params (`?sort=title&dir=asc`)

**Given** the table is sorted via URL params
**When** I refresh the page
**Then** the same sort order is preserved

**Given** the table contains up to 500 needs
**When** the page renders
**Then** all rows are visible without pagination and the table remains responsive

### Story 3.2: Create Need via Side Sheet

As a user,
I want to create a new need with all required fields using a side sheet form,
So that I can capture requirements, specs, or other items immediately.

**Acceptance Criteria:**

**Given** I click the "New Need" button in the top bar or press `n`
**When** the action fires
**Then** a `Sheet` slides in from the right (480px wide on `≥ lg`, full-width on `< sm`) in create mode with the title "New Need"

**Given** the create sheet is open
**When** I inspect the form
**Then** fields appear in this order: Type (select from DB types) → ID (monospace input, auto-populated as `PREFIX_001`, editable) → Title (text) → Status (select, default `open`) → Tags (comma-separated text input) → Description (plain textarea)

**Given** the Type is selected
**When** the type changes
**Then** the ID field prefix updates to match the selected type's prefix and the seq counter recalculates via server call

**Given** I press `Ctrl+S` (or `⌘S`) or click "Save"
**When** the `createNeed` Server Action completes successfully
**Then** a "Saved." toast appears (3s), the sheet closes, and the needs table refreshes showing the new row

**Given** I enter an ID that already exists in the database
**When** I attempt to save
**Then** the save is rejected, an inline error appears below the ID field ("ID already in use"), and the sheet remains open

**Given** I have entered data in the form and press `Escape` or click the backdrop
**When** the close action fires
**Then** an `AlertDialog` appears: "Discard changes?" with "Discard" (destructive) and "Keep editing" buttons; choosing "Discard" closes the sheet without saving

**Given** the form has no unsaved changes
**When** I press `Escape`
**Then** the sheet closes immediately without the AlertDialog

### Story 3.3: Edit and Delete Needs

As a user,
I want to edit an existing need and delete it when it's no longer needed,
So that I can keep my requirements up to date and remove obsolete entries.

**Acceptance Criteria:**

**Given** the needs table is visible
**When** I click any row
**Then** the `NeedSheet` opens in edit mode for that need, pre-populated with all current field values, and the sheet title shows the need's ID

**Given** the edit sheet is open
**When** I modify fields and press `Ctrl+S` (or `⌘S`) or click "Save"
**Then** the `updateNeed` Server Action saves the changes, a "Saved." toast appears, and the table row updates

**Given** the edit sheet is open
**When** I click the "Delete" button
**Then** a confirm `AlertDialog` appears: "Delete [ID]? This will also remove all links to it." with a destructive confirm button

**Given** I confirm deletion
**When** the `deleteNeed` Server Action runs
**Then** it executes `DELETE FROM need_link WHERE from_id = ? OR to_id = ?` and `DELETE FROM need WHERE id = ?` in a single SQLite transaction; a "Deleted." toast appears and the row is removed from the table

**Given** the needs table has rows
**When** I hover a row
**Then** a delete icon appears at the right edge of the row; clicking it triggers the same confirm AlertDialog as above

**Given** focus is on a table row
**When** I press `↑` or `↓`
**Then** focus moves to the previous or next row respectively; pressing `Enter` on a focused row opens the edit sheet for that need

**Given** an edit sheet is open with unsaved changes
**When** I press `Escape` or click the backdrop
**Then** the unsaved-changes `AlertDialog` appears before closing (same behavior as Story 3.2)

---

## Epic 4: Need Links & Backlinks

Users can link needs together from the edit form and see incoming backlinks on each need. The Links column in the table shows live link counts.

### Story 4.1: Link Needs Together and Show Link Counts in Table

As a user,
I want to link a need to other needs and see those links in the table,
So that I can represent traceability and dependency relationships between my requirements.

**Acceptance Criteria:**

**Given** the `NeedSheet` is open in create or edit mode
**When** I scroll to the Links section
**Then** a text input is visible with placeholder "Search by ID or title…"

**Given** I type at least 2 characters in the links search input
**When** 200ms have elapsed (debounce)
**Then** a `Popover` opens below the input showing up to 10 matching needs (ID + title) fetched from `GET /api/needs/search?q=<term>`; the current need is excluded from results

**Given** I click a result in the Popover
**When** the selection is made
**Then** the Popover closes, the selected need appears as a removable chip (showing its `IdChip`), and the input clears for another search

**Given** I click the × on a link chip
**When** the removal fires
**Then** the chip is removed from the list; the link will be deleted on save

**Given** I save the need (create or edit) with links selected
**When** the Server Action completes
**Then** `need_link` rows are inserted for new links and deleted for removed links in the same transaction as the need save; a "Saved." toast confirms

**Given** needs with outgoing links exist in the database
**When** the needs table renders
**Then** the Links column shows the outgoing link count as a number (e.g. `2`); needs with no links show `—`

**Given** the search Route Handler at `app/api/needs/search`
**When** called with a `q` param
**Then** it returns JSON `{ id, title, type }[]` filtered by `id LIKE ? OR title LIKE ?`, max 10 results, server-side only (no client DB import)

### Story 4.2: Display Backlinks on Need Detail

As a user,
I want to see which other needs link to the need I'm viewing,
So that I can understand where a requirement is referenced without manually searching.

**Acceptance Criteria:**

**Given** the `NeedSheet` is open in edit mode for a need that has incoming links
**When** I scroll below the Links (outgoing) section
**Then** a read-only "← Linked by" section is visible showing each linking need as an `IdChip` chip (not removable)

**Given** the `NeedSheet` is open in edit mode for a need with no incoming links
**When** I view the backlinks section
**Then** the section shows "No backlinks." as a muted empty state

**Given** the `NeedSheet` is open in create mode (need not yet saved)
**When** I inspect the sheet
**Then** no backlinks section is shown (an unsaved need cannot be linked to by others)

**Given** backlinks are displayed
**When** I inspect the query powering them
**Then** they are computed via `SELECT from_id FROM need_link WHERE to_id = ?` joined to `need` for title — never from a stored column on the `need` table (AD-3)

**Given** a need that has backlinks is deleted
**When** `deleteNeed` runs
**Then** the `need_link` rows where `to_id = deleted_id` are also deleted in the same transaction (AD-11), so no ghost backlinks appear on other needs

---

## Epic 5: Table Filtering & Search

Users can filter the needs table by type, status, tags, and free text. All filter state lives in the URL — filters are bookmarkable and refresh-safe.

### Story 5.1: Filter Bar with URL State and Server-Side Filtered Query

As a user,
I want to filter the needs table by type, status, tags, and free text from a filter bar above the table,
So that I can quickly narrow down to the needs I care about and share or bookmark the filtered view.

**Acceptance Criteria:**

**Given** I navigate to `/`
**When** the page loads
**Then** a `FilterBar` is visible above the needs table with four controls: Type (multi-select of DB types), Status (multi-select of DB status values), Tags (token-input, any-of matching), and a free-text search input (placeholder "Search ID or title…")

**Given** I select one or more values in any filter control
**When** my selection is applied (immediately for selects; after 200ms debounce for text input)
**Then** the URL updates with the corresponding `SEARCH_PARAM_KEYS` params (`type`, `status`, `tags`, `q`) using comma-joined values for multi-selects; the page re-renders with filtered results

**Given** active filters are present in the URL
**When** I refresh the page
**Then** the filter bar reflects the URL state and the table shows the same filtered results

**Given** multiple filters are active simultaneously
**When** the query runs
**Then** all active filters are AND-composed (a need must match every active filter to appear)

**Given** the Tags filter has values
**When** the query runs
**Then** a need matches if it contains ANY of the selected tag values (any-of semantics, not all-of)

**Given** the free-text `q` param is set
**When** the query runs
**Then** results include needs whose `id` OR `title` contain the search string (case-insensitive `LIKE`)

**Given** active filters yield no results
**When** the table renders
**Then** a message "No results. Try adjusting the filters." is shown with a "Clear filters" inline link that resets all filter params

**Given** at least one filter is active
**When** I view the filter bar
**Then** a "Clear all" button is visible; clicking it removes all filter params from the URL and returns the full unfiltered table

**Given** `FilterBar` reads and writes filter state
**When** I inspect the source
**Then** it imports `SEARCH_PARAM_KEYS` from `types/index.ts` — no hardcoded string literals for param keys; the RSC `app/page.tsx` also imports `SEARCH_PARAM_KEYS` for reading `searchParams` (AD-13)
