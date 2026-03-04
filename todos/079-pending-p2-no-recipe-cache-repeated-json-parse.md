---
status: pending
priority: p2
issue_id: "079"
tags: [code-review, performance, recipe-entity]
dependencies: []
---

# No Recipe Cache — Repeated JSON.parse on Every Read

## Problem Statement

`_getAllRecipes()` re-parses the full localStorage JSON on every call. Unlike `getBrews()` which has module-level `_brewsCache`/`_brewsCacheRaw`, recipes have no caching. During a single brew flow, `_getAllRecipes()` is called 4-6 times (bean select, recipe picker, save, state sync).

## Findings

- storage.js ~line 202: `_getAllRecipes()` does `JSON.parse(localStorage.getItem(...))` every time
- `getBrews()` at line 45-56 has `_brewsCache`/`_brewsCacheRaw` pattern that avoids re-parsing
- Recipe reads during brew flow: `buildRecipeFromEntity`, `linkRecipeToBrew` -> `setRecipes(getRecipes())`, `onSaveToRecipe` -> `setRecipes(getRecipes())`
- At 100+ recipes (~200KB JSON), parsing 4-6 times adds 60-120ms of synchronous main-thread work

## Proposed Solutions

### Option A: Add _recipesCache/_recipesCacheRaw (recommended)
Mirror the brew caching pattern. Add module-level cache variables, return shallow copies, invalidate on writes.
- **Pros:** Matches existing pattern, eliminates redundant parses
- **Cons:** Must call `_invalidateRecipesCache()` in all write paths
- **Effort:** Medium (follow brew pattern exactly)
