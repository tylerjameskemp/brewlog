# Recipe Save & Propagation Bugs — Brainstorm

**Date:** 2026-03-05
**Status:** Ready for planning

## What We're Building

Fix a cluster of related bugs that prevent recipe edits from propagating correctly through the brew flow, plus add an explicit "Save Recipe" action in RecipeAssembly.

## Problems Identified

### Bug 1: BrewSuccess recipe buttons are broken
`BrewSuccess` (BrewScreen.jsx:1549) is a standalone function component that references `savingRef` in its onClick handlers (lines 1604-1621), but `savingRef` is only defined inside `RateThisBrew` (line 1245) and the main `BrewScreen` component (line 1668). Neither is in scope. Clicking "Update Recipe" or "Save as New" throws a silent `TypeError`, so only "Keep Original" works.

### Bug 2: Edit mode doesn't flush on "Brew This"
`commitTargetTimeInputs()` only runs when the user explicitly taps "Done" to exit edit mode. If the user edits target time and goes straight to "Brew This", the value stays in the display input but never commits to React state. The brew proceeds with stale values.

### Bug 3: BrewForm recipe update is steps-only
`handleRecipeAction` (BrewForm.jsx:142) passes `{ steps: form.steps }` to the recipe update callback — only steps. Target time, grind, water temp, and all other RECIPE_FIELDS are never propagated to the recipe entity when editing from History.

### Bug 4: History displays "4:30" instead of "4:00-5:00"
When a target time range is set, `targetTime` stores the midpoint (270s = 4:30) while `targetTimeRange` stores the display string ("4:00-5:00"). History display likely reads `targetTime` formatted as a single value instead of preferring `targetTimeRange`.

### Enhancement: No way to save recipe without brewing
Recipe edits in RecipeAssembly only persist if you brew (via `linkRecipeToBrew`). Users should be able to save recipe changes explicitly without starting a brew.

## Root Cause Analysis

All bugs trace to gaps in the recipe data flow:

```
RecipeAssembly (edit) → [GAP: no flush on Brew This] → buildBrewRecord (snapshot)
                                                          ↓
linkRecipeToBrew → [GAP: only updates lastUsedAt] → recipe entity (stale)
                                                          ↓
BrewSuccess prompt → [BUG: savingRef undefined] → buttons broken
                                                          ↓
BrewForm (History edit) → [GAP: steps-only update] → recipe entity (partial)
```

## Approach: Targeted Fixes + Save Button

### Fix 1: BrewSuccess savingRef
Add a local `useRef(false)` inside `BrewSuccess`, or remove the `savingRef` guard entirely since `setForkDismissed(true)` already hides the prompt (preventing re-clicks).

### Fix 2: Flush edits on "Brew This"
Call `commitTargetTimeInputs()` (and any other pending edit flushers) in the "Brew This" handler before transitioning to the brew phase.

### Fix 3: BrewForm passes all RECIPE_FIELDS
Change `handleRecipeAction` to iterate RECIPE_FIELDS and include all changed fields in the update payload, not just steps.

### Fix 4: History target time display
Ensure History (BrewHistory.jsx) prefers `targetTimeRange` over `formatTime(targetTime)` when displaying target time, matching the pattern already used in ActiveBrew and RateThisBrew.

### Enhancement: Explicit "Save Recipe" in RecipeAssembly
Add a "Save Recipe" button/action in RecipeAssembly that calls `updateRecipe()` with the current form state, without requiring the user to start a brew. This also auto-increments the recipe version.

## Key Decisions

- **Remove savingRef from BrewSuccess** rather than passing it as prop — the dismiss state already prevents double-clicks
- **Auto-flush edits on "Brew This"** — user should never lose edits by pressing the primary action
- **BrewForm recipe update uses RECIPE_FIELDS** — same canonical field list, consistent with post-brew flow
- **Save Recipe button is additive** — doesn't change existing brew flow, just adds an option
- **linkRecipeToBrew write-back is NOT included** — the explicit Save button covers this need more clearly

## Open Questions

- Should "Save Recipe" in RecipeAssembly show a confirmation toast/indicator?
- Should the Save button be visible always or only when fields have changed vs. the stored recipe?

## Files Involved

- `src/components/BrewScreen.jsx` — BrewSuccess savingRef fix, edit flush, Save Recipe button
- `src/components/BrewForm.jsx` — handleRecipeAction passes all RECIPE_FIELDS
- `src/components/BrewHistory.jsx` — target time range display fix
