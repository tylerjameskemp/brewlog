---
title: "Typography drift requires a canonical scale table"
category: ui-bugs
tags: [typography, design-system, Tailwind, consistency, audit]
module: BrewScreen, BrewForm, StepEditor
symptoms:
  - "text-[11px] appears across multiple files"
  - "Inputs have conflicting text-sm text-base classes"
  - "Similar labels use different font sizes in different components"
  - "Focus states use different ring colors in different files"
created: 2026-03-06
---

# Typography drift requires a canonical scale table

## Problem

Over time, typography classes drift across components. Each developer makes locally reasonable choices — "a bit smaller than text-xs" becomes `text-[11px]`, "slightly bigger than the label" becomes `text-sm` on an input that already has `text-base`. Without a canonical scale, each file is internally consistent but globally inconsistent.

## Symptoms

- `text-[11px]` appears in multiple files (an intermediate size that exists in no standard scale).
- Inputs have conflicting size classes like `text-sm text-base` (last one wins unpredictably in Tailwind).
- The same role (e.g., "form label") uses `text-xs` in one component and `text-[11px]` in another.
- Focus state styles vary by file (`focus:border-brew-500` vs `focus:ring-2 focus:ring-brew-400`).

## Root Cause

Typography classes are chosen per-file at development time without referencing a shared scale. Over multiple PRs, three types of drift accumulate:

1. **Below-minimum sizes:** `text-[9px]` for "really tiny" annotations. Below readable thresholds.
2. **Intermediate sizes:** `text-[11px]` — halfway between `text-[10px]` (badges) and `text-xs` (12px, small text). Introduced when "text-xs feels too big but text-[10px] feels too badge-like."
3. **Conflicting classes:** `text-sm text-base` on the same element. Happens when a size is added without removing the existing one.

The same drift pattern applies to focus states, tracking values (`tracking-wider` vs `tracking-widest`), and any Tailwind utility that maps to a continuous scale.

## Solution

Define the canonical scale table **before** auditing any files:

| Role | Classes | Allowed Where |
|------|---------|---------------|
| Page heading | `text-2xl font-semibold text-brew-800` | Top of each screen |
| Card heading | `text-lg font-semibold text-brew-800` | Card titles |
| Section label | `text-xs text-brew-400 uppercase tracking-wider` | Section dividers |
| Field label | `text-xs text-brew-400` | Form input labels |
| Input text | `text-base text-brew-800` | All inputs (iOS zoom prevention) |
| Body text | `text-sm text-brew-700` | Descriptions |
| Muted text | `text-xs text-brew-400` | Dates, metadata |
| Monospace data | `font-mono text-brew-700` | Numeric values |
| Badge/diff text | `text-[10px] font-medium` | Minimum readable size |

**Banned intermediate sizes:**
- `text-[9px]` — always upgrade to `text-[10px]`
- `text-[11px]` — always round to `text-xs` (12px)

**Audit process:**
1. Write the table with roles, classes, and allowed contexts
2. Grep for banned sizes: `text-[9px]`, `text-[11px]`
3. Grep for conflicting classes: inputs with both `text-sm` and `text-base`
4. Walk each file against the table, normalizing each element to its role
5. Acceptance criteria are binary: "no text-[9px] anywhere" is verifiable, "looks consistent" is not

## Why the Table Comes First

An audit without a table produces local consistency (each file normalized against itself) but not global consistency (all files normalized against the same standard). You'll fix `text-[11px]` to `text-xs` in one file and to `text-[10px]` in another based on local context, re-introducing drift.

The table also defines "done" — the acceptance criteria are direct negations of the banned patterns, grepable across the entire codebase.

## Parallel Drift

The same audit approach applies to:
- **Focus states:** Define one ring style (`focus:ring-2 focus:ring-brew-400`), grep for all `focus:ring-*` and `focus:border-*` variants
- **Tracking:** Choose `tracking-wider` or `tracking-widest` for uppercase labels, not both
- **Color palette:** Define which `gray-*` usages are intentional exceptions and document them in code comments

## References

- Phase 3 plan: `docs/plans/2026-03-06-refactor-phase3-polish-plan.md` (section 3.1, Typography Scale table)
- iOS auto-zoom gotcha: All inputs must have `text-base` (16px minimum) — see CLAUDE.md "Mobile iOS compat"
