---
name: Sphinx Needs Clone
description: Browser-based requirements management tool — typed, linkable need objects with a filterable table. shadcn/ui on Next.js + Tailwind; this DESIGN.md specifies the brand-layer delta only.
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-bmad-demo-2026-07-16/prd.md
updated: 2026-07-16
colors:
  # Brand accent — professional blue. All unlisted tokens inherit from shadcn defaults.
  primary: '#2563EB'
  primary-foreground: '#FFFFFF'
  primary-dark: '#60A5FA'
  primary-foreground-dark: '#0D1526'
  # Need-type badge preset palette (runtime-configurable; these are suggested defaults)
  type-req: '#2563EB'
  type-spec: '#7C3AED'
  type-impl: '#059669'
  type-test: '#D97706'
rounded:
  # Tighter than shadcn defaults — engineering tool reads precise, not bubbly
  sm: 3px
  md: 5px
  lg: 7px
  DEFAULT: 5px
components:
  need-type-badge:
    background: 'var(--type-color)'
    foreground: '#FFFFFF'
    radius: '{rounded.sm}'
    fontSize: '11px'
    fontWeight: '600'
    textTransform: 'uppercase'
    letterSpacing: '0.04em'
    paddingX: '6px'
    paddingY: '2px'
  status-badge:
    background: '{colors.muted}'
    foreground: '{colors.muted-foreground}'
    radius: '{rounded.sm}'
    fontSize: '11px'
    fontWeight: '500'
    paddingX: '6px'
    paddingY: '2px'
  id-chip:
    fontFamily: 'monospace'
    fontSize: '12px'
    fontWeight: '500'
    color: '{colors.primary}'
    background: 'transparent'
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
---

## Brand & Style

Sphinx Needs Clone is an engineering tool first. The aesthetic posture is **precise, information-dense, and neutral** — the interface steps back so the data is front and center. There is no personality layer, no onboarding charm, no brand story. The tool should feel like a well-made IDE extension dropped into a browser tab.

The product inherits shadcn/ui defaults wholesale. This DESIGN.md specifies only the brand-layer deltas: a professional blue primary, tighter corners, a monospace ID chip, and a need-type badge component. The 90% of components that ship from shadcn (Table, Button, Dialog, Sheet, Input, Select, Badge, Popover, Toast, Skeleton) inherit shadcn's visual specs as-is.

Light and dark modes are both first-class. System preference is the default. No preference UI is needed for MVP.

## Colors

The palette is one brand color plus shadcn defaults.

- **Primary Blue (`#2563EB` light / `#60A5FA` dark)** is the single brand color. Used on primary buttons, active table row accent, focus rings, ID chip text, and link counts. Replaces shadcn's default `primary`.
- **Need-type badge colors** are runtime-configurable per need type (FR-2). The preset palette above (`type-req`, `type-spec`, `type-impl`, `type-test`) is the suggested starting set. Users may override per type in settings. Never hardcode a type's color in layout — always read from the stored type config.
- **All other tokens** (`background`, `foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `card`, `popover`, `destructive`) inherit from shadcn defaults in both modes.

Avoid: colorful chrome, gradients, secondary brand colors, custom destructive colors. One blue and stop.

## Typography

All typography inherits from shadcn defaults (Geist Sans for body/labels/UI text; Geist Mono for code). The only brand-specific type rule is the **ID chip** — need IDs (`REQ_001`, `SPEC_003`) are always rendered in `font-mono` at 12px medium weight, colored `{colors.primary}`. This signals "this is a structured identifier, not prose."

Table cell text follows shadcn's `body-sm` ramp. Column headers use shadcn's `label` ramp. No display or hero typography — this product has no marketing surfaces.

## Layout & Spacing

shadcn / Tailwind 4-base spacing scale inherited as-is. The main layout is a full-viewport shell:

- **Top bar** (48px): app name left, global "New Need" button right.
- **Content area** fills remaining height with the needs table.
- **Side sheet** overlays from the right for need detail/edit (480px wide on `≥ lg`).

No sidebar, no nav rail — the product has only two primary surfaces (table and settings) reachable from the top bar.

Maximum table content width: unconstrained — wide tables are the product, not the exception.

## Elevation & Depth

shadcn shadow tokens inherited. The side sheet uses `shadow-xl` on its left edge to separate from the table. Dialogs (delete confirm) use shadcn's `Dialog` with default overlay. No custom shadow tokens needed.

## Shapes

Corner radii are tighter than shadcn defaults (`sm: 3px`, `md: 5px`, `lg: 7px`). Engineering tools read precise; the softness of shadcn's defaults (`sm: 4px`, `md: 8px`) is more consumer-product than dev-tool. Inputs, buttons, badges, and cards all use `{rounded.md}`. The need-type badge uses `{rounded.sm}` — it's small enough that `md` would look like a pill.

## Components

### Need-type Badge

A compact colored label identifying a need's type (e.g., `REQ`, `SPEC`). Color is supplied at render time from the type's stored config; foreground is always white. Text is uppercase 11px semibold monospace-adjacent. Used in the table Type column and the need detail header.

### Status Badge

A neutral muted-background pill for the need's status value (e.g., `open`, `closed`, `in_review`). Intentionally desaturated — it carries information, not urgency. Color may be overridden per status value in a future iteration; for MVP, all statuses share the muted palette.

### ID Chip

Inline monospace identifier. Not a button — purely presentational. Colored `{colors.primary}` to distinguish structured IDs from prose in mixed-content cells. Used in: table ID column, links list within need detail, backlinks list.

## Do's and Don'ts

**Do:**
- Render need IDs in monospace `{colors.primary}` everywhere they appear.
- Use need-type badge color from runtime config — never hardcode.
- Inherit shadcn defaults for any component not listed above.
- Keep the side sheet at 480px on desktop — wide enough for description text, narrow enough to keep the table partially visible.

**Don't:**
- Add a second brand color, gradient, or decorative background.
- Use the primary blue for anything other than the listed roles (buttons, active states, ID chips, focus rings).
- Round table rows — no `rounded` on `<tr>` or full-width row wrappers.
- Override shadcn's destructive color — the default red is correct for delete actions.
