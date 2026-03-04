---
status: pending
priority: p3
issue_id: "085"
tags: [code-review, dead-code, recipe-entity]
dependencies: []
---

# Remove 3 Unused Recipe Function Exports

## Problem Statement

Three Recipe functions are exported from storage.js but never called anywhere: `getRecipesForBean`, `getRecipeForBeanAndMethod`, and `archiveRecipe`. These are speculative API surface that adds maintenance weight without current utility.

## Findings

- `getRecipesForBean(beanId)`: consumers filter `recipes` inline instead (BrewScreen ~line 1426, 1723)
- `getRecipeForBeanAndMethod(beanId, method)`: no consumer exists
- `archiveRecipe(id)`: only bulk archival via `archiveRecipesForBean` is used (on bean deletion)
- All 3 are trivially re-creatable if needed later

## Proposed Solutions

### Option A: Remove all 3 functions
Delete the functions and their exports. ~20 lines removed.
- **Pros:** Cleaner API surface, no dead code
- **Effort:** Small
