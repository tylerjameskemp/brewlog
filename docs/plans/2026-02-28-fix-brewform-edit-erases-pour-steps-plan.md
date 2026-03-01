---
title: "fix: BrewForm edit mode erases pour step data on save"
type: fix
date: 2026-02-28
---

# fix: BrewForm edit mode erases pour step data on save

## Overview

Editing a brew from BrewHistory routes to BrewForm (not BrewScreen). When the user edits any field (e.g. rating) and saves, the original pour step data (`steps` and `recipeSteps` arrays) is silently erased — even though the user never touched the steps UI.

## Problem Statement

**Two bugs in BrewForm.jsx's edit-save cycle erase step data:**

### Bug 1: `getActualSteps` returns `[]` for BrewScreen-created brews

BrewScreen saves actual timing data as `stepResults` (object keyed by step ID), not as a `steps` array. When BrewForm opens a BrewScreen-created brew for editing:

```
line 74: steps: editBrew ? getActualSteps(editBrew) : []
```

`getActualSteps` checks `brew.steps` (absent) → checks bloom fields (absent in new format) → returns `[]`. The original step execution data is invisible to BrewForm.

### Bug 2: Save fallback overwrites steps with recipeSteps

```
line 189: const resolvedSteps = form.steps.length > 0 ? form.steps : form.recipeSteps
```

When `form.steps` is `[]` (from Bug 1, or because the user didn't touch Phase 2 steps), save writes `steps: form.recipeSteps` — replacing whatever the brew originally had with a copy of the recipe plan.

### Bug 3: `...form` spread overwrites fields the form doesn't manage

```jsx
// line 193-200
updateBrew(editBrew.id, {
  ...form,           // includes steps: [], recipeSteps: form.recipeSteps
  recipeSteps: form.recipeSteps,
  steps: resolvedSteps,
})
```

The `...form` spread sends every form field to `updateBrew`'s shallow merge. While `recipeSteps` and `steps` are explicitly overridden after the spread, this pattern is fragile — any new form field added in the future could silently overwrite original brew data.

### Data flow trace (the bug in action)

```
1. User clicks "Edit" on a brew with 3 pour steps
2. BrewHistory passes full brew object → App → BrewForm (editBrew prop)
3. Form init: form.recipeSteps = getRecipeSteps(editBrew)  → [step1, step2, step3] ✓
4. Form init: form.steps = getActualSteps(editBrew)         → [] (if no `steps` array)
5. User changes only the rating (never touches steps UI)
6. Save: resolvedSteps = form.steps.length > 0 ? form.steps : form.recipeSteps
         = [step1, step2, step3] (recipe copy, not original actuals)
7. updateBrew writes: steps = recipeSteps copy, original step data lost
```

## Proposed Solution

**Principle: Don't overwrite what you didn't touch.**

In edit mode, carry forward the original `editBrew` step data unless the user actively modified steps through the form.

### Change 1: Preserve original step data on initialization (line 72-74)

Store the original editBrew step arrays separately so the save handler can detect "user didn't modify":

```jsx
// src/components/BrewForm.jsx — inside the component, before useState
const originalSteps = editBrew?.steps
const originalRecipeSteps = editBrew?.recipeSteps
```

No changes to the form state initialization — `form.recipeSteps` and `form.steps` continue to initialize as they do now. The originals are just reference snapshots.

### Change 2: Track whether user modified steps

Add a ref to track if the user interacted with step editors:

```jsx
const stepsModifiedRef = useRef(false)
const recipeStepsModifiedRef = useRef(false)
```

Wire the step `onChange` handlers to set these flags:

```jsx
// Recipe steps onChange (line 455)
onChange={(steps) => {
  recipeStepsModifiedRef.current = true
  update('recipeSteps', steps)
}}

// Brew steps onChange (line 494)
onChange={(steps) => {
  stepsModifiedRef.current = true
  update('steps', steps)
}}
```

### Change 3: Fix save handler to preserve unmodified steps (line 188-199)

In `handleSave`, when editing, only use form step data if the user actually modified it. Otherwise, carry forward the original:

```jsx
// Resolve steps for edit mode: preserve originals unless user modified
let finalRecipeSteps = form.recipeSteps
let finalSteps

if (isEditing) {
  // If user didn't touch recipe steps, keep whatever editBrew originally had
  if (!recipeStepsModifiedRef.current && editBrew.recipeSteps) {
    finalRecipeSteps = editBrew.recipeSteps
  }

  // If user didn't touch brew steps, keep whatever editBrew originally had
  if (!stepsModifiedRef.current) {
    finalSteps = editBrew.steps ?? editBrew.recipeSteps ?? []
  } else {
    finalSteps = form.steps.length > 0 ? form.steps : finalRecipeSteps
  }
} else {
  // New brew: existing fallback logic
  finalSteps = form.steps.length > 0 ? form.steps : form.recipeSteps
}
```

Then in the `updateBrew` call:

```jsx
const updatedBrews = updateBrew(editBrew.id, {
  ...form,
  beanName: trimmedName,
  targetTime: form.targetTime || undefined,
  totalTime: form.totalTime || form.targetTime || undefined,
  recipeSteps: finalRecipeSteps,
  steps: finalSteps,
})
```

### Why refs instead of state?

- Refs don't cause re-renders (state would re-render the entire form on first step edit)
- They're a boolean flag, not displayed anywhere — no UI reads them
- Follows the project's existing pattern (`savingRef` on line 79)

## Acceptance Criteria

- [x] Edit a brew with 3 pour steps. Change only the rating. Save. All 3 steps preserved in history.
- [x] Edit a BrewScreen-created brew (has `recipeSteps` + `stepResults`, no `steps`). Change notes. Save. `recipeSteps` and `stepResults` both preserved, no spurious `steps` array added.
- [x] Edit a brew with both `recipeSteps` and `steps`. Modify one step in Phase 2 Brew section. Save. Modified steps saved, `recipeSteps` unchanged.
- [x] Edit a brew with no steps at all. Add recipe steps. Save. New steps saved correctly.
- [x] Create a new brew (not editing). Existing behavior unchanged — fallback from steps to recipeSteps still works.

## Files

| File | Lines | Change |
|------|-------|--------|
| `src/components/BrewForm.jsx` | 19, 72-74 | Add `originalSteps`/`originalRecipeSteps` refs |
| `src/components/BrewForm.jsx` | 79 | Add `stepsModifiedRef`, `recipeStepsModifiedRef` |
| `src/components/BrewForm.jsx` | 188-199 | Rewrite step resolution logic with modification guards |
| `src/components/BrewForm.jsx` | 455, 494 | Wire onChange handlers to set modification flags |

## References

- Related learning: `docs/solutions/logic-errors/dual-field-names-for-same-data-cause-silent-loss.md`
- Related learning: `docs/solutions/logic-errors/new-code-path-drops-side-effects.md`
- Related learning: `docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md`
- Brainstorm: `docs/brainstorms/2026-02-25-brew-step-tracking-brainstorm.md`
