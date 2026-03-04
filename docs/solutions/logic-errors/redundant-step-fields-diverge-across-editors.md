---
title: "Redundant mutable step fields diverge across editors"
category: logic-errors
module: BrewForm, BrewScreen, StepEditor
tags: [data-model, redundancy, migration, step-editor, diff, snapshot]
symptoms:
  - "Pour steps stored in 3 places on the same brew record"
  - "Two separate step editors in BrewForm — users confused about which one to edit"
  - "Editing planned steps doesn't affect actual steps, and vice versa"
  - "Data diverges silently between recipeSteps, steps, and recipeSnapshot.steps"
date_fixed: 2026-03-04
severity: P1
related: [dual-brew-format-schema-unification, dual-field-names-for-same-data-cause-silent-loss, duplicated-computation-diverges-over-time]
---

# Redundant mutable step fields diverge across editors

## Problem

Pour steps were stored redundantly in three fields on each brew record:

1. **`recipeSteps`** — top-level mutable field, intended as "the plan"
2. **`steps`** — top-level mutable field, intended as "what actually happened"
3. **`recipeSnapshot.steps`** — frozen at brew time inside the recipe snapshot object

At brew creation, all three started identical. Over time they diverged:

- BrewForm presented **two full StepEditor instances** — one editing `recipeSteps` (plan), one editing `steps` (actuals). Users did not understand which editor controlled what, and changes to one were invisible to the other.
- RecipeAssembly used a custom inline renderer that could edit duration/water/notes but **could not add or remove steps**, because it was not the shared StepEditor component.
- RateThisBrew read from `recipeSteps` for its timing review. If the user had only edited `steps`, the review showed stale data.

The plan-vs-actual distinction, expressed as two parallel mutable arrays, created more confusion than value.

## Root Cause

The original design modeled "planned steps" and "actual steps" as two independent mutable fields (`recipeSteps` and `steps`), both editable. This violates a core data modeling principle: **redundant mutable copies of the same data inevitably diverge**. The `recipeSnapshot.steps` field already existed as an immutable frozen copy of the plan, making `recipeSteps` fully redundant — its only purpose was already served by the snapshot.

Compounding the problem, three different screens each used a different rendering approach for steps (custom inline renderer, dual StepEditor, read-only list), so there was no single shared component enforcing consistent behavior.

## Investigation

Grepping for the three field names revealed the split:

- `recipeSteps` — written by BrewScreen at brew creation, read by BrewForm (plan editor), RateThisBrew (timing review), migrateExtractRecipes (recipe extraction)
- `steps` — written by BrewScreen at brew creation, read by BrewForm (actuals editor), BrewHistory (expanded card), ActiveBrew (teleprompter)
- `recipeSnapshot.steps` — written by BrewScreen at brew creation, read by nothing (dormant)

The snapshot field existed but was unused for comparison. The mutable `recipeSteps` was doing the job the immutable snapshot was designed for.

## Solution

Four coordinated changes across 8 phases:

### 1. Single shared StepEditor with opt-in props

`src/components/StepEditor.jsx` became the universal step editor, used in both RecipeAssembly (new brew planning) and BrewForm (post-brew editing). Two opt-in props adapt its behavior per consumer:

- `cascadeTime` — when true, duration changes auto-cascade start times; time field becomes read-only display
- `plannedSteps` — when provided, shows inline diff annotations comparing each step against the frozen plan

### 2. Inline diff annotations replace second editor

When `plannedSteps` is provided, `buildDiffMap()` compares actual steps against the frozen plan by step ID. Each step row shows subtle annotations: "planned: 40s" next to a changed duration, a green "added" tag for new steps, and a muted strikethrough row for removed steps.

### 3. BrewForm collapsed to single editor

BrewForm now manages one `steps` field (the actuals). The frozen plan is read once for diff annotations, never edited. On save, if `steps` differ from `recipeSnapshot.steps`, a prompt asks whether to update the recipe.

### 4. Migration: `migrateDropRecipeSteps()`

Idempotent migration that removes the redundant `recipeSteps` field from all brew records. Where `recipeSnapshot.steps` is missing, it synthesizes the snapshot from `recipeSteps` before deleting.

**Migration ordering matters:** `migrateDropRecipeSteps()` runs last in the chain, after `migrateExtractRecipes()` which still reads `recipeSteps` to extract recipe entities.

## Prevention

1. **Redundant mutable fields inevitably diverge — consolidate to a single source of truth.** If two fields hold the same data and both are mutable, one will eventually lag behind the other. When you need both "original" and "current" values, make the original immutable (a frozen snapshot) and the current the single editable copy.

2. **Frozen snapshots enable comparison without parallel mutable copies.** The `recipeSnapshot.steps` pattern — freeze the plan at brew time, compare against live `steps` at render time — gives plan-vs-actual comparison without the maintenance burden of keeping two mutable arrays in sync.

3. **Opt-in props keep a shared component simple for each consumer.** StepEditor serves two use cases (planning with cascading times, editing with diff annotations) through two independent boolean/data props. Each consumer opts into only the behavior it needs.

4. **Migration ordering matters — must run after migrations that still read the legacy field.** When adding a new migration that removes a field, grep for all readers of that field across the migration chain.

## Affected Files

| File | Change |
|------|--------|
| `src/components/StepEditor.jsx` | Shared component with `cascadeTime` and `plannedSteps` props. `buildDiffMap()`, `DiffTag`, `RemovedStepRow` for inline annotations. |
| `src/components/BrewForm.jsx` | Collapsed from two StepEditors to one. Single `steps` field with `plannedSteps` diff. Post-save recipe update prompt. |
| `src/components/BrewScreen.jsx` | RecipeAssembly uses StepEditor with `cascadeTime`. Removed custom inline step renderer. |
| `src/components/BrewHistory.jsx` | Changed `recipeSteps` references to `recipeSnapshot?.steps`. |
| `src/data/storage.js` | Added `migrateDropRecipeSteps()`. |
| `src/App.jsx` | Added `migrateDropRecipeSteps` to migration chain (last position). |
| `src/data/__tests__/migration.test.js` | Tests: idempotency, snapshot synthesis, field deletion. |
