---
status: complete
priority: p1
issue_id: "075"
tags: [code-review, data-integrity, recipe-entity]
dependencies: []
---

# Recipe Write Functions Ignore safeSetItem Return Value

## Problem Statement

`saveRecipe`, `updateRecipe`, and `archiveRecipesForBean` in `storage.js` call `safeSetItem` but never check its return value. If localStorage quota is exceeded, the write silently fails but the function returns as if it succeeded. This can create phantom recipes and dangling `recipeId` references on brew records.

The existing brew CRUD functions (`saveBrew`, `updateBrew`, `deleteBrew`) all check `if (!safeSetItem(...))` and return the pre-failure state. Recipe functions should follow the same pattern.

## Findings

- `saveRecipe` (storage.js ~line 248): returns `newRecipe` even if write failed
- `updateRecipe` (storage.js ~line 260): returns mutated object even if write failed
- `archiveRecipesForBean` (storage.js ~line 280): returns nothing, doesn't indicate failure
- `linkRecipeToBrew` in BrewScreen.jsx stamps phantom `recipeId` on brew if `saveRecipe` silently fails
- Brew CRUD functions have proper guards; recipes do not — asymmetric safety

## Proposed Solutions

### Option A: Check safeSetItem return in all recipe write functions
Return `null` from `saveRecipe`/`updateRecipe` on failure. Have `archiveRecipesForBean` return a boolean. Callers check for `null` before using the result.
- **Pros:** Matches brew CRUD pattern, prevents dangling references
- **Cons:** Callers need to handle null (minor)
- **Effort:** Small (3-5 lines per function)

### Option B: Re-read from storage on failure (brew pattern)
On write failure, return `getRecipes()` (the pre-failure state) instead of the in-memory object.
- **Pros:** Exactly matches `saveBrew` defensive pattern
- **Cons:** Returns different type than success case (array vs object)
- **Effort:** Small
