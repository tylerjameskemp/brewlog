---
title: "Reset handler must clear all related state"
category: react-patterns
tags: [useState, reset, stale-state, useCallback]
module: BrewScreen
symptoms:
  - "Previous brew's data appears when starting a new brew"
  - "State from prior flow leaks into new flow"
created: 2026-03-01
---

# Reset handler must clear all related state

## Problem

`handleStartNewBrew` in `BrewScreen.jsx` is responsible for resetting the brew flow so the user can start fresh. It cleared `selectedBean`, `brewData`, `savedBrewState`, and set `phase` back to `'pick'` — but it did not reset `recipe`. As a result, the previous brew's recipe (coffee grams, water grams, grind setting, target time range, pour steps, etc.) persisted in state across the reset boundary.

## Symptoms

- Picking a different bean after finishing a brew and entering RecipeAssembly shows values from the previous brew instead of defaults or the new bean's last-brew values.
- Fields like `coffeeGrams`, `waterGrams`, `grindSetting`, and pour steps appear pre-filled with stale data that does not belong to the newly selected bean.
- State from a prior flow leaks into an unrelated new flow.

## Root Cause

`recipe` was added to `BrewScreen` later in development, after `handleStartNewBrew` was already written. The reset handler was never updated to include it. This is a common incremental-development hazard: each new piece of state added to a component increases the surface area that reset handlers must cover, but there is no compiler or lint enforcement to catch the omission.

The more state a component accumulates, the higher the risk that a reset handler becomes stale relative to the current set of variables it should clear.

## Solution

Add `setRecipe(buildRecipeFromBean(null))` to `handleStartNewBrew`. `buildRecipeFromBean(null)` returns a clean default recipe with no bean-specific values, which is the correct initial state before a bean is selected.

Also add `buildRecipeFromBean` to the `useCallback` dependency array since it is now used inside the callback.

## Code Examples

**Before:**

```javascript
const handleStartNewBrew = useCallback(() => {
  setSelectedBean(null)
  setBrewData(null)
  setSavedBrewState(null)
  setPhase('pick')
}, [])
```

**After:**

```javascript
const handleStartNewBrew = useCallback(() => {
  setSelectedBean(null)
  setBrewData(null)
  setSavedBrewState(null)
  setRecipe(buildRecipeFromBean(null))
  setPhase('pick')
}, [buildRecipeFromBean])
```

## Prevention

1. **When adding new state to a component, immediately search for all reset and clear handlers and update them.** Grep for an existing `set*Null` or `set*(null)` pattern to locate reset logic:

   ```
   grep -n "setSelectedBean(null)" src/components/BrewScreen.jsx
   ```

2. **Use the reset handler as a checklist.** Every stateful variable that participates in a flow should appear in the handler that tears down that flow. If a variable does not appear, ask whether it intentionally survives the reset or was simply forgotten.

3. **Consider `useReducer` when a component reaches 4+ related state variables that must be reset together.** A single `dispatch({ type: 'RESET' })` that returns the full initial state object is harder to break incrementally than four separate `setState` calls spread across a callback.

4. **Write a test or manual checklist step** that verifies the "start new brew after completing one" path produces clean initial state for every field.

## Related

- `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md` — related pattern around phase transitions and state consistency
- `docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md` — stale state surfacing from restore paths
