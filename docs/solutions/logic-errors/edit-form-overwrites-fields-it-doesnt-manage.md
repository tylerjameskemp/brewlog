---
title: "Edit form overwrites fields it doesn't manage via spread operator"
category: logic-errors
tags: [edit-mode, data-preservation, spread-operator, brewform, steps]
module: BrewForm
symptoms:
  - "Editing a brew and saving erases data user didn't touch"
  - "Pour step data disappears after editing rating or notes"
  - "Form spread operator overwrites original brew fields with initialized defaults"
  - "Legacy data silently upgraded when editing unrelated fields"
date: 2026-02-28
severity: P1
---

# Edit form overwrites fields it doesn't manage via spread operator

## Problem

When an edit form initializes state from a saved record using helper functions (e.g., `getRecipeSteps(editBrew)`), the initialized values may differ from what was stored. On save, spreading `...form` into the update overwrites the original data with the transformed version — even if the user never touched those fields.

### Concrete example

BrewForm initializes `form.steps` via `getActualSteps(editBrew)`. For BrewScreen-created brews (which store step timing in `stepResults`, not `steps`), this returns `[]`. On save, the empty array overwrites whatever the brew originally had.

### Why this is subtle

The form state looks correct during the edit session — the UI displays the right data via fallback rendering (`form.steps.length > 0 ? form.steps : form.recipeSteps`). The problem only manifests on save, when the form's internal representation diverges from the stored data.

## Root cause

Two independent issues compound:

1. **Form init transforms data**: Helper functions synthesize, normalize, or fall back, producing values that differ from what was stored.
2. **Save path spreads entire form**: `updateBrew(id, { ...form, ...overrides })` sends every form field to the storage layer, overwriting original fields the user never intended to change.

## Fix

Track whether the user actually modified specific fields using refs. On save, carry forward original data for unmodified fields:

```jsx
const stepsModifiedRef = useRef(false)
const recipeStepsModifiedRef = useRef(false)

// In onChange handlers:
onChange={(steps) => { stepsModifiedRef.current = true; update('steps', steps) }}

// In handleSave:
if (isEditing) {
  if (!recipeStepsModifiedRef.current) {
    finalRecipeSteps = editBrew.recipeSteps  // preserve original, including undefined
  }
  if (!stepsModifiedRef.current) {
    finalSteps = editBrew.steps ?? editBrew.recipeSteps ?? []
  }
}
```

## Rules

1. **Don't overwrite what you didn't touch.** If the user didn't modify a field, the saved value must be identical to what was loaded — including `undefined`.
2. **Don't guard on truthiness when preserving originals.** `if (!modified && editBrew.field)` silently converts `undefined` originals to synthesized values. Drop the truthiness guard: `if (!modified) { final = editBrew.field }`.
3. **Use refs, not state, for modification tracking.** Refs are synchronous, don't cause re-renders, and avoid stale closure issues. Follow the existing `savingRef` pattern.
4. **Consider explicit field enumeration** in the edit save path instead of `...form` spread, to make the update contract explicit and prevent future regressions.

## Audit checklist for edit forms

- [ ] List every field the form initializes from the edited record
- [ ] For each: does the initializer transform the data? (normalize, synthesize, fallback)
- [ ] If yes: does the save path write back the transformed version or the original?
- [ ] Does `...form` spread include fields the form doesn't render UI for?
- [ ] Are there fields on the original record that don't exist in form state? (They survive the merge, but verify.)
