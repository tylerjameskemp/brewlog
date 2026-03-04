---
title: Unify Pour Steps — Single Editor, Inline Diff
type: refactor
date: 2026-03-04
---

# Unify Pour Steps — Single Editor, Inline Diff

## Overview

Eliminate the confusing dual step editors and redundant `recipeSteps` field. After this change, every brew has ONE editable `steps` field and a frozen `recipeSnapshot.steps` for plan comparison. StepEditor is the single component for step editing everywhere. Recipe names become user-editable.

**Brainstorm:** `docs/brainstorms/2026-03-04-unify-pour-steps-brainstorm.md`

## Problem Statement

1. **BrewForm shows steps in two places** — "Pour Steps" under Recipe (plan) and "Pour Steps" under Brew (actuals). Confusing and redundant.
2. **RecipeAssembly can't add/remove steps** — Custom inline renderer only edits duration/water/notes. Users must pick a template or edit from history.
3. **Brew records store steps 3 times** — `recipeSteps`, `steps`, and `recipeSnapshot.steps` are all identical at creation.
4. **Recipes can't be renamed** — Two V60 recipes for the same bean look identical in the picker.

## Proposed Solution

### Data Model

**Remove** `recipeSteps` from brew records. The remaining fields:

| Field | Role | Editable? |
|---|---|---|
| `steps` | The actuals (what happened or will happen) | Yes — in RecipeAssembly and BrewForm |
| `recipeSnapshot.steps` | Frozen plan at brew time | Never (read-only reference) |
| `stepResults` | Timer tap data | Never after brew |

### UI Changes

| Screen | Before | After |
|---|---|---|
| RecipeAssembly | Custom inline renderer, no add/remove | StepEditor in own section (outside swipe cards) |
| BrewForm | Two StepEditors | One StepEditor editing `steps`, with inline diff annotations |
| RateThisBrew | Reads `brew.recipeSteps` | Reads `brew.recipeSnapshot?.steps` |
| BrewHistory | Reads `recipeSteps` in 4 places | Reads `recipeSnapshot?.steps`, suppresses diff when null |
| Recipe Picker | Names are auto-set, not editable | Pencil icon for inline rename |

## Technical Approach

### Phase 1: StepEditor Enhancement

Prerequisite work — make StepEditor capable of replacing RecipeAssembly's inline renderer.

#### 1a. Add `duration` field to StepEditor

**File:** `src/components/StepEditor.jsx`

StepEditor currently shows `name`, `time`, `waterTo`, `note`. RecipeAssembly's inline renderer shows `duration`. The timer teleprompter and `getTotalDuration()` depend on `duration`.

- Add `duration` input (seconds) to `StepRow`, between `time` and `waterTo`
- Show formatted time hint below duration (like the existing one for `time`)
- Update `handleAdd()` to set `duration: 40` (not `null`) as default

#### 1b. Add cascading time recalculation (opt-in)

**File:** `src/components/StepEditor.jsx`

RecipeAssembly's `updateStep` (BrewScreen.jsx:290-302) recalculates `time` for all subsequent steps when `duration` changes. StepEditor needs this.

- New prop: `cascadeTime` (boolean, default `false`)
- When `cascadeTime` is true and `duration` changes on a step, recalculate `time` for all subsequent steps: `steps[i].time = steps[i-1].time + steps[i-1].duration`
- When `cascadeTime` is true, make the `time` field read-only (derived) — show it as display text, not an input
- RecipeAssembly passes `cascadeTime={true}`, BrewForm passes nothing (defaults to `false`)

#### 1c. Add inline diff annotations (opt-in)

**File:** `src/components/StepEditor.jsx`

- New prop: `plannedSteps` (array, optional)
- When `plannedSteps` is provided, StepEditor enters "diff mode":
  - Match actuals to planned by `step.id`
  - For each step with a matching planned step: show subtle "planned: X" annotation next to any changed field (duration, waterTo, time, name)
  - Steps in actuals but not in planned: show small "added" tag
  - Steps in planned but not in actuals: show muted "removed" row at the bottom (read-only, not editable)
- Diff annotations are always visible (not collapsible) — they're small text, not bulky UI
- BrewForm passes `plannedSteps={recipeSnapshot?.steps}`, RecipeAssembly passes nothing

### Phase 2: RecipeAssembly Integration

Replace the custom inline step renderer with StepEditor.

#### 2a. Move steps out of swipe cards

**File:** `src/components/BrewScreen.jsx` (RecipeAssembly, lines 212-876)

Steps currently live inside the swipe card deck as `stepsCard`. StepEditor has add/remove buttons and scrollable content that conflict with swipe gestures. Move steps to their own collapsible section below the swipe cards.

- Remove `stepsCard` from the `SwipeCards` array (keep essentials and origin cards)
- Add a new `<Section title="Pour Steps">` below the swipe cards, containing StepEditor
- Pass `cascadeTime={true}` and `disabled={!editing}` (respect existing edit toggle)
- Wire `onChange` to update `recipe.steps` via `setRecipe`
- Delete the `updateStep` function (lines 290-302) — StepEditor handles this internally
- Update `SwipeCards` card count and index logic

#### 2b. Add recipe rename to picker dropdown

**File:** `src/components/BrewScreen.jsx` (RecipeAssembly, lines 542-597)

- Add a pencil icon next to each recipe name in the dropdown
- On pencil click: replace name text with a text input (max 50 chars), pre-filled with current name
- On blur or Enter: call `updateRecipe(r.id, { name: newName })`, refresh recipes state
- On Escape: cancel, revert to original name
- Empty name reverts to previous value (don't allow blank)
- Single-recipe beans: still show the recipe indicator pill, but clicking opens a minimal dropdown with just the rename option and "+ New Recipe"

### Phase 3: BrewForm Simplification

Collapse dual editors into one with diff annotations.

#### 3a. Remove Phase 1 StepEditor (planned steps)

**File:** `src/components/BrewForm.jsx`

- Delete the Phase 1 "Pour Steps" section (lines 339-346) that edits `form.recipeSteps`
- Delete `recipeStepsModifiedRef` (line 75)
- Delete `getRecipeSteps` helper (lines 20-23)
- Remove `recipeSteps` from form state initialization (line 64)

#### 3b. Update remaining StepEditor to show diff annotations

**File:** `src/components/BrewForm.jsx`

- The Phase 2 StepEditor becomes the only one, editing `form.steps`
- Pass `plannedSteps={editBrew.recipeSnapshot?.steps}` for diff annotations
- Update hint text: "Modify anything that went differently from your plan."
- Keep `stepsModifiedRef` for tracking modifications
- Remove the `form.recipeSteps.length > 0` guard — always show if `form.steps.length > 0` or `editBrew.recipeSnapshot?.steps?.length > 0`

#### 3c. Update save logic

**File:** `src/components/BrewForm.jsx` (handleSave, lines 96-138)

- Remove all `recipeSteps` handling: `finalRecipeSteps`, `recipeStepsModifiedRef`, `recipeSteps:` in `updateBrew` call
- Simplify: if `stepsModifiedRef.current`, use `form.steps`; else preserve `editBrew.steps`
- Continue preserving `recipeSnapshot`, `stepResults`, `timeStatus` (unchanged)

#### 3d. Add recipe update prompt

**File:** `src/components/BrewForm.jsx`

New props needed from App.jsx:
- `recipes` (read-only, for lookup)
- `onUpdateRecipe(recipeId, fields)` callback
- `onSaveAsNewRecipe(recipeId, fields)` callback

After `updateBrew()` succeeds, check if steps differ from `recipeSnapshot?.steps`:
- If no `recipeSnapshot` or no `recipeId`: skip prompt
- If `recipeId` points to an archived recipe: skip prompt
- If steps differ: show inline prompt (banner below save button, not a modal):
  - "Your steps differed from the original plan. Update the recipe?"
  - Three buttons: "Update Recipe" / "Save as New Recipe" / "Keep Original"
  - "Update Recipe" calls `onUpdateRecipe(editBrew.recipeId, { steps: form.steps })`
  - "Save as New Recipe" calls `onSaveAsNewRecipe(editBrew.recipeId, { steps: form.steps })`
  - "Keep Original" dismisses the prompt
- After action or dismiss, navigate back to history (existing behavior)

Compare against `recipeSnapshot.steps` (the frozen plan for this brew), not the current recipe entity's steps.

### Phase 4: BrewScreen Cleanup

Update remaining `recipeSteps` references.

#### 4a. buildBrewRecord

**File:** `src/components/BrewScreen.jsx` (line 1734)

- Delete `recipeSteps: recipe.steps` (line 1734)
- `steps` (line 1733) and `recipeSnapshot` (line 1725) remain unchanged

#### 4b. RateThisBrew

**File:** `src/components/BrewScreen.jsx` (line 1163)

- Change `const steps = brew.recipeSteps || []` to `const steps = brew.recipeSnapshot?.steps || brew.steps || []`

### Phase 5: BrewHistory Updates

Update all four `recipeSteps` references.

**File:** `src/components/BrewHistory.jsx`

| Line | Current | New | Fallback when no snapshot |
|---|---|---|---|
| 74 | `stepsChanged(brewA.recipeSteps, brewB.recipeSteps)` | `stepsChanged(brewA.recipeSnapshot?.steps, brewB.recipeSnapshot?.steps)` | Both undefined → `stepsChanged([], [])` → false (no badge) |
| 229 | `stepsChanged(brew.recipeSteps, prev.recipeSteps)` | `stepsChanged(brew.recipeSnapshot?.steps, prev.recipeSnapshot?.steps)` | Same fallback — no badge for legacy brews |
| 494 | `normalizeSteps(brew.recipeSteps)` | `normalizeSteps(brew.recipeSnapshot?.steps)` | Returns `[]` — no planned steps displayed |
| 659 | `stepsChanged(brew.recipeSteps, brew.steps)` | `stepsChanged(brew.recipeSnapshot?.steps, brew.steps)` | No snapshot → `stepsChanged([], brew.steps)` → suppress annotation if no snapshot |

For line 659: add explicit guard — only show "steps differed" annotation when `brew.recipeSnapshot?.steps` exists and has length > 0.

### Phase 6: Migration

**File:** `src/data/storage.js`

New migration: `migrateDropRecipeSteps()`

**Position in chain:** AFTER `migrateExtractRecipes()` — critical because `migrateExtractRecipes` reads `brew.recipeSteps` (line 524) to extract recipe entities.

Updated chain: `migrateGrindSettings` → `seedDefaultPourTemplates` → `migrateBloomToSteps` → `migrateToSchemaV2` → `migrateExtractRecipes` → **`migrateDropRecipeSteps`**

**Logic:**
```
for each brew:
  if brew.recipeSteps === undefined → skip (already migrated or never had it)

  if !brew.recipeSnapshot or !brew.recipeSnapshot.steps:
    // Synthesize minimal recipeSnapshot from recipeSteps
    brew.recipeSnapshot = brew.recipeSnapshot || {}
    brew.recipeSnapshot.steps = structuredClone(brew.recipeSteps)

  delete brew.recipeSteps
  changed = true
```

**Also add to import/merge chain:** Both `importData()` (around line 751-753) and `mergeData()` (around line 805-808) call the migration chain after import. Add `migrateDropRecipeSteps()` to both.

**Idempotency:** Guard on `brew.recipeSteps !== undefined`. Safe to run multiple times.

### Phase 7: Test Updates

**Files:** `src/data/__tests__/storage.test.js`, `src/data/__tests__/migration.test.js`

- Update existing tests that reference `recipeSteps` on brew records
- Add migration tests:
  - Brew with `recipeSteps` and existing `recipeSnapshot` → drops `recipeSteps`, keeps `recipeSnapshot`
  - Brew with `recipeSteps` but null `recipeSnapshot` → synthesizes `recipeSnapshot.steps` from `recipeSteps`, then drops
  - Brew with neither → no-op
  - Idempotency: running twice produces same result
  - Import with old format → migration runs, `recipeSteps` dropped
- Update BrewForm-related tests if any reference dual step editors

### Phase 8: CLAUDE.md Update

Update data model documentation, patterns section, and migration chain list to reflect the new single-steps model.

## Acceptance Criteria

### Functional

- [x] RecipeAssembly shows StepEditor with full add/remove/edit (including duration)
- [x] Changing step duration in RecipeAssembly cascades start times to subsequent steps
- [x] BrewForm shows ONE StepEditor with inline diff annotations against `recipeSnapshot.steps`
- [x] Diff annotations show "planned: X" for changed fields, "added" for new steps, "removed" for missing steps
- [x] BrewForm save prompts "Update recipe?" when steps differ from plan (skip when no recipe or no snapshot)
- [x] RateThisBrew reads step timing from `recipeSnapshot.steps`
- [x] BrewHistory diff badges use `recipeSnapshot.steps`, suppressed when no snapshot
- [x] Recipe picker dropdown shows pencil icon for renaming recipes
- [x] Recipe rename persists via `updateRecipe()`, max 50 chars, empty reverts
- [x] Migration drops `recipeSteps`, synthesizes `recipeSnapshot.steps` where missing
- [x] Migration runs in import/merge chain too
- [x] `npm run build` passes with zero errors

### Non-Functional

- [x] No `recipeSteps` references remain in source code (except migration and old migration functions)
- [x] StepEditor cascading and diff props are opt-in (no behavior change when not passed)
- [x] Legacy brews without `recipeSnapshot` degrade gracefully (no diff, no badges, no crash)

## Dependencies & Risks

**Risk: Migration ordering.** `migrateExtractRecipes` reads `recipeSteps`. New migration MUST run after it. Verified by checking existing migration chain in `App.jsx`.

**Risk: StepEditor in swipe cards.** Solved by moving steps out of swipe cards into own section. No touch gesture conflicts.

**Risk: BrewForm prop expansion.** Need `onUpdateRecipe` and `onSaveAsNewRecipe` callbacks threaded from App.jsx through BrewHistory. This mirrors the pattern already used in BrewScreen.

**Risk: Cascading time recalculation.** StepEditor's new `cascadeTime` prop must match RecipeAssembly's existing behavior exactly. Test by comparing timer behavior before/after the swap.

## Relevant Learnings

From `docs/solutions/`:
- **edit-form-overwrites-fields-it-doesnt-manage**: Use refs to track modifications, carry forward originals for untouched fields
- **entity-form-field-mapping-diverges-across-sites**: Diff detection must use same field list as persistence
- **dual-brew-format-schema-unification**: Migration pattern — idempotent check, in-place mutation, batch write
- **dual-field-names-for-same-data-cause-silent-loss**: Grep all consumers of `recipeSteps` before removing
- **new-entity-crud-misses-defensive-patterns**: Check `safeSetItem` return, pin immutable fields after spread

## References

- Brainstorm: `docs/brainstorms/2026-03-04-unify-pour-steps-brainstorm.md`
- StepEditor: `src/components/StepEditor.jsx`
- RecipeAssembly inline renderer: `src/components/BrewScreen.jsx:290-530`
- BrewForm dual editors: `src/components/BrewForm.jsx:339-387`
- buildBrewRecord: `src/components/BrewScreen.jsx:1714-1744`
- Migration chain: `src/data/storage.js:372-559`
- Recipe picker: `src/components/BrewScreen.jsx:542-597`
- BrewHistory recipeSteps refs: `src/components/BrewHistory.jsx:74,229,494,659`
