# Sphinx Needs Clone — Next.js MVP

A browser-based requirements management tool that replicates the core [Sphinx Needs](https://sphinx-needs.readthedocs.io/) experience as an interactive web application. Create typed requirement objects ("needs"), link them together for traceability, and explore them in a filterable table — all persisted locally in SQLite with no external services required.

This repository also serves as a **BMad Method** workflow demo, showing the full planning-to-implementation lifecycle: PRD → UX Design → Architecture → Epics & Stories → Sprint Implementation.

---

## Purpose

Sphinx Needs is a powerful requirements-as-code tool but is locked to the Sphinx/RST toolchain — it requires Python, a build step, and plain-text file authoring. This project delivers the same core capability as a lightweight, interactive browser UI backed by a local SQLite database.

**Single-user MVP. No authentication. No cloud. No external services.**

---

## Features

- **Need Types** — Define custom need categories (e.g. `REQ`, `SPEC`, `TEST`, `IMPL`) with a name, short prefix, and display color. Manage them from the Settings page.
- **Status Values** — Configure custom lifecycle statuses (e.g. `open`, `in-review`, `closed`). The default `open` status is seeded automatically and cannot be deleted.
- **Need CRUD** — Create, edit, and delete needs via a right-side sheet panel. Each need has: auto-generated ID (e.g. `REQ_001`, editable), type, title, status, tags, and description.
- **Traceability Links** — Link needs together using a search-and-select input. Backlinks (incoming references) are computed automatically at read time via a database JOIN — no denormalized storage.
- **Sortable Table** — View all needs in a sticky-header table with click-to-sort on any column. Sort state is preserved in the URL.
- **Filter Bar** — Filter by type, status, tags (any-of), and free-text search across ID and title. All filter state lives in URL search params — filters are bookmarkable and refresh-safe.
- **Keyboard Shortcuts** — `n` new need, `s` settings, `Escape` close sheet, `Ctrl+S`/`⌘S` save form, `Ctrl+F`/`⌘F` focus search, `↑`/`↓` table row navigation.
- **Dark / Light Mode** — System-default theme via `next-themes`. No manual toggle required.
- **Zero setup** — SQLite database is created automatically on first run. No migrations, no environment variables, no external services.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui + Base UI |
| Icons | Lucide React |
| Toasts | Sonner |
| Theme | next-themes |
| Database | SQLite via `better-sqlite3` |
| Runtime | Node.js 22 LTS |

### Architecture Pattern

**Server-Centric Layered** — four layers with one-way dependency flow:

```
Presentation  →  Application  →  Data Access  →  Persistence
(app/ + components/)  (lib/actions/ + lib/queries/)  (lib/db.ts)  (.data/app.db)
```

- **Server Actions** own all mutations (`lib/actions/`)
- **React Server Components** own all reads via `lib/queries/` — no `fetch()` for internal data
- **`lib/db.ts`** carries `import 'server-only'` — never accessible from client components
- **One Route Handler** exists: `GET /api/needs/search` for link autocomplete (streaming-compatible)

---

## Project Structure

```
bmad-demo/
├── sphinx-needs-clone/          # Next.js application (the runnable app)
│   ├── app/                     # App Router pages and API routes
│   │   ├── page.tsx             # Home — needs table (RSC)
│   │   ├── settings/page.tsx    # Settings — need types & statuses (RSC)
│   │   └── api/needs/search/    # GET autocomplete route handler
│   ├── components/
│   │   ├── needs/               # NeedsTable, NeedSheet, FilterBar, NeedTypeBadge
│   │   ├── settings/            # NeedTypeTable, StatusList
│   │   └── ui/                  # shadcn primitives (CLI-generated)
│   ├── lib/
│   │   ├── db.ts                # better-sqlite3 singleton + schema init
│   │   ├── queries/             # listNeeds, getNeed, listNeedTypes, listStatuses
│   │   └── actions/             # createNeed, updateNeed, deleteNeed, type/status actions
│   ├── types/index.ts           # Shared entity interfaces + SEARCH_PARAM_KEYS
│   └── .data/                   # SQLite database file (gitignored)
│
├── _bmad-output/                # BMad workflow artifacts
│   ├── planning-artifacts/      # PRD, UX design, architecture spine, epics & stories
│   └── implementation-artifacts/ # Story files, code review reports, sprint status
│
└── _bmad/                       # BMad Method configuration
```

---

## Local Development Setup

### Prerequisites

- **Node.js 22 LTS** — [nodejs.org](https://nodejs.org)
- **npm** (bundled with Node.js)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd bmad-demo

# 2. Navigate to the app directory
cd sphinx-needs-clone

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The SQLite database is created automatically at `sphinx-needs-clone/.data/app.db` on first request. No additional setup is required.

### Other Commands

```bash
npm run build   # Production build
npm run start   # Run production build
npm run lint    # ESLint
```

---

## Seed Data

Example data based on a **Digital Car Key** project is included in `scripts/seed.js`. It loads 19 needs (6 REQ · 5 SPEC · 4 TEST · 4 IMPL) with 25 traceability links, plus 4 need types and additional status values.

> **Prerequisite:** the app must have been started at least once (`npm run dev`) so the database and schema are initialised before any seed command runs.

| Command | What it does |
|---|---|
| `npm run seed` | Add seed data. Safe to run multiple times — uses `INSERT OR IGNORE`, will not duplicate. |
| `npm run seed:reset` | Wipe all existing data and re-insert the full seed set. Use this to restore a clean example state. |
| `npm run seed:clear` | Remove all needs, need types, and non-default status values. Leaves the database empty (only the built-in `open` status is preserved). |

```bash
# First-time setup with example data
npm run dev       # start the app once to initialise the DB (keep running)
npm run seed      # in a second terminal

# Restore clean example state after experimenting
npm run seed:reset

# Empty the database entirely
npm run seed:clear
```

---

## Database Schema

```
need_type   (id, name, prefix, color)
status_value (id, value)
need        (id PK, type_id FK→need_type, title, status, tags, description, seq, created_at, updated_at)
need_link   (from_id FK→need, to_id FK→need)   ← composite PK; no stored backlinks
```

- Foreign keys enforced via `PRAGMA foreign_keys = ON`
- `need.type_id` is `ON DELETE RESTRICT` — a type cannot be deleted while needs reference it
- `open` status is seeded at startup via `INSERT OR IGNORE`
- All link cleanup on need deletion runs in a single atomic transaction

---

## Out of Scope (MVP)

- Authentication / multi-user support
- Hosted / cloud deployment
- `needs.json` import/export
- Multiple link types (one generic link relationship in MVP)
- Needflow diagrams, Gantt/pie/bar charts
- Versioning or change history
- External integrations (Jira, GitHub)

---

## BMad Workflow Artifacts

The `_bmad-output/` directory contains the full planning trail produced using the [BMad Method](https://bmad-method.org):

| Artifact | Path |
|---|---|
| PRD | `_bmad-output/planning-artifacts/prds/prd-bmad-demo-2026-07-16/prd.md` |
| UX Design | `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/` |
| Architecture Spine | `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
