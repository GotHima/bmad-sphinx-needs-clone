---
baseline_commit: 8bade10af6562664ea4eff13ac12f1335c50a899
---

# Story 1.2: Initialize SQLite Database Layer

Status: done

## Story

As a developer,
I want a server-only database module that creates all tables and seeds the default status on process start,
So that the app works on first run without any manual setup step.

## Acceptance Criteria

1. **Given** the app starts via `npm run dev` and `.data/db.sqlite` does not exist  
   **When** any server-side module is loaded  
   **Then** `lib/db.ts` creates the `.data/` directory and `db.sqlite` file automatically, and all four tables exist: `need_type`, `status_value`, `need`, `need_link`

2. **Given** `lib/db.ts` has been loaded  
   **When** I inspect the SQLite database  
   **Then** `PRAGMA foreign_keys` is ON, `need.type_id` is declared `ON DELETE RESTRICT`, and `need_link` has exactly `from_id TEXT` and `to_id TEXT` columns (composite PK, no other columns)

3. **Given** the DB has been initialized  
   **When** I query `SELECT value FROM status_value`  
   **Then** exactly one row exists with `value = 'open'`

4. **Given** `lib/db.ts` is imported by a client component  
   **When** I run `next build`  
   **Then** the build fails with "This module cannot be imported from a Client Component" due to `import 'server-only'`

5. **Given** `types/index.ts` is present  
   **When** I inspect it  
   **Then** it exports entity interfaces (`Need`, `NeedType`, `StatusValue`, `NeedLink`) and the `SEARCH_PARAM_KEYS` constant (`{ QUERY, TYPE, STATUS, TAG, SORT }`)

## Tasks / Subtasks

- [x] Task 1 — Install better-sqlite3 (AC: 1, 2, 3, 4)
  - [x] Run `npm install better-sqlite3` in `sphinx-needs-clone/`
  - [x] Run `npm install --save-dev @types/better-sqlite3` — must match better-sqlite3 major (v12.x); check `@types/better-sqlite3` version available
  - [x] Confirm `serverExternalPackages: ['better-sqlite3']` is present in `next.config.ts` (already done in Story 1.1 — verify only, do NOT change)

- [x] Task 2 — Create `lib/db.ts` (AC: 1, 2, 3, 4)
  - [x] Add `import 'server-only'` as the first import (triggers build error if imported client-side — AC4)
  - [x] Import `Database` from `better-sqlite3` and `mkdirSync` from `fs`, `join` from `path`
  - [x] Compute `DB_DIR = join(process.cwd(), '.data')` and `DB_PATH = join(DB_DIR, 'db.sqlite')`
  - [x] Call `mkdirSync(DB_DIR, { recursive: true })` before opening the DB — ensures `.data/` exists even on fresh clone
  - [x] Use `globalThis` singleton guard to prevent multiple DB instances on Next.js hot-reload in dev mode
  - [x] Open `new Database(DB_PATH)` inside the guard
  - [x] Run `db.pragma('foreign_keys = ON')` immediately after open (SQLite default is OFF — AD-10)
  - [x] Run `db.exec(...)` with the full four-table schema using `CREATE TABLE IF NOT EXISTS` (AD-8)
  - [x] Run `db.prepare("INSERT OR IGNORE INTO status_value (value) VALUES ('open')").run()` for seed (AD-9)
  - [x] Export the `db` instance as `export default`

- [x] Task 3 — Schema correctness verification (AC: 2)
  - [x] Confirm `need.type_id` uses `REFERENCES need_type(id) ON DELETE RESTRICT` (AD-10)
  - [x] Confirm `need_link` has exactly two columns: `from_id TEXT NOT NULL` and `to_id TEXT NOT NULL` with `PRIMARY KEY (from_id, to_id)` — NO `link_type` column, NO ON DELETE CASCADE (AD-6, AD-11)
  - [x] Confirm no `ON DELETE CASCADE` on `need_link` FKs — Server Action owns cleanup (AD-11)

- [x] Task 4 — Verify AC5 (pre-existing work from Story 1.1) (AC: 5)
  - [x] Open `types/index.ts` and confirm: `NeedType`, `StatusValue`, `Need`, `NeedLink` interfaces are present
  - [x] Confirm `SEARCH_PARAM_KEYS` is exported with `QUERY`, `TYPE`, `STATUS`, `TAG`, `SORT` (UPPER_CASE keys, correct string values)
  - [x] **Do NOT modify `types/index.ts`** — this was completed and reviewed in Story 1.1

- [x] Task 5 — Integration verification (AC: 1, 2, 3, 4)
  - [x] Delete `.data/db.sqlite` if it exists, then run `npm run dev`
  - [x] Open a new terminal: `cd sphinx-needs-clone && node -e "const db = require('./.data/db.sqlite');"` — expect the file exists after server start
  - [x] Verify with sqlite3 CLI or Node.js: all four tables exist; `SELECT value FROM status_value` returns `'open'`
  - [x] Run `npx tsc --noEmit` — expect exit 0 with no type errors
  - [x] Run `npm run build` — expect exit 0 (AC4 is validated by build: importing db.ts in a client component would fail; no client component imports it at this stage)

## Dev Notes

### Actual Stack Versions (from Story 1.1 implementation — 2026-07-23)

| Package | Installed Version | Notes |
|---|---|---|
| Next.js | 16.2.11 | App Router, server components default |
| TypeScript | ^5 | `"strict": true`, `"noEmit": true`, `"moduleResolution": "bundler"` |
| Node.js | v22.12.0 | npm 10.9.0 |
| React | 19.2.4 | |
| Tailwind CSS | ^4 | CSS-first, no tailwind.config.js |
| shadcn/ui | 4.14.0 | Base UI + Nova preset |
| better-sqlite3 | 12.11.1 | Architecture-mandated version — verify availability |
| @types/better-sqlite3 | must be 12.x | Dev dependency |

> **Better-sqlite3 install note**: The architecture specifies v12.11.1. Run `npm install better-sqlite3@12.11.1` to pin the exact version. If a prebuilt binary is not available for Node 22.12.0, node-gyp will attempt to compile from source — ensure Python and build tools are available. If you see EBADENGINE or build errors, check the better-sqlite3 releases page for the latest v12.x that has Node 22 prebuilts.

### `lib/db.ts` — Complete Implementation Reference

**File location:** `sphinx-needs-clone/lib/db.ts`

```typescript
import 'server-only'

import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'

const DB_DIR = join(process.cwd(), '.data')
const DB_PATH = join(DB_DIR, 'db.sqlite')

// Ensure the .data/ directory exists before opening the database.
// Needed on fresh clone before any npm run dev has been run.
mkdirSync(DB_DIR, { recursive: true })

// Dev hot-reload guard: Next.js may re-evaluate this module on hot reload.
// Storing the instance on globalThis ensures we reuse the same connection.
const globalForDb = globalThis as typeof globalThis & { _db?: Database.Database }

if (!globalForDb._db) {
  const db = new Database(DB_PATH)

  // Enable foreign key enforcement — SQLite disables FKs by default (AD-10)
  db.pragma('foreign_keys = ON')

  // Create all tables if they don't exist (AD-8)
  db.exec(`
    CREATE TABLE IF NOT EXISTS need_type (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL,
      prefix TEXT   NOT NULL,
      color TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_value (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS need (
      id          TEXT    PRIMARY KEY,
      type_id     INTEGER NOT NULL REFERENCES need_type(id) ON DELETE RESTRICT,
      title       TEXT    NOT NULL,
      status      TEXT    NOT NULL,
      tags        TEXT,
      description TEXT,
      seq         INTEGER NOT NULL,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS need_link (
      from_id TEXT NOT NULL REFERENCES need(id),
      to_id   TEXT NOT NULL REFERENCES need(id),
      PRIMARY KEY (from_id, to_id)
    );
  `)

  // Seed the mandatory default status (AD-9).
  // INSERT OR IGNORE prevents re-seeding on subsequent startups.
  db.prepare(`INSERT OR IGNORE INTO status_value (value) VALUES ('open')`).run()

  globalForDb._db = db
}

export default globalForDb._db as Database.Database
```

### ⚠️ Critical Schema Rules — Do NOT Deviate

| Rule | Schema detail | Governed by |
|---|---|---|
| `need.type_id` FK | `REFERENCES need_type(id) ON DELETE RESTRICT` | AD-10 |
| `need_link` columns | Exactly `from_id TEXT NOT NULL` and `to_id TEXT NOT NULL` — NO other columns | AD-6 |
| `need_link` PK | `PRIMARY KEY (from_id, to_id)` — composite, no `ROWID` PK | AD-6 |
| `need_link` FK behavior | NO `ON DELETE CASCADE` — Server Action handles cleanup explicitly | AD-11 |
| No `link_type` column | Single generic link type in MVP; extension path is `ALTER TABLE ADD COLUMN` post-MVP | AD-6 |
| `status_value` seed | `INSERT OR IGNORE INTO status_value (value) VALUES ('open')` — idempotent | AD-9 |
| `PRAGMA foreign_keys = ON` | Must be called every time the DB is opened (not persisted in file) | AD-10 |
| `server-only` guard | `import 'server-only'` must be the FIRST import in `lib/db.ts` | AD-1 |
| DB file path | `.data/db.sqlite` — NOT `.data/app.db` (architecture spine has a discrepancy; story AC is authoritative) | Story 1.2 AC1 |

### ⚠️ better-sqlite3 API Notes (v12.x, synchronous API)

**All better-sqlite3 operations are synchronous.** Do NOT use async/await.

- **`db.pragma(string)`** — executes a PRAGMA statement and returns its result. Use `db.pragma('foreign_keys = ON')` (no return value needed).
- **`db.exec(string)`** — executes multi-statement SQL. Safe for schema init. Does not use prepared statements, so parameters cannot be bound — fine for DDL.
- **`db.prepare(string).run(...params)`** — runs a single DML statement. Returns `{ changes, lastInsertRowid }`.
- **`db.prepare(string).get(...params)`** — returns first row as object, or `undefined`.
- **`db.prepare(string).all(...params)`** — returns all rows as array.
- **`db.transaction(fn)`** — wraps function in a transaction; supports `.immediate()` for `BEGIN IMMEDIATE` (AD-12, used in createNeed Server Action in a future story).

**TypeScript import pattern:**
```typescript
import Database from 'better-sqlite3'
// Type of the db instance:
const db: Database.Database = new Database(path)
// Type of a prepared statement:
const stmt: Database.Statement = db.prepare('SELECT ...')
```

**Named parameters (use `@name` syntax):**
```typescript
db.prepare('INSERT INTO need (id, title) VALUES (@id, @title)')
  .run({ id: 'REQ_001', title: 'My requirement' })
```

### ⚠️ AC5 is Already Satisfied — Verify, Don't Recreate

`types/index.ts` was completed in Story 1.1 and reviewed. Key content:
- Exports: `NeedType`, `StatusValue`, `Need` (with optional joined fields `type_name?`, `type_prefix?`, `type_color?`), `NeedLink`, `CreateNeedInput`, `UpdateNeedInput`, `ActionResult<T = void>`, `SEARCH_PARAM_KEYS`, `SearchParamKey`
- `SEARCH_PARAM_KEYS` uses UPPER_CASE keys: `QUERY: 'q'`, `TYPE: 'type'`, `STATUS: 'status'`, `TAG: 'tags'`, `SORT: 'sort'`
- `Need.tags` is `string | null`; `Need.description` is `string | null`

**Do NOT modify `types/index.ts`** unless a type error is discovered. Any modification to interfaces could break future stories that were designed against the current shapes.

### ⚠️ Already Done in Story 1.1 — Do NOT Redo

| Item | Status | Location |
|---|---|---|
| `next.config.ts` `serverExternalPackages` | ✅ Done | `sphinx-needs-clone/next.config.ts` |
| `.data/` directory | ✅ Done | `sphinx-needs-clone/.data/.gitkeep` |
| `.data/*.sqlite` in `.gitignore` | ✅ Done | `sphinx-needs-clone/.gitignore` |
| `types/index.ts` all interfaces | ✅ Done | `sphinx-needs-clone/types/index.ts` |
| `lib/actions/` empty directory | ✅ Done | `sphinx-needs-clone/lib/actions/` |
| `lib/queries/` empty directory | ✅ Done | `sphinx-needs-clone/lib/queries/` |

### next.config.ts — Already Correct

```typescript
// sphinx-needs-clone/next.config.ts — DO NOT CHANGE
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],  // ← already here from Story 1.1
};

export default nextConfig;
```

`serverExternalPackages` tells Next.js not to bundle `better-sqlite3` through Webpack/Turbopack. This is required because `better-sqlite3` is a native Node.js C++ addon (`.node` file) that cannot be processed by a JS bundler.

### Global Singleton Pattern Rationale

In Next.js development mode (`npm run dev`), hot module replacement (HMR) can cause module re-evaluation. Without the `globalThis` guard, each hot-reload would open a new `Database` connection, potentially leaving stale handles. The guard:

```typescript
const globalForDb = globalThis as typeof globalThis & { _db?: Database.Database }
if (!globalForDb._db) {
  // ... initialize once
}
export default globalForDb._db as Database.Database
```

This is the standard Next.js pattern for any singleton resource (DB connections, email clients, etc.) in development. In production, the module is evaluated once per process, so `globalThis` isn't needed — but it doesn't hurt.

### Architecture Compliance Checklist

| Rule | This Story | How |
|---|---|---|
| AD-1 — `server-only` data layer | ✅ `import 'server-only'` first import | Build error if client imports `lib/db.ts` |
| AD-2 — Server Actions / RSC reads | N/A this story — `lib/actions/` and `lib/queries/` still empty | — |
| AD-8 — Schema init at module load | ✅ `db.exec(CREATE TABLE IF NOT EXISTS ...)` in `lib/db.ts` | Runs at first import |
| AD-9 — `'open'` seeded at init | ✅ `INSERT OR IGNORE INTO status_value (value) VALUES ('open')` | Idempotent |
| AD-10 — FK enforcement + RESTRICT | ✅ `PRAGMA foreign_keys = ON` + `REFERENCES need_type(id) ON DELETE RESTRICT` | |
| AD-11 — No CASCADE on need_link | ✅ No `ON DELETE CASCADE` in schema | Server Action handles cleanup |
| AD-6 — Single link type, no extra cols | ✅ `need_link (from_id, to_id)` only | |
| NFR-1 — Stack compliance | ✅ better-sqlite3 as specified | |
| NFR-3 — `npm run dev` only | ✅ No env vars; DB auto-created | |
| NFR-4 — TypeScript strict | ✅ No `any`; typed via `Database.Database` | |

### File Naming & Location

- **This story creates**: `sphinx-needs-clone/lib/db.ts` — kebab-case, non-component file, `lib/` directory ✅
- **Project CWD**: `sphinx-needs-clone/` — `process.cwd()` resolves to this when Next.js runs
- **DB file**: `.data/db.sqlite` relative to the `sphinx-needs-clone/` root

### Deferred Items from Story 1.1 Relevant Here

- **`better-sqlite3` not in package.json** — This story resolves it. Install `better-sqlite3@12.11.1` + `@types/better-sqlite3`.
- **`Need.tags` is `string | null` with no null-safe utility** — Still deferred; add utility in `lib/utils.ts` when first consumer is written (Story 2 or 3).

### References

- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — AD-1, AD-6, AD-8, AD-9, AD-10, AD-11, AD-12, Structural Seed (schema diagram), Stack table
- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 1 Story 1.2 ACs, FR-15, FR-16, DB schema init requirements
- Story 1.1: `_bmad-output/implementation-artifacts/1-1-initialize-next-js-project-scaffold-with-brand-theme.md` — Completion Notes (actual versions), File List (what already exists), Review Findings (patched items)
- better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md — `new Database(path)`, `db.pragma()`, `db.exec()`, `db.prepare().run()`, `db.transaction()`, singleton pattern
- deferred-work.md: `_bmad-output/implementation-artifacts/deferred-work.md` — `better-sqlite3` absent item resolved here

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot) — create-story workflow, 2026-07-24; dev-story implementation, 2026-07-25

### Debug Log References

### Completion Notes List

- Story created via bmad-create-story workflow, 2026-07-24
- Target story auto-discovered from sprint-status.yaml: first `backlog` entry = `1-2-initialize-sqlite-database-layer`
- Epic 1 is already `in-progress` (set in Story 1.1) — no status update needed
- AC5 (types/index.ts) is pre-existing work from Story 1.1 — verified, no changes needed
- Architecture spine has `.data/app.db` but Story 1.2 AC says `.data/db.sqlite` — confirmed: used `db.sqlite`
- `PRAGMA foreign_keys = ON` must be called after every DB open; not stored in the SQLite file
- No `ON DELETE CASCADE` on `need_link` — deliberate per AD-11; Server Actions own link cleanup
- Global singleton guard is essential for Next.js HMR in dev mode
- better-sqlite3 is entirely synchronous — no async/await anywhere in `lib/db.ts`
- **Implementation 2026-07-25**: `better-sqlite3@12.11.1` + `@types/better-sqlite3@7.6.13` installed successfully
- Node.js prebuilt binary available for v22.12.0 — no node-gyp compilation required
- `npx tsc --noEmit` exits 0; `npm run build` exits 0
- All ACs verified via Node.js integration script against real `.data/db.sqlite`
- EBADENGINE warning for eslint-visitor-keys@5.0.1 (needs node ^22.13.0) — pre-existing from Story 1.1, non-blocking

### File List

- `lib/db.ts` — NEW
- `package.json` — UPDATED (added `better-sqlite3@12.11.1` runtime dep + `@types/better-sqlite3@7.6.13` dev dep)
- `package-lock.json` — UPDATED (lockfile updated by npm install)

### Review Findings

> Code review run 2026-07-25 — 1 decision-needed ✓, 1 patch ✓, 6 defer, 11 dismissed — all resolved 2026-07-25

#### Decision Needed

- [x] [Review][Decision] **`need_type.prefix` lacks a UNIQUE constraint — duplicate prefixes cause ID generation collisions** — RESOLVED: Added `UNIQUE` to `need_type.prefix` column in `lib/db.ts`; deleted `.data/db.sqlite` to apply constraint fresh. — The architecture spine shows `need_type.prefix TEXT NOT NULL` with no UNIQUE constraint. Two types sharing the same prefix (e.g., two types both with prefix "REQ") will each generate "REQ_001" as the first need's ID. AD-4's `BEGIN IMMEDIATE` transaction catches the UNIQUE violation on `need.id` and returns `{ success: false, error: "ID already in use", field: "id" }` — the user must then manually edit the ID. Options: **(1)** Add `UNIQUE` to `need_type.prefix` in the schema now (prevents the issue at DB level); **(2)** Let Story 2.1 Server Action validate prefix uniqueness before insert; **(3)** Accept current behavior — duplicate prefixes allowed, user edits IDs on collision.

#### Patch

- [x] [Review][Patch] **`need_link` allows self-referential links — missing `CHECK (from_id != to_id)` constraint** — RESOLVED: Added `CHECK (from_id != to_id)` to `need_link` DDL in `lib/db.ts`; DB wiped so constraint is active. [`lib/db.ts:52-56`] — Nothing prevents a need from being inserted into `need_link` with `from_id = to_id`. A self-link would show the need as a backlink to itself in the NeedSheet, and a malformed link chip would appear in the Links section referencing the same need. The fix is a single `CHECK` constraint on the `need_link` table definition. Fix: add `CHECK (from_id != to_id)` to the `need_link` table DDL in `lib/db.ts`. **Note:** Because the schema uses `CREATE TABLE IF NOT EXISTS`, this fix will only take effect on a fresh DB. For existing DBs, the column check won't be retroactively applied — a `.data/db.sqlite` delete is required to apply the constraint.

#### Deferred

- [x] [Review][Defer] **`need.status TEXT NOT NULL` has no FK reference to `status_value`** [`lib/db.ts:41`] — `need.status` stores the status value string directly rather than a FK to `status_value.id`. Deleting a status value while needs reference it leaves those needs with stale status strings. This is an architecture design decision (the spine shows `need.status TEXT` with no FK); enforcement is intended at the application layer in future stories. — deferred, pre-existing architecture design
- [x] [Review][Defer] **No `journal_mode = WAL` or `busy_timeout` pragmas** [`lib/db.ts:23`] — Without WAL mode, concurrent reads+writes during HMR or parallel builds can cause `SQLITE_BUSY` errors. `db.pragma('journal_mode = WAL')` and `db.pragma('busy_timeout = 5000')` would harden the module. Not required by spec (NFR-3: local only, single user). — deferred, nice-to-have for robustness
- [x] [Review][Defer] **No error handling around `mkdirSync` + DB open; unclosed handle on partial init failure** [`lib/db.ts:9,21`] — If `mkdirSync` throws (permissions) or `db.exec()` throws after `new Database()` opens, the error bubbles up without a user-friendly message, and the opened-but-unused DB handle is leaked until GC. For a local dev tool this is acceptable. — deferred, operational improvement, not spec-required
- [x] [Review][Defer] **DDL `db.exec()` runs as individual auto-committed statements, not an explicit transaction** [`lib/db.ts:27-55`] — A process kill between `CREATE TABLE` statements would leave a partial schema. On restart, `CREATE TABLE IF NOT EXISTS` re-creates missing tables idempotently. Theoretical risk only; self-healing by design (AD-8). — deferred, theoretical; IF NOT EXISTS is self-healing
- [x] [Review][Defer] **No index on `need_link.to_id` for backlink queries** [`lib/db.ts:52-56`] — `SELECT from_id FROM need_link WHERE to_id = ?` (AD-3 backlink query) does a full table scan. At ≤500 rows (NFR-2) this is acceptable. Add `CREATE INDEX IF NOT EXISTS idx_need_link_to_id ON need_link(to_id)` when scale warrants it. — deferred, NFR-2 ≤500 rows makes this acceptable for MVP
- [x] [Review][Defer] **`created_at` and `updated_at` have no DEFAULT values** [`lib/db.ts:47-48`] — Server Actions (future stories) must always provide these values explicitly. A missing value fails with NOT NULL constraint — this is correct enforcement. Adding `DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` on `created_at` would be a convenience enhancement. — deferred, Server Action responsibility
