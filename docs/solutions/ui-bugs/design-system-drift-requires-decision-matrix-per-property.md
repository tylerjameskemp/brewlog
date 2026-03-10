---
title: "Design system drift requires a decision matrix per property"
category: ui-bugs
tags: [design-system, Tailwind, consistency, audit, visual-refactor]
module: BrewScreen, BrewForm, BrewHistory, MobileNav, SettingsMenu, EquipmentSetup
symptoms:
  - "bg-white used on some cards, bg-parchment-50 on others"
  - "CTA buttons use bg-brew-600 in some files, bg-crema-500 in others"
  - "Same role element uses different border-radius in different components"
  - "text-brew-500 means 'label' in one file and 'interactive' in another"
created: 2026-03-10
---

# Design system drift requires a decision matrix per property

## Problem

After multiple rounds of organic development, visual properties drift across components. Each file is internally consistent but globally inconsistent. A batch unification pass that naively replaces every instance of a class creates false positives — some uses are intentional exceptions.

## Symptoms

- `bg-white` used on some elevated surfaces, `bg-parchment-50` on others.
- CTA buttons use `bg-brew-600` in older components, `bg-crema-500` in newer ones.
- Identical form inputs use `rounded-lg` in one file and `rounded-xl` in another.
- `text-brew-500` means "metadata label" in one component and "interactive ghost button" in another.

## Root Cause

Visual properties drift independently per file because there is no canonical rule for each property. Typography drift (documented separately) is one axis; surface colors, button colors, border radius, and text colors each drift along their own axes. A single typography scale table is insufficient — you need a rule per visual property.

## Solution

Before any batch CSS migration, build a **decision matrix** for each property being unified. The matrix categorizes every existing instance as "change" or "keep" with a reason.

### Example: `bg-brew-600` migration

| Instance | Context | Decision | Reason |
|----------|---------|----------|--------|
| SettingsMenu import button | CTA button | Change → `bg-crema-500` | Primary action |
| EquipmentSetup "Save" button | CTA button | Change → `bg-crema-500` | Primary action |
| FlavorPicker selected pill hover | Decorative hover state | Keep | Not a CTA |
| EquipmentSetup progress dot | Stepper indicator | Keep | Not a button |

### Example: `text-brew-500` migration

| Instance | Context | Decision | Reason |
|----------|---------|----------|--------|
| Form label "Dose:" | Metadata label | Change → `text-brew-400` | Metadata tier |
| Ghost "Cancel" button | Interactive text | Keep at `text-brew-500` | Interactive tier |
| Toggle link text | Interactive text | Keep at `text-brew-500` | Interactive tier |

### The process

1. **Define the canonical rule** in CLAUDE.md before touching any files
2. **Grep for every instance** of the class being migrated
3. **Categorize each instance** into change/keep with a reason
4. **Execute the migration** following the matrix, not a blind find-replace
5. **Run `npm run build`** after each property to catch regressions
6. **Verify with grep** that no unintended instances remain

## Why the Matrix Comes First

Without a decision matrix:
- You'll change a decorative `bg-brew-600` hover state to `bg-crema-500`, breaking the visual distinction between "selected state" and "CTA"
- You'll change an interactive `text-brew-500` ghost button to `text-brew-400`, making it look like a passive label
- Reviewers can't distinguish intentional keeps from accidental misses

The matrix makes every decision explicit and reviewable.

## Relationship to Typography Drift

This is the generalized form of the typography drift lesson (`typography-drift-requires-canonical-scale-table.md`). Typography is one visual property; this pattern applies to all of them. Each property needs its own canonical rule and its own migration matrix.

## Pitfalls

- **`rounded-2xl` on CTA buttons:** When the rule says "buttons = `rounded-xl`" but some hero CTAs use `rounded-2xl` for visual weight, you must either change them or add an exception to the rule. Don't leave the inconsistency undocumented.
- **Undefined tiers:** If your five-tone text color hierarchy uses `text-brew-400` for metadata, but 25 instances of `text-brew-600` exist for a role that doesn't fit any tier, the hierarchy is incomplete. Either add the tier or migrate the instances.
- **Placeholder colors:** `placeholder:text-brew-300` and `disabled:text-ceramic-400` are different properties. Migrating one but not the other leaves the hints/disabled tier split across two color scales.

## References

- PR #45: Design system unification (7-task visual consistency pass)
- Typography drift: `docs/solutions/ui-bugs/typography-drift-requires-canonical-scale-table.md`
- Progressive disclosure: `docs/solutions/react-patterns/progressive-disclosure-summary-vs-details-split.md`
- Content indicators: `docs/solutions/react-patterns/content-indicators-on-collapsed-sections.md`
