---
status: pending
priority: p3
issue_id: "086"
tags: [code-review, performance, react-patterns, recipe-entity]
dependencies: []
---

# Memoize beanRecipes with useMemo

## Problem Statement

The `beanRecipes` prop passed to RecipeAssembly is computed inline in JSX: `(recipes || []).filter(r => r.beanId === selectedBean.id)`. This creates a new array reference on every render, causing RecipeAssembly to receive new props even when recipes haven't changed.

## Findings

- BrewScreen.jsx ~line 1723: inline filter in JSX props
- New array reference on every render triggers unnecessary child re-renders
- Could be memoized with `useMemo` keyed on `[recipes, selectedBean?.id]`

## Proposed Solutions

### Option A: Extract to useMemo
```js
const beanRecipes = useMemo(() => {
  if (!selectedBean?.id) return []
  return (recipes || []).filter(r => r.beanId === selectedBean.id)
}, [recipes, selectedBean?.id])
```
- **Pros:** Stable reference, prevents unnecessary re-renders
- **Effort:** Small
