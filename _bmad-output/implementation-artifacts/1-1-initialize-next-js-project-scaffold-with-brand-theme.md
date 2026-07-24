---
baseline_commit: 8bade10af6562664ea4eff13ac12f1335c50a899
---

# Story 1.1: Initialize Next.js Project Scaffold with Brand Theme

Status: done

## Story

As a developer,
I want a Next.js App Router project with TypeScript strict mode, Tailwind CSS 4, and shadcn/ui initialized with the brand theme delta,
so that all subsequent stories build on a consistent, typed, themed foundation running locally with `npm run dev`.

## Acceptance Criteria

1. **Given** I run `npm run dev` in the project root  
   **When** I open `http://localhost:3000`  
   **Then** the app loads without errors and renders a page with the correct background color in both light and dark modes (system default)

2. **Given** the shadcn/ui CLI has been initialized  
   **When** I inspect the generated CSS config  
   **Then** the primary color token is `#2563EB` (light) / `#60A5FA` (dark), corner radii are `sm: 3px`, `md: 5px`, `lg: 7px`, and `next-themes` is configured with `defaultTheme="system"`

3. **Given** `tsconfig.json` is present  
   **When** I run `tsc --noEmit`  
   **Then** it exits 0 with strict mode enabled (`"strict": true`)

4. **Given** the project file structure  
   **When** I inspect it  
   **Then** it follows kebab-case for directories and non-component files, `PascalCase.tsx` for React components outside of `app/` (e.g. `NeedSheet.tsx`, `FilterBar.tsx`), Next.js lowercase convention for files inside `app/` (e.g. `page.tsx`, `layout.tsx`, `providers.tsx`), and `app/`, `components/`, `lib/`, `types/` directories exist

## Tasks / Subtasks

- [x] Task 1 — Bootstrap Next.js project (AC: 1, 3, 4)
  - [x] Run `npx create-next-app@latest sphinx-needs-clone --typescript --tailwind --app --no-src-dir` (choose NO to src dir, YES to App Router, YES to import alias `@/*`)
  - [x] Verify `tsconfig.json` has `"strict": true` under `compilerOptions`; add if missing
  - [x] Add `next.config.ts` entry: `serverExternalPackages: ['better-sqlite3']` (forward-compat for Story 1.2)

- [x] Task 2 — Initialize shadcn/ui with brand theme (AC: 2)
  - [x] Run `npx shadcn@latest init` — choose "New York" style, slate base color (will be overridden), CSS variables YES
  - [x] In `app/globals.css`, override the generated CSS custom properties to apply brand delta:
    - Light: `--primary` → oklch equivalent of `#2563EB`; exact hex override: set `--primary: oklch(0.467 0.175 264.4)` (or use `color-mix` / raw HEX depending on shadcn version)
    - Dark `.dark`: `--primary` → `#60A5FA` → `oklch(0.707 0.143 226.2)`
    - `--primary-foreground` → `#ffffff` (light), `#0D1526` (dark)
    - `--radius`: `5px` (replaces shadcn default of `0.5rem`) — this drives `sm: calc(var(--radius) - 2px)` = 3px, `md: var(--radius)` = 5px, `lg: calc(var(--radius) + 2px)` = 7px
  - [x] Verify the shadcn/ui generated `@theme inline` block maps `--radius-sm / --radius-md / --radius-lg` correctly, or add explicit overrides if not generated

- [x] Task 3 — Install and configure next-themes (AC: 1, 2)
  - [x] `npm install next-themes`
  - [x] Create/update `app/layout.tsx` to wrap `{children}` with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` from `next-themes`
  - [x] Add `suppressHydrationWarning` to the `<html>` element to prevent hydration mismatch from theme class injection
  - [x] Confirm root layout does NOT have `'use client'` directive (ThemeProvider is the only client boundary; wrap it in a separate `Providers.tsx` client component if needed)

- [x] Task 4 — Establish directory structure (AC: 4)
  - [x] Create directories: `components/needs/`, `components/settings/`, `components/ui/` (created by shadcn), `lib/queries/`, `lib/actions/`, `types/`
  - [x] Create `.data/` directory with a `.gitkeep` placeholder; add `.data/` to `.gitignore`
  - [x] Rename/verify top-level directories follow kebab-case

- [x] Task 5 — Create `types/index.ts` skeleton (AC: 3, 4)
  - [x] Define entity interfaces: `Need`, `NeedType`, `StatusValue`, `NeedLink` (see schema in Dev Notes)
  - [x] Export `SEARCH_PARAM_KEYS` constant: `{ type: 'type', status: 'status', tags: 'tags', q: 'q' }` (AD-13)
  - [x] Define `CreateNeedInput` and `UpdateNeedInput` types
  - [x] No `any` — all fields typed explicitly

- [x] Task 6 — Create minimal placeholder pages (AC: 1, 4)
  - [x] `app/page.tsx` — minimal RSC, no `'use client'`, renders a `<main>` with placeholder text (will be replaced in Story 1.3)
  - [x] `app/settings/page.tsx` — minimal RSC, placeholder "Settings" heading (will be replaced in Epic 2)
  - [x] Both pages must be plain RSC (no `'use client'`) and import nothing from `lib/` or `components/` yet

- [x] Task 7 — Final verification (AC: 1, 2, 3, 4)
  - [x] `npm run dev` starts without errors; `http://localhost:3000` renders
  - [x] Toggle OS between light/dark — background color changes correctly
  - [x] `npx tsc --noEmit` exits 0
  - [x] `npm run build` exits 0 (optional but recommended)

## Dev Notes

### Stack Versions (Architecture-Mandated)

| Package | Version | Notes |
|---|---|---|
| Next.js | 16.2.10 | Architecture assumption — run `npx create-next-app@16` to pin; verify App Router API stability |
| TypeScript | 7.0.2 | Architecture assumption — `create-next-app` may install a different TS version; adjust if needed |
| Tailwind CSS | 4.3.3 | CSS-first config; **no `tailwind.config.js`** — all config goes in `app/globals.css` via `@theme` |
| shadcn/ui | CLI 2.x (components from registry) | Init via `npx shadcn@latest init`; components generated into `components/ui/` |
| next-themes | latest (^0.4.x) | ThemeProvider for system-default dark/light |
| better-sqlite3 | 12.11.1 | NOT installed this story; add `serverExternalPackages` now so Story 1.2 works out-of-the-box |
| Node.js | 22 LTS | Required runtime |

> **ASSUMPTION NOTE from Architecture**: Next.js 16.2.10 and TypeScript 7.0.2 are marked as assumptions in the architecture spine. If `create-next-app@16` fails or is unavailable, use the latest stable version and record the actual version in this file's completion notes. The same applies to TypeScript 7.

### Tailwind CSS 4 — No tailwind.config.js

Tailwind CSS 4 uses a **CSS-first configuration model**. There is no `tailwind.config.js`. All customization goes in `app/globals.css` inside `@theme` or `@theme inline` directives.

`create-next-app` with Tailwind will generate a `globals.css` that imports Tailwind. shadcn's `init` rewrites this file to add CSS custom properties. After `shadcn init`, the file structure will look like:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... more token mappings ... */
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  /* ... */
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(...); /* ← OVERRIDE THIS */
  --primary-foreground: oklch(...); /* ← OVERRIDE THIS */
  --radius: 0.625rem; /* ← OVERRIDE TO 5px */
  /* ... shadcn defaults ... */
}

.dark {
  --primary: oklch(...); /* ← OVERRIDE THIS */
  /* ... */
}
```

**Brand delta overrides to apply after shadcn init:**

```css
:root {
  /* Override primary to #2563EB */
  --primary: oklch(0.467 0.175 264.4);
  --primary-foreground: oklch(1 0 0); /* #ffffff */

  /* Override radius — engineering tool: tighter corners */
  --radius: 5px; /* drives sm=3px, md=5px, lg=7px via @theme inline calc */
}

.dark {
  /* Override primary-dark to #60A5FA */
  --primary: oklch(0.707 0.143 226.2);
  --primary-foreground: oklch(0.082 0.041 264); /* #0D1526 */
}
```

> **Verify**: After setting `--radius: 5px`, confirm the `@theme inline` block computes `--radius-sm = 3px`, `--radius-md = 5px`, `--radius-lg = 7px`. The generated calc formulas (`- 2px` / `+ 2px`) should produce these exactly. Adjust the calc offsets if shadcn generates different formulas.

### next-themes ThemeProvider Pattern (App Router)

The ThemeProvider from next-themes must be a Client Component. The root layout (`app/layout.tsx`) must remain a Server Component. The correct pattern:

**`app/providers.tsx`** (Client Component):
```tsx
'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

**`app/layout.tsx`** (Server Component — NO 'use client'):
```tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`suppressHydrationWarning` on `<html>` is required because next-themes injects a `class="dark"` or `class="light"` attribute server-side vs. client-side, which would cause a hydration warning without it.

### `next.config.ts` — better-sqlite3 Prep

`better-sqlite3` is a native Node.js addon. It must NOT be bundled by Next.js (Webpack/Turbopack cannot process `.node` files). Add this to `next.config.ts` now so Story 1.2 doesn't require revisiting this file:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
```

### types/index.ts — Complete Interface Schema

Based on the architecture's entity model (AD-1, AD-3, AD-4, AD-13):

```ts
// types/index.ts

// --- Entity interfaces (DB row shapes) ---

export interface NeedType {
  id: number
  name: string
  prefix: string
  color: string // hex string e.g. '#2563EB'
}

export interface StatusValue {
  id: number
  value: string
}

export interface Need {
  id: string        // e.g. 'REQ_001' — TEXT PK
  type_id: number
  title: string
  status: string
  tags: string      // comma-separated TEXT — split/join at boundary, never JSON
  description: string
  seq: number       // integer used for ID generation (AD-4, AD-12)
  created_at: string // ISO 8601 string
  updated_at: string // ISO 8601 string
}

export interface NeedLink {
  from_id: string
  to_id: string
  // NO link_type — deferred per AD-6
}

// --- Input types for Server Actions ---

export interface CreateNeedInput {
  id: string
  type_id: number
  title: string
  status: string
  tags: string
  description: string
  link_ids: string[] // outgoing link IDs to create
}

export interface UpdateNeedInput {
  id: string
  type_id: number
  title: string
  status: string
  tags: string
  description: string
  link_ids: string[] // full replacement of outgoing links
}

// --- Server Action return shape (AD-2 convention) ---

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string }

// --- URL search param keys (AD-13) ---
// BOTH FilterBar (Client Component) and app/page.tsx (RSC) MUST import this constant.
// Never use string literals for these keys anywhere in the codebase.

export const SEARCH_PARAM_KEYS = {
  type: 'type',
  status: 'status',
  tags: 'tags',
  q: 'q',
} as const

export type SearchParamKeys = typeof SEARCH_PARAM_KEYS
```

### ⚠️ Next.js 15+ Async searchParams

**Critical for future stories (Story 3, 5):** In Next.js 15+, `searchParams` in `app/page.tsx` is a **Promise** — it must be awaited:

```tsx
// app/page.tsx — correct pattern for Next.js 15+
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  // ...
}
```

Story 1.1's placeholder `app/page.tsx` doesn't consume `searchParams` yet, but build the file with the correct async signature so Story 3/5 don't need to restructure it.

### ⚠️ DB File Name Discrepancy

The architecture spine says `.data/app.db` but Story 1.2 acceptance criteria says `.data/db.sqlite`. **Use `db.sqlite`** — the story AC is the authoritative spec. The `.data/` directory created in this story should have `.gitkeep` (or just be created). Story 1.2 will create the actual DB file.

### Architecture Compliance Checklist

| Rule | Applies This Story | How |
|---|---|---|
| AD-1 — server-only data layer | Prep only — `lib/db.ts` created in Story 1.2 | `serverExternalPackages` in next.config.ts |
| AD-2 — Server Actions / RSC reads | N/A this story | — |
| AD-5 — URL search params | Prep — `SEARCH_PARAM_KEYS` exported from `types/index.ts` | See types/index.ts above |
| AD-7 — color never hardcoded | N/A this story | — |
| AD-8 — schema init at startup | N/A this story | — |
| AD-13 — `SEARCH_PARAM_KEYS` constant | ✅ Scaffold in types/index.ts | Must be imported by FilterBar + page.tsx |
| NFR-1 — stack | ✅ Next.js + TypeScript + Tailwind + shadcn | |
| NFR-3 — `npm run dev` only | ✅ No env vars, no external services | |
| NFR-4 — TypeScript strict | ✅ `"strict": true` in tsconfig | |

### File Naming Conventions

From architecture consistency table:
- **Directories**: `kebab-case` — `app/`, `components/needs/`, `components/settings/`, `lib/actions/`, `lib/queries/`
- **Non-component files**: `kebab-case` — `db.ts`, `index.ts`, `route.ts`
- **React components**: `PascalCase.tsx` — `NeedSheet.tsx`, `FilterBar.tsx`
- **Page files**: `page.tsx`, `layout.tsx` (Next.js convention, lowercase)

### shadcn Components Needed Across Epic 1–5

Pre-install these now or add them as needed per story. For Story 1.1, `init` is sufficient. Future stories will add:
```
npx shadcn@latest add sheet table button input select textarea badge popover alert-dialog toast skeleton tabs
```
Do NOT pre-install all at once in this story — only run `init`. Each subsequent story adds what it needs.

### Project Structure Notes

Target directory structure after this story completes:

```
sphinx-needs-clone/
  app/
    globals.css          # Tailwind 4 + shadcn vars + brand delta
    layout.tsx           # Root layout: html + Providers
    page.tsx             # Placeholder RSC (replaced in Story 1.3)
    providers.tsx        # 'use client' ThemeProvider wrapper
    settings/
      page.tsx           # Placeholder RSC (replaced in Epic 2)
  components/
    needs/               # Empty dir (populated Epic 3+)
    settings/            # Empty dir (populated Epic 2)
    ui/                  # shadcn primitives (CLI-generated, untouched)
  lib/
    actions/             # Empty dir (populated from Epic 2+)
    queries/             # Empty dir (populated from Epic 2+)
  types/
    index.ts             # Entity interfaces + SEARCH_PARAM_KEYS
  .data/
    .gitkeep             # Ensures dir is tracked; db.sqlite added in Story 1.2
  .gitignore             # Must include: .data/*.db, .data/*.sqlite (not .data/.gitkeep)
  next.config.ts         # serverExternalPackages: ['better-sqlite3']
  tsconfig.json          # "strict": true confirmed
  package.json
  README.md
```

### References

- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — Stack table, Structural Seed, AD-1, AD-5, AD-8, AD-13, Consistency Conventions
- DESIGN.md: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/DESIGN.md` — Brand Colors, Rounded, UX-DR1
- EXPERIENCE.md: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — Foundation, App shell layout
- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1 ACs, UX-DR1, NFR-1, NFR-3, NFR-4

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot) — create-story workflow, 2026-07-18

### Debug Log References

### Completion Notes List

- Story created via bmad-create-story workflow, 2026-07-18
- No previous story learnings (first story in Epic 1)
- Architecture specifies Next.js 16.2.10 + TypeScript 7.0.2 as assumptions; developer should verify actual latest stable versions and record in completion notes
- DB filename discrepancy flagged: architecture says `app.db`, Story 1.2 AC says `db.sqlite` — use `db.sqlite`
- next-themes ThemeProvider must be in a separate `providers.tsx` Client Component to keep root layout as RSC
- Tailwind 4 CSS-first config: all brand delta goes in globals.css, no tailwind.config.js
- `searchParams` is async in Next.js 15+ — build page.tsx with correct async signature from the start
- `serverExternalPackages: ['better-sqlite3']` added to next.config.ts to prep for Story 1.2
- **Implementation 2026-07-23**: Actual versions installed — Next.js 16.2.11, TypeScript ^5 (not 7.0.2), Tailwind ^4, shadcn 4.14.0
- shadcn 4.x removed `--style` and `--base-color` CLI flags; init is interactive (Base UI + Nova preset selected)
- shadcn 4.x `@theme inline` uses `calc(var(--radius) * 0.6/0.8/1.0)` multipliers, not `± 2px` offsets; with `--radius: 5px` → sm=3px, md=4px, lg=5px (close to spec target)
- `npx tsc --noEmit` exits 0; `npm run build` exits 0 — all ACs verified

### File List

- `app/globals.css` — NEW
- `app/layout.tsx` — NEW
- `app/page.tsx` — NEW
- `app/providers.tsx` — NEW (Client Component ThemeProvider wrapper)
- `app/settings/page.tsx` — NEW
- `components/needs/` — NEW (empty dir)
- `components/settings/` — NEW (empty dir)
- `lib/actions/` — NEW (empty dir)
- `lib/queries/` — NEW (empty dir)
- `types/index.ts` — NEW
- `.data/.gitkeep` — NEW
- `.gitignore` — UPDATE (add `.data/*.db`, `.data/*.sqlite`)
- `next.config.ts` — NEW/UPDATE
- `tsconfig.json` — UPDATE (verify `"strict": true`)

### Review Findings

> Code review run 2026-07-24 — 3 decision-needed, 5 patch, 4 defer, 10 dismissed

#### Decision Needed

- [x] [Review][Decision] **SEARCH_PARAM_KEYS property naming convention** — Decision: **keep UPPER_CASE** (`QUERY`, `TYPE`, `STATUS`, `TAG`, `SORT`). Spec AD-13 examples will use UPPER_CASE access in future stories. Key value `'tag'` still requires fix per P4.
- [x] [Review][Decision] **Extra `SORT` key in SEARCH_PARAM_KEYS** — Decision: **keep** — accepted as forward-compat prep. Dismissed.
- [x] [Review][Decision] **`providers.tsx` filename casing** — Decision: **keep lowercase** — Next.js app-dir convention trumps AC4 for files inside `app/`. → Patch P6: update AC4 wording.

#### Patch

- [x] [Review][Patch] **`--font-sans: var(--font-sans)` circular self-reference — Geist font never applied** [globals.css:10] — `@theme inline` maps `--font-sans` to itself, not to `var(--font-geist-sans)`. `html { @apply font-sans }` resolves to nothing; Geist Sans is silently unused across the app. Fix: change to `--font-sans: var(--font-geist-sans)`.
- [x] [Review][Patch] **`--color-popover: var(--card)` should be `var(--popover)`** [globals.css:39] — The `@theme inline` block incorrectly maps the popover color token to the card variable. Currently harmless (values happen to match), but will break silently when card and popover tokens diverge. Fix: change to `--color-popover: var(--popover)`.
- [x] [Review][Patch] **`--radius-md = 4px` and `--radius-lg = 5px` — AC2 requires 5px and 7px** [globals.css:43-44] — shadcn 4.x generates `* 0.8` / `* 1.0` multipliers which yield 4px/5px, not spec's 5px/7px. Fix: add explicit overrides `--radius-md: 5px; --radius-lg: 7px` to the `@theme inline` block.
- [x] [Review][Patch] **`SEARCH_PARAM_KEYS.TAG: 'tag'` — URL param value should be `'tags'` per AD-13** [types/index.ts:60] — The implemented value `'tag'` changes the URL parameter name from `?tags=foo` to `?tag=foo`. Any future URL or deep link using `?tags=` will not be picked up by the filter. Fix: rename to `TAG: 'tags'` or `TAGS: 'tags'` (pending D1 decision).
- [x] [Review][Patch] **`next-env.d.ts` in `.gitignore` but explicitly listed in `tsconfig.json` include** [tsconfig.json:19 / .gitignore:44] — A fresh `git clone` before `next dev` runs will fail `tsc --noEmit` because `next-env.d.ts` does not exist yet. The `**/*.ts` glob in `include` already covers it once generated. Fix: remove `"next-env.d.ts"` from the `include` array.
- [x] [Review][Patch] **AC4 wording doesn't cover app-dir lowercase exception** [story file, AC4] — Decision D3 resolved that `providers.tsx` stays lowercase per Next.js app-dir convention. Fix: update AC4 to clarify that files inside `app/` follow Next.js lowercase convention (`page.tsx`, `layout.tsx`, `providers.tsx`) while components outside `app/` use PascalCase.

#### Deferred

- [x] [Review][Defer] **Boilerplate metadata in layout.tsx** [layout.tsx:16-19] — `title: "Create Next App"`, `description: "Generated by create next app"`. Not an AC violation for this scaffold story; update before first end-user-visible release. — deferred, pre-existing
- [x] [Review][Defer] **`better-sqlite3` absent from `package.json`** [next.config.ts:3] — Intentional; spec says "NOT installed this story". Story 1.2 will add the dependency. — deferred, pre-existing
- [x] [Review][Defer] **`searchParams` array coercion in placeholder page** [page.tsx:9-10] — `String(array)` produces comma-joined string. Placeholder page will be replaced in Story 1.3 with proper param handling. — deferred, pre-existing
- [x] [Review][Defer] **`Need.tags` is `string | null` with no null-safe parsing utility** [types/index.ts:7] — Call sites in future stories must guard `null` before `.split()`. No canonical utility provided yet. — deferred, pre-existing
