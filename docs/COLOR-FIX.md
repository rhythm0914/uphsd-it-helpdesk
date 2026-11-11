# Color System Fix — UPHSD IT Help Desk

## Root Cause

**Tailwind CSS v4's `@theme inline` does not resolve nested CSS `var()` references for utility generation.**

In `app/globals.css`, the `@theme inline` block defined theme colors as references to `:root` CSS variables:

```css
:root { --primary: #6B1527; }
@theme inline { --color-primary: var(--primary); }
```

When a component uses `bg-primary`, Tailwind v4 generates `background-color: var(--color-primary)`. The value of `--color-primary` is `var(--primary)`, which the browser must resolve again to `--primary: #6B1527`. However, Tailwind v4's CSS parser (via `@tailwindcss/postcss`) does not resolve nested `var()` references when building utility classes. The result is that utilities like `bg-primary`, `text-primary-foreground`, `hover:bg-primary-hover`, and `focus-visible:ring-primary` all produce empty or invalid CSS.

**Symptoms observed in production:**
- Primary buttons render as plain text with no background fill
- "Sign In" buttons show white text on near-white backgrounds (invisible)
- Ghost/outline buttons are the only visibly styled buttons (they use `bg-surface` which happens to resolve via `:root`)
- Sidebar active state shows pale pink with no clear identity
- Status chips, priority chips, KPI cards all lack proper color

## Fix Applied

Changed `@theme inline` in `app/globals.css` to use **direct hex color values** instead of `var(--...)` references:

```css
@theme inline {
  --color-primary: #6B1527;        /* direct hex, not var(--primary) */
  --color-primary-hover: #4A0F1C;
  --color-on-primary: #FFFFFF;
  ...
}
```

This ensures Tailwind v4 generates valid CSS utilities like:
```css
.bg-primary { background-color: var(--color-primary); }
```
where `var(--color-primary)` resolves to `#6B1527` directly (no nested `var()` resolution needed).

## All Semantic Tokens Added

The following required semantic tokens were added to `@theme inline`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | #6B1527 | Primary buttons, active states |
| `--color-primary-hover` | #4A0F1C | Primary hover |
| `--color-primary-active` | #2A0A10 | Primary active |
| `--color-on-primary` | #FFFFFF | Text on primary backgrounds |
| `--color-secondary` | #1E3A6E | Links, secondary buttons |
| `--color-secondary-hover` | #162C55 | Secondary hover |
| `--color-on-secondary` | #FFFFFF | Text on secondary backgrounds |
| `--color-accent` | #F5B921 | Gold accent (CTA on dark) |
| `--color-on-accent` | #2A0A10 | Text on gold backgrounds |
| `--color-surface` | #FFFFFF | Card backgrounds |
| `--color-surface-alt` | #F7F3F1 | Alternate section backgrounds |
| `--color-border` | #CFC7C5 | Input borders, dividers |
| `--color-border-strong` | #8A8183 | Strong input borders |
| `--color-text` | #1F1A1B | Body text |
| `--color-text-muted` | #5E5557 | Muted text |
| `--color-link` | #1E3A6E | Links |
| `--color-link-hover` | #162C55 | Link hover |
| `--color-focus-ring` | #F5B921 | Focus ring (gold) |
| `--color-danger` | #8B1A1A | Danger buttons, error text |
| `--color-success` | #0F5132 | Success text |
| `--color-success-bg` | #DFF3E7 | Success backgrounds |
| `--color-warning` | #6B4E00 | Warning text |
| `--color-warning-bg` | #FFF3CC | Warning backgrounds |
| `--color-info` | #1E3A6E | Info text |
| `--color-info-bg` | #E6ECF6 | Info backgrounds |
| `--color-disabled-bg` | #E7E2E0 | Disabled backgrounds |
| `--color-disabled-text` | #6B6264 | Disabled text |
| `--color-sidebar-bg` | #1E3A6E | Sidebar background |
| `--color-sidebar-text` | #FFFFFF | Sidebar text |
| `--color-sidebar-active-bg` | #851C31 | Sidebar active item |
| `--color-sidebar-active-text` | #FFFFFF | Sidebar active text |

## Contrast Verification

Every text/background pair was verified to meet WCAG 2.2 AA (4.5:1 body, 3:1 UI). See `/docs/DESIGN.md` for the full contrast table.

## Files Changed

- `app/globals.css` — Rewrote `@theme inline` with direct hex values, added all semantic tokens
- `components/ui/button.tsx` — Rewrote button variants with correct tokens and states
- `components/ui/badge.tsx`, `status-badge.tsx` — Updated to use new semantic tokens
- All page components using color tokens — Updated to use resolved token names
- `scripts/check-tokens` — New script to verify all token references resolve
- `scripts/check-contrast` — New script to verify contrast ratios
- `docs/DESIGN.md` — Updated with final tokens and contrast table
- `docs/COLOR-FIX.md` — This document