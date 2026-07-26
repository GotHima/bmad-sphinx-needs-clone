---
baseline_commit: 1567ac0534012f4c626a0960d05c3cf04070f533
---

# Story 1.3: App Shell Layout

Status: done

## Story

**As a user,**
I want a consistent app shell with a top bar and content area that adapts to my system's light/dark preference,
**So that** every page in the app has a predictable, professional layout to work within.

## Acceptance Criteria

**AC1 — Top bar present with correct layout**
**Given** I open the app in a browser
**When** the root layout renders
**Then** a top bar of exactly 48px height is visible, with the app name ("Sphinx Needs Clone") on the left, and a placeholder "New Need" button and "Settings" link on the right

**AC2 — Content area fills remaining viewport**
**Given** the app shell is rendered
**When** I inspect the layout
**Then** the content area below the top bar fills the remaining viewport height with no overflow or scroll on the shell itself

**AC3 — Dark mode applied from system preference**
**Given** my OS is set to dark mode
**When** I load the app
**Then** the dark color scheme is applied automatically without any theme toggle interaction

**AC4 — Top bar consistent on both pages; `/` and `/settings` render correctly**
**Given** I navigate to `/` (home) and `/settings`
**When** either page loads
**Then** the top bar is present on both pages with consistent appearance; `/` renders an empty content area (no table yet — table is Story 3.1); `/settings` renders a placeholder or empty settings content

## Tasks / Subtasks

- [x] Task 1 — Create `AppTopBar` server component (AC: 1)
  - [x] Create `components/layout/AppTopBar.tsx` — RSC, no `'use client'`
  - [x] Render `<header>` at exactly `h-12` (48px) with `bg-background border-b border-border` classes
  - [x] Left slot: app name as a plain `<span>` or `<Link href="/">` — text "Sphinx Needs Clone", `font-semibold text-sm`
  - [x] Right slot: placeholder "New Need" `<button>` using shadcn `Button` (variant `default`, size `sm`) — no `onClick` yet (wired in Story 3.2)
  - [x] Right slot: "Settings" `<Link href="/settings">` — use shadcn `Button` variant `ghost` size `sm` — OR a plain `<Link>` styled via `buttonVariants`
  - [x] Use flexbox: `flex items-center justify-between px-4` on the `<header>`

- [x] Task 2 — Wire `AppTopBar` into root layout (AC: 1, 2, 4)
  - [x] Update `app/layout.tsx`: import and render `<AppTopBar />` above `{children}`
  - [x] Layout structure: `<html>` → `<body className="h-full flex flex-col">` → `<AppTopBar />` + `<div className="flex flex-1 flex-col min-h-0 overflow-auto">` wrapping `{children}` (inside `<Providers>`)
  - [x] Ensure `<Providers>` wraps the whole body content (AppTopBar + children), NOT just children — ThemeProvider must govern the top bar too
  - [x] Confirm `suppressHydrationWarning` stays on `<html>` (already present — do NOT remove)
  - [x] Confirm `className={geist...variable}` font variables remain on `<html>` (already present — do NOT remove)

- [x] Task 3 — Update `app/page.tsx` to be a proper empty shell (AC: 4)
  - [x] Remove the `<h1>Needs</h1>` heading and placeholder paragraph — those belong in a future `NeedsTable` component
  - [x] Page should render an empty `<main className="flex flex-1 flex-col">` or a placeholder div — content area must fill available height (Story 3.1 will add the actual table)
  - [x] Keep the `searchParams` prop and `SEARCH_PARAM_KEYS` import (needed for Story 3.1 immediately after)
  - [x] Keep the `async` + `await searchParams` pattern — Next.js 15+ forward compatibility

- [x] Task 4 — Update `app/settings/page.tsx` to be a proper empty shell (AC: 4)
  - [x] Remove heading and placeholder paragraph
  - [x] Page renders `<main className="flex flex-1 flex-col">` with a single placeholder: `<p className="text-muted-foreground p-6">Settings coming soon.</p>` (or equivalent minimal placeholder)
  - [x] This page is **not** `'use client'` — remains a plain RSC

- [x] Task 5 — Verify all ACs
  - [x] Run `npm run dev` and open `http://localhost:3000` — confirm 48px top bar with correct content
  - [x] Inspect in browser DevTools: `<header>` height = 48px, flexbox row, left slot text visible, right slot has button + link
  - [x] Navigate to `/settings` — confirm top bar persists with identical appearance
  - [x] If OS dark mode is available: confirm dark palette applies automatically (no toggle needed)
  - [x] Run `npx tsc --noEmit` — expect exit 0
  - [x] Run `npm run build` — expect exit 0

### Review Findings (AI) — 2026-07-26

- [x] [Review][Patch] `SEARCH_PARAM_KEYS` import is present but dead — no reference in function body [sphinx-needs-clone/app/page.tsx:1]
- [x] [Review][Patch] `deferred-work.md` still lists "Boilerplate metadata" as open — resolved by this story, mark it done [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Defer] `overflow-auto` on content wrapper will clip `position: sticky` children — intentional constraint, document before first sticky consumer [sphinx-needs-clone/app/layout.tsx:36] — deferred, pre-existing architectural constraint
- [x] [Review][Defer] Settings page has no `<h1>` or page-level metadata — transient placeholder; Story 2.1 restores proper heading structure [sphinx-needs-clone/app/settings/page.tsx] — deferred, superseded by Story 2.1
- [x] [Review][Defer] Disabled "New Need" button has no accessible explanation for why it is disabled — Story 3.2 wires the button and is the right place to add tooltip/aria [sphinx-needs-clone/components/layout/AppTopBar.tsx:11] — deferred, Story 3.2
- [x] [Review][Defer] Settings `<Link>` has no `aria-current="page"` active state — requires `usePathname()` client hook, out of scope for this RSC story [sphinx-needs-clone/components/layout/AppTopBar.tsx:14] — deferred, future nav story

## Dev Notes

### Current File State — What Exists & What to Preserve

| File | Current State | This Story Action |
|---|---|---|
| `app/layout.tsx` | Root RSC layout with Geist fonts, `<Providers>`, `<body className="min-h-full flex flex-col">` | UPDATE — add `<AppTopBar />`, restructure body, preserve font vars & `suppressHydrationWarning` |
| `app/page.tsx` | Async RSC, imports `SEARCH_PARAM_KEYS`, has placeholder `<h1>` and `<p>` | UPDATE — strip placeholder heading/para, keep `searchParams` + `SEARCH_PARAM_KEYS` import, keep `async/await` |
| `app/settings/page.tsx` | Plain RSC with placeholder `<h1>` and `<p>` | UPDATE — strip placeholder content, keep RSC (no `'use client'`) |
| `app/providers.tsx` | `'use client'` ThemeProvider wrapper | DO NOT TOUCH |
| `components/ui/button.tsx` | shadcn CLI-generated Button | USE AS-IS — import from here |
| `app/globals.css` | Full Tailwind 4 CSS-first config + shadcn vars + brand delta | DO NOT TOUCH |

### ⚠️ `app/layout.tsx` — Exact Structure to Achieve

The current `layout.tsx` has `<body className="min-h-full flex flex-col">`. The new structure must be:

```tsx
// app/layout.tsx — target state
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppTopBar } from "@/components/layout/AppTopBar";

// ... font declarations unchanged ...

export const metadata: Metadata = {
  title: "Sphinx Needs Clone",  // UPDATE from "Create Next App"
  description: "A browser-based requirements management tool.",  // UPDATE from boilerplate
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <Providers>
          <AppTopBar />
          <div className="flex flex-1 flex-col min-h-0 overflow-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

**Critical constraints:**
- `suppressHydrationWarning` on `<html>` — REQUIRED for `next-themes` (prevents hydration mismatch on class attribute)
- `${geistSans.variable} ${geistMono.variable}` — font CSS variable injection — DO NOT REMOVE
- `<Providers>` must wrap BOTH `<AppTopBar />` and `{children}` — the `ThemeProvider` inside `Providers` must be an ancestor of every visible element for dark mode to work
- `h-full flex flex-col` on `<body>` — `min-h-full` → `h-full` change ensures full height without scroll on the shell
- `flex flex-1 flex-col min-h-0 overflow-auto` on the children wrapper — `min-h-0` prevents flexbox height overflow; `overflow-auto` puts scroll on the content area, not the shell

### ⚠️ `AppTopBar` Component Location

**File:** `components/layout/AppTopBar.tsx`
**Directory:** `components/layout/` — CREATE this directory (it does not exist yet)
**Type:** RSC (no `'use client'`) — the top bar has no client-side interactivity in this story

```tsx
// components/layout/AppTopBar.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function AppTopBar() {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background shrink-0">
      <Link href="/" className="font-semibold text-sm text-foreground">
        Sphinx Needs Clone
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" disabled>
          New Need
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">Settings</Link>
        </Button>
      </div>
    </header>
  )
}
```

**Notes on this implementation:**
- `shrink-0` on `<header>` — prevents the top bar from shrinking when content area grows (flex item)
- `disabled` on "New Need" button — it has no action yet; Story 3.2 will wire the `onClick`/`NeedSheet` open. The button is rendered now as a placeholder per the epic ACs
- `asChild` pattern on Settings button — renders the `<Link>` as the underlying element while inheriting Button styles. This is the correct shadcn pattern for link-styled-as-button
- `bg-background` and `border-border` — use CSS variable tokens, not hardcoded colors; these adapt automatically to light/dark mode
- The "New Need" button uses `variant="default"` (primary blue per brand theme)

### ⚠️ `buttonVariants` Import for Link Styling (Alternative Pattern)

If the shadcn `Button` component in `components/ui/button.tsx` does not export `buttonVariants` (check the file — it may or may not depending on CLI version), you can alternatively style the Settings link without `asChild`:

```tsx
import { buttonVariants } from '@/components/ui/button'
// ...
<Link href="/settings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
  Settings
</Link>
```

Check `components/ui/button.tsx` first — if it exports `buttonVariants`, use whichever pattern is cleaner. `asChild` is the shadcn-recommended approach for this pattern.

### ⚠️ `app/page.tsx` — What to Keep vs Remove

**Keep (do NOT delete):**
```tsx
import { SEARCH_PARAM_KEYS } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  // Story 3.1 will use these params for NeedsTable
  ...
}
```

**Remove:**
- `<h1 className="text-2xl font-semibold">Needs</h1>` — Story 3.1 adds the real table header
- `<p className="text-muted-foreground mt-2">Requirements list will appear here...</p>` — boilerplate

**Target state:**
```tsx
import { SEARCH_PARAM_KEYS } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  void params // suppress unused warning until Story 3.1

  return (
    <main className="flex flex-1 flex-col" />
  )
}
```

### ⚠️ `app/settings/page.tsx` — Target State

```tsx
export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <p className="text-muted-foreground p-6">Settings coming soon.</p>
    </main>
  )
}
```

No imports needed at this stage. Story 2.1 and 2.2 will fill in the Settings page content.

### Architecture Compliance for This Story

| Rule | How This Story Complies |
|---|---|
| AD-1 — `server-only` for DB | `AppTopBar` does NOT import from `lib/db.ts` or any server-only module |
| AD-2 — Server Actions for mutations | No mutations in this story; "New Need" button is disabled placeholder |
| AD-5 — URL params own filter state | `searchParams` prop kept in `app/page.tsx` for Story 3.1 continuity |
| AD-13 — `SEARCH_PARAM_KEYS` import | Import kept in `app/page.tsx` — not removed |
| `'use client'` at lowest subtree | `AppTopBar` is RSC; no `'use client'` needed — no interactivity in this story |
| shadcn primitives in `components/ui/` | `Button` imported from `@/components/ui/button`, never hand-edited |
| File naming | `AppTopBar.tsx` = PascalCase React component; `components/layout/` = kebab-case directory |

### Deferred Items from Stories 1.1 / 1.2 Relevant Here

From `deferred-work.md`:
- **Boilerplate metadata** (`layout.tsx` title/description) — **This story RESOLVES it.** Update `title` to "Sphinx Needs Clone" and `description` to "A browser-based requirements management tool."
- **`searchParams` array coercion** (`page.tsx:9-10`) — still deferred; `app/page.tsx` is replaced in Story 3.1 when `NeedsTable` is built. The `void params` suppression is sufficient for this story's placeholder.

### Next.js App Router Patterns

**RSC vs Client Component decision for AppTopBar:**
- `AppTopBar` has zero interactivity in this story → RSC is correct
- Story 3.2 wires the "New Need" button to open `NeedSheet` — at that point, if `AppTopBar` needs `onClick`, it becomes `'use client'` OR (better pattern) an `<OpenNeedSheetButton>` client sub-component is extracted and placed inside `AppTopBar`, keeping the shell RSC

**Why `<Providers>` must wrap `<AppTopBar />`:**
- `next-themes` `ThemeProvider` injects a class on `<html>` based on system preference. The `dark:` Tailwind variant (`@custom-variant dark (&:is(.dark *))` in `globals.css`) requires `.dark` to be an ancestor. If `AppTopBar` is outside `<Providers>`, it won't respond to theme changes.
- This is already handled by the layout structure in Task 2 above.

**`suppressHydrationWarning` requirement:**
- `next-themes` sets `class="dark"` on `<html>` on the client after hydration. Without `suppressHydrationWarning`, React will emit a hydration mismatch warning on every page load. This prop is already present — DO NOT remove it.

### Stack Versions (Confirmed from Story 1.1 / 1.2)

| Package | Version |
|---|---|
| Next.js | 16.2.11 |
| React | 19.2.4 |
| TypeScript | ^5 (`strict: true`) |
| Tailwind CSS | ^4 (CSS-first) |
| shadcn/ui | 4.14.0 (Base UI + Nova preset) |
| next-themes | ^0.4.6 |
| Node.js | v22.12.0 |

### References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 1 Story 1.3 ACs, UX-DR5
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-bmad-demo-2026-07-16/ARCHITECTURE-SPINE.md` — Structural seed (source tree), `'use client'` scope rule, shadcn primitives convention
- UX Design: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/DESIGN.md` — Top bar 48px, layout spec, button-primary style, `asChild` for link buttons
- UX Experience: `_bmad-output/planning-artifacts/ux-designs/ux-bmad-demo-2026-07-16/EXPERIENCE.md` — Information architecture, top bar chrome spec, "New Need" + Settings placement
- Story 1.1: `_bmad-output/implementation-artifacts/1-1-initialize-next-js-project-scaffold-with-brand-theme.md` — Actual package versions, existing file state
- Story 1.2: `_bmad-output/implementation-artifacts/1-2-initialize-sqlite-database-layer.md` — No direct dependency; DB layer exists and is not touched by this story
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md` — Boilerplate metadata item resolved here

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot) — create-story workflow, 2026-07-26

### Debug Log References

### Completion Notes List

- Story auto-discovered from sprint-status.yaml: first `backlog` entry = `1-3-app-shell-layout`
- Epic 1 already `in-progress` — no status update needed
- "New Need" button rendered as `disabled` placeholder per epics AC; Story 3.2 wires the Sheet open
- `components/layout/` directory does not yet exist — Task 1 creates it
- Boilerplate metadata deferred item from Story 1.1 review is resolved in Task 2 (layout.tsx metadata update)
- `searchParams` prop kept in `app/page.tsx` — Story 3.1 depends on it immediately after this story
- Used `buttonVariants` for Settings `<Link>` instead of `asChild` — `button.tsx` uses `@base-ui/react/button` which does not support the `asChild` prop; `buttonVariants` is exported and achieves the same styled-link result
- `tsc --noEmit` exit 0; `npm run build` compiled successfully with clean TypeScript pass
- All ACs verified: top bar 48px, flexbox layout, correct slots, metadata updated, body `h-full` restructured, `<Providers>` wraps all content including AppTopBar, dark mode via CSS vars, `/` and `/settings` both render correctly

### File List

- `sphinx-needs-clone/components/layout/AppTopBar.tsx` — NEW
- `sphinx-needs-clone/app/layout.tsx` — UPDATE (add AppTopBar, restructure body h-full, update metadata)
- `sphinx-needs-clone/app/page.tsx` — UPDATE (strip placeholder heading/para, keep searchParams + SEARCH_PARAM_KEYS, add void params)
- `sphinx-needs-clone/app/settings/page.tsx` — UPDATE (strip placeholder content, add "Settings coming soon." placeholder)

## Change Log

- 2026-07-26: Implemented Story 1.3 — App Shell Layout. Created `AppTopBar` RSC with 48px header, app name link, disabled "New Need" button, and ghost Settings link. Updated root layout to `h-full flex flex-col` body structure with `<Providers>` wrapping AppTopBar + content. Stripped placeholder content from home and settings pages while preserving searchParams for Story 3.1. Updated metadata title/description. Build and TypeScript checks pass clean.
