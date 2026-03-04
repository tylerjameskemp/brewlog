---
title: "feat: Recipe Phase 2 — Visible Recipes"
type: feat
date: 2026-03-04
---

# feat: Recipe Phase 2 — Visible Recipes

## Overview

Make the Recipe entity visible and useful to the user. The MVP (PR #29) laid the storage foundation — this phase adds the UI: post-brew fork prompt, recipe management in BeanLibrary, Update vs Save-as-New choice, and recipe-level notes.

## Problem Statement / Motivation

After the Recipe Entity MVP, recipes exist in storage but are barely visible. The recipe picker only appears when a bean has 2+ recipes, and there's no way to view, rename, delete, or annotate recipes outside the brew flow. Users don't feel the recipe feature exists.

## Key Decisions (from brainstorm)

1. Post-brew fork prompt lives on the success screen, not in the rate flow
2. BeanLibrary gets recipe list with rename/delete, but not a full recipe editor
3. "Update vs Save-as-New" appears in two places: RecipeAssembly (pre-brew) and success screen (post-brew)
4. Recipe notes are a simple text field on the entity, NOT part of `RECIPE_FIELDS`
5. `notes` is excluded from `RECIPE_FIELDS` — it's not a brew parameter

## Design Decisions (from spec-flow analysis)

| Question | Decision |
|----------|----------|
| Which brew values for fork diff? | Post-rating values (after grind/time corrections in RateThisBrew) |
| Fork prompt on auto-created recipe? | No — skip for recipes created during THIS brew session |
| Recipe deleted mid-brew? | Skip fork prompt if recipe lookup returns null |
| Save-as-New naming? | `"{MethodName} (copy)"`, append number if duplicate exists |
| Diff sensitivity? | All RECIPE_FIELDS (consistent with existing RecipeAssembly diff) |
| BeanLibrary 0 recipes? | Omit recipe section entirely |
| Last recipe deleted, next brew? | Equipment defaults (warn in delete confirmation) |
| Choice UI pattern? | Inline card with side-by-side buttons (like bean delete confirmation) |
| Recipe notes placement? | Below recipe badge in RecipeAssembly, collapsible |
| Notes during ActiveBrew? | No — keep focused timer experience |
| Notes max length? | 500 characters |
| Fork prompt dismissal? | Require explicit choice (3 buttons), no tap-outside dismiss |
| Save-as-New updates brew? | Yes — `updateBrew(brewId, { recipeId: newRecipeId })` |
| Crash during fork prompt? | Acceptable loss — brew saved, recipe not updated, user can edit later |

## Technical Approach

### Implementation Phases

#### Phase 1: Prop Threading & Component Extraction

Thread recipe state into components that need it, and extract the success screen.

- [x] **App.jsx**: Add `recipes` and `setRecipes` props to BeanLibrary
- [x] **BrewScreen.jsx**: Extract success screen into `BrewSuccess` inline sub-component
  - Props: `brew` (final post-rating brew record), `selectedRecipeId`, `recipes`, `onUpdateRecipe`, `onSaveAsNewRecipe`, `onStartNewBrew`, `onViewHistory`, `recipeWasAutoCreated` (boolean)
  - Compute diff inside `BrewSuccess` using `RECIPE_FIELDS`
- [x] **RateThisBrew**: Pass final brew state to parent on `handleDone` — the `onComplete` callback should include the updated brew record so the success screen has post-correction values

**Files:** `src/App.jsx`, `src/components/BrewScreen.jsx`

#### Phase 2: Post-Brew Fork Prompt

Add the conditional recipe update prompt to the `BrewSuccess` component.

- [x] Compute diff: compare final brew fields against recipe entity using `RECIPE_FIELDS.some(...)` (same pattern as RecipeAssembly line 781)
- [x] Guard: skip if `!selectedRecipeId` OR `recipeWasAutoCreated` OR recipe entity not found
- [x] Render fork card when diff detected:
  - Summary: "Your settings differed from {recipeName}"
  - Changed fields listed (e.g., "Grind: 18 → 16, Water: 250g → 240g")
  - Three buttons: "Update Recipe" / "Save as New" / "Keep Original"
- [x] "Update Recipe" handler: `updateRecipe(selectedRecipeId, formStateToRecipeFields(brewFields))` → check return → `setRecipes(getRecipes())`
- [x] "Save as New" handler: `saveRecipe({...fields, beanId, name: generateCopyName(recipeName, beanRecipes)})` → if success, `updateBrew(brewId, { recipeId: newRecipe.id })` → `setRecipes(getRecipes())`
- [x] "Keep Original" handler: dismiss prompt, show standard success
- [x] Track `recipeWasAutoCreated` flag in BrewScreen — set `true` when `linkRecipeToBrew` creates a new recipe (vs updates existing)

**Files:** `src/components/BrewScreen.jsx`

#### Phase 3: Recipe Management in BeanLibrary

Add recipe list to expanded bean cards.

- [x] **Recipe section**: Render below action buttons, above brew list, only when `recipesForBean.length > 0`
- [x] **Recipe card**: Show name, method icon/label, `coffeeGrams/waterGrams`, `grindSetting`
- [x] **Inline rename**: Tap recipe name → input field → buffer in local state → persist on blur via `updateRecipe(id, { name })` → `setRecipes(getRecipes())`
  - Validation: trim, reject empty (revert to original)
- [x] **Delete**: Trash icon → confirmation card ("Delete this recipe? Your brew history won't be affected.") → `archiveRecipe(id)` → `setRecipes(getRecipes())`
  - Last recipe warning: "This is the only recipe for this bean. Your next brew will start with default settings."
- [x] **Recipe notes display**: If `recipe.notes` exists, show below settings summary (truncated to 2 lines with "show more")
- [x] **Recipe notes edit**: Tap notes area → textarea (max 500 chars) → buffer in local state → persist on blur → `updateRecipe(id, { notes })`
  - Empty notes: show small "Add note" link
- [x] Use `savingRef` guard on all write operations

**Files:** `src/components/BeanLibrary.jsx`, `src/App.jsx` (prop threading)

#### Phase 4: Update vs Save-as-New in RecipeAssembly

Replace the current single "Save changes to recipe" button with a choice.

- [x] When diff detected and button tapped, show inline choice card (same pattern as bean delete confirmation):
  - "Update {recipeName}" button (primary)
  - "Save as New Recipe" button (secondary)
  - Small "Cancel" link
- [x] "Update" handler: existing `onSaveToRecipe` behavior (unchanged)
- [x] "Save as New" handler: `onSaveAsNewRecipe` callback from parent
  - Creates recipe: `saveRecipe({...formStateToRecipeFields(recipe), beanId, name: generateCopyName(...)})`
  - Sets new recipe as selected: `setSelectedRecipeId(newRecipe.id)`
  - Refreshes state: `setRecipes(getRecipes())`
- [x] Recipe picker should reflect new recipe immediately after save

**Files:** `src/components/BrewScreen.jsx`

#### Phase 5: Recipe-Level Notes (Storage + RecipeAssembly)

Add `notes` field to recipe entity and display in RecipeAssembly.

- [x] **Storage**: No migration needed — existing recipes get `notes: undefined`, handled by conditional render
- [x] **RecipeAssembly display**: Below recipe indicator badge, above "Changes from last brew"
  - Collapsible, subtle styling (distinct from amber `nextBrewChanges` section)
  - Only render when `recipe.notes` is truthy
  - Read-only in RecipeAssembly (editing is in BeanLibrary)
- [x] **CLAUDE.md**: Document that `notes` is NOT in `RECIPE_FIELDS` — it's metadata, not a brew parameter

**Files:** `src/components/BrewScreen.jsx`, `src/data/storage.js` (no RECIPE_FIELDS change), `CLAUDE.md`

#### Phase 6: Build Verification & Testing

- [x] `npm run build` passes
- [x] `npm test` passes
- [x] Manual test: brew with existing recipe, modify grind → fork prompt appears → "Update" works
- [x] Manual test: fork prompt → "Save as New" → new recipe appears in picker
- [x] Manual test: fork prompt → "Keep Original" → recipe unchanged
- [x] Manual test: BeanLibrary → expand bean → see recipes → rename → delete
- [x] Manual test: RecipeAssembly → modify recipe → "Save changes" → Update vs Save-as-New choice
- [x] Manual test: add/edit recipe notes in BeanLibrary → see in RecipeAssembly

### Helper Function

```js
// src/data/storage.js
export function generateRecipeCopyName(originalName, existingRecipes) {
  const copyBase = `${originalName} (copy)`
  if (!existingRecipes.some(r => r.name === copyBase)) return copyBase
  let i = 2
  while (existingRecipes.some(r => r.name === `${originalName} (copy ${i})`)) i++
  return `${originalName} (copy ${i})`
}
```

## Gotchas from Institutional Learnings

1. **Terminal state must be a formal phase** — The fork prompt renders inside the existing `success` phase, not as a new phase. It's a conditional card within `BrewSuccess`, not a state machine transition. This avoids the dual-state problem documented in `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`.

2. **Per-keystroke writes** — BeanLibrary recipe editing (name, notes) MUST buffer in local state and persist on blur/action. Never call `updateRecipe` in onChange. See `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`.

3. **Entity-form field mapping** — The existing `RECIPE_FIELDS`, `recipeEntityToFormState`, `formStateToRecipeFields` helpers cover the brew parameter fields. `notes` is intentionally excluded — it's read/written directly via `updateRecipe(id, { notes })`.

4. **Edit form field preservation** — BeanLibrary recipe inline editing should track modified fields with refs, not spread the entire form. See `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`.

5. **Double-save guards** — All recipe write handlers (fork prompt buttons, BeanLibrary save/delete, RecipeAssembly save-as-new) need `savingRef` protection.

6. **UI state must not leak to persistence** — Edit mode, expanded/collapsed, selection state belong in component state, NOT on the recipe object.

## Acceptance Criteria

### Functional

- [x] Post-brew success shows fork prompt when brew settings differ from source recipe
- [x] Fork prompt offers Update / Save as New / Keep Original
- [x] Fork prompt does NOT appear for auto-created recipes or when no recipe linked
- [x] BeanLibrary expanded cards show recipe list (when recipes exist)
- [x] Recipes can be renamed inline in BeanLibrary
- [x] Recipes can be deleted (soft-delete) with confirmation in BeanLibrary
- [x] RecipeAssembly "Save changes" offers Update vs Save-as-New choice
- [x] Save-as-New creates a new recipe and selects it
- [x] Recipe notes editable in BeanLibrary, visible (read-only) in RecipeAssembly
- [x] All recipe writes check return values and use savingRef guards

### Non-Functional

- [x] No per-keystroke storage writes (buffer + persist on blur)
- [x] `npm run build` passes
- [x] `npm test` passes (74/74+)

## Dependencies & Risks

- **Depends on:** Recipe Entity MVP (PR #29, merged)
- **Risk:** BrewScreen.jsx is already ~1,700 lines. Extracting `BrewSuccess` and adding fork prompt logic adds ~100-150 lines. The file is getting large but the extraction helps.
- **Risk:** BeanLibrary gains recipe management responsibility. Keep it simple (list + rename + delete + notes), don't build a full recipe editor.

## References

- Brainstorm: `docs/brainstorms/2026-03-04-recipe-phase-2-brainstorm.md`
- MVP brainstorm: `docs/brainstorms/2026-03-03-recipe-entity-brainstorm.md`
- MVP PR: #29
- Terminal state pattern: `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`
- Field mapping pattern: `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md`
- Per-keystroke pattern: `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`
- Edit preservation pattern: `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`
