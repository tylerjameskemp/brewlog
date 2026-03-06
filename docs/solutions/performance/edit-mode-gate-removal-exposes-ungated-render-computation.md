---
title: "Removing an edit-mode gate exposes ungated per-render computation"
category: performance
tags: [useMemo, render-performance, edit-mode, JSON-stringify, IIFE, recipe-diff, gating]
module: BrewScreen.jsx
symptoms:
  - "JSON.stringify runs on every render after removing an edit/done toggle"
  - "IIFE in JSX performs expensive computation that was previously gated by a mode check"
  - "Recipe diff detection runs on every keystroke instead of only when relevant state changes"
date: 2026-03-06
---

# Removing an edit-mode gate exposes ungated per-render computation

## Problem

`RecipeSaveChoice` shows a "Save changes to recipe" prompt when the current recipe state differs from the loaded recipe entity. The diff detection iterated `RECIPE_FIELDS` and called `JSON.stringify` on step arrays — implemented as an IIFE in JSX:

```jsx
{selectedRecipeId && onSaveToRecipe && (() => {
  const loaded = beanRecipes.find(r => r.id === selectedRecipeId)
  if (!loaded) return null
  const differs = RECIPE_FIELDS.some(f => {
    if (f === 'steps') return JSON.stringify(recipe[f]) !== JSON.stringify(loaded[f] || [])
    return recipe[f] !== loaded[f]
  })
  if (!differs) return null
  return <RecipeSaveChoice ... />
})()}
```

Before the Phase 1 refactor, this IIFE lived inside an `editing && ...` branch — the Edit/Done toggle inadvertently gated its execution. When the toggle was removed (fields always editable), the diff computation started running on **every render**, including every keystroke in any recipe field.

## Root Cause

A UI mode toggle (`editing`) was inadvertently acting as a computation gate. Removing the toggle as a UX improvement also removed the gating side effect. The IIFE pattern makes this invisible — it reads like a conditional render but executes arbitrary JS on every render pass.

## Solution

Extract the diff computation into `useMemo` with the correct dependency array:

```jsx
const recipeDiff = useMemo(() => {
  if (!selectedRecipeId) return null
  const loaded = beanRecipes.find(r => r.id === selectedRecipeId)
  if (!loaded) return null
  const differs = RECIPE_FIELDS.some(f => {
    if (f === 'steps') return JSON.stringify(recipe[f]) !== JSON.stringify(loaded[f] || [])
    return recipe[f] !== loaded[f]
  })
  return differs ? { name: loaded.name } : null
}, [selectedRecipeId, beanRecipes, recipe])

// In JSX — simple conditional, no computation
{recipeDiff && onSaveToRecipe && (
  <div className="px-4 mt-3">
    <RecipeSaveChoice recipeName={recipeDiff.name} ... />
  </div>
)}
```

The `recipeDiff` object carries only what the render needs (`name`), not the full entity.

## Prevention

- **Audit IIFEs in JSX:** If an IIFE body contains `JSON.stringify`, `.some()`, `.reduce()`, or any iteration, it should be a `useMemo`. IIFEs are fine for cheap conditional rendering (null checks, ternaries), not for computation.
- **When removing mode gates:** Check what else the gate was protecting. Search for any render-path computation that lived inside the gated branch and ensure it has its own memoization.
- **Rule of thumb:** If removing a `useState` boolean causes a performance regression, the boolean was doing double duty as a computation gate. Memoize the computation independently.

## Related

- `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md` — related render-performance pattern
- `docs/solutions/react-patterns/primary-action-must-flush-pending-edits.md` — the `commitTargetTimeInputs` pattern used in save handlers
