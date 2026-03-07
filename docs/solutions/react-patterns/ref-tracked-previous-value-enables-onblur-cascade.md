---
title: Ref-Tracked Previous Value Enables onBlur Cascade Prompts
category: react-patterns
module: BrewScreen, RecipeAssembly
tags: [useRef, onBlur, cascade-prompt, state-sync, water-scaling]
symptoms:
  - Scaling prompt shows wrong "changed from" value after recipe switch
  - Stale ref comparison triggers false positive cascade prompt
  - Previous value tracker not synced when source entity changes
date: 2026-03-06
---

# Ref-Tracked Previous Value Enables onBlur Cascade Prompts

## Problem

When a field change should trigger a cascade prompt (e.g., "Water changed — scale pour steps?"), you need to compare the new value against the previous committed value. Using `useState` for the previous value causes an unnecessary render on every blur. Using `useRef` avoids re-renders but introduces a sync hazard: the ref must be updated when the source entity changes (e.g., recipe switch), not just on user edits.

## Symptom

User has Recipe A (250g water), switches to Recipe B (300g water) via recipe picker, then edits water to 310g. The scaling prompt shows "changed from 250g → 310g" instead of the correct "300g → 310g" because `prevWaterRef.current` still holds Recipe A's value.

## Root Cause

`useRef(recipe.waterGrams)` initializes on mount but does not automatically track prop changes. When the recipe entity changes (via `onRecipeSelect`), the ref retains the stale value from the previous recipe. This is an instance of the "lazy init state goes stale on prop change" pattern applied to refs.

## Solution

Use a `useEffect` keyed on the recipe entity identity (not the field value) to sync the ref:

```jsx
const prevWaterRef = useRef(recipe.waterGrams)
const scalingOldWaterRef = useRef(null)

// Sync ref when recipe entity changes (not on user typing)
useEffect(() => {
  prevWaterRef.current = recipe.waterGrams
  setShowScaleBanner(false) // dismiss stale banner
}, [selectedRecipeId]) // keyed on entity ID, not field value

const handleWaterBlur = () => {
  const newWater = recipe.waterGrams
  const oldWater = prevWaterRef.current
  if (newWater > 0 && oldWater > 0 && newWater !== oldWater &&
      recipe.steps.some(s => s.waterTo != null)) {
    scalingOldWaterRef.current = oldWater
    setShowScaleBanner(true)
  }
  prevWaterRef.current = newWater
}
```

Key details:
- **`useEffect` dep is `selectedRecipeId`** — changes when user picks a different recipe, does NOT fire on user field edits
- **Two separate refs** — `prevWaterRef` tracks "last committed value" (updates on every blur), `scalingOldWaterRef` captures the specific value that triggered the current banner (may persist across multiple renders while banner is shown)
- **Null `scalingOldWaterRef.current` on dismiss** — defensive cleanup prevents stale values from leaking

## Lesson

When using `useRef` to track a "previous value" for comparison-on-action patterns, always add a sync mechanism for cases where the source entity changes independently of user edits. Key the sync on entity identity (ID), not on the field value itself, to avoid defeating the comparison logic.
