---
status: pending
priority: p2
issue_id: "082"
tags: [code-review, react-patterns, recipe-entity]
dependencies: []
---

# setState Called Inside Lazy Initializer

## Problem Statement

In BrewScreen.jsx, the `recipe` state lazy initializer calls `setSelectedRecipeId(recipeId)` — a setter from a different useState call. While React batches this correctly during initial render, it couples the initialization order of two independent state variables and is fragile to declaration reordering.

## Findings

- BrewScreen.jsx ~line 1457-1461: `const [recipe, setRecipe] = useState(() => { ... if (recipeId) setSelectedRecipeId(recipeId); return r })`
- `selectedRecipeId` must be declared before `recipe` for this to work
- Pattern is not used anywhere else in the codebase

## Proposed Solutions

### Option A: Initialize selectedRecipeId with its own lazy initializer
```js
const [selectedRecipeId, setSelectedRecipeId] = useState(() => {
  if (!selectedBean?.id) return null
  const beanRecipes = (recipes || []).filter(r => r.beanId === selectedBean.id)
  if (beanRecipes.length === 0) return null
  return [...beanRecipes].sort((a, b) => (b?.lastUsedAt || '').localeCompare(a?.lastUsedAt || ''))[0]?.id || null
})
```
- **Pros:** No cross-setter calls, explicit initialization
- **Cons:** Duplicates recipe selection logic from buildRecipeFromEntity
- **Effort:** Small

### Option B: Use a combined initializer function
Compute both values in one call, return them separately:
```js
const [recipeInit] = useState(() => buildRecipeFromEntity(selectedBean?.id))
const [recipe, setRecipe] = useState(() => recipeInit.recipe)
const [selectedRecipeId, setSelectedRecipeId] = useState(() => recipeInit.recipeId)
```
- **Pros:** Clean, no cross-setter, reuses existing function
- **Cons:** Extra useState call
- **Effort:** Small
