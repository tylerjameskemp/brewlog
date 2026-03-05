---
title: "Primary action must flush all pending edit state"
category: react-patterns
module: BrewScreen, BrewForm
tags: [flush, edit-mode, pending-state, primary-action, onBlur, commit]
severity: P1
symptoms:
  - "User edits a field, clicks primary action, but old value is used"
  - "Edit mode input value visible on screen but not committed to React state"
  - "Brew proceeds with stale target time despite user having typed a new one"
date_fixed: 2026-03-05
related:
  - paired-input-blur-race-causes-value-flicker.md
  - timer-stop-must-flush-pause-gap.md
---

# Primary action must flush all pending edit state

## Problem

A user edited the target time in RecipeAssembly's edit mode, then tapped "Brew This" without first tapping "Done" to exit edit mode. The brew proceeded with the old target time, even though the new value was visible in the input field.

**Symptoms:** User types "4:00-5:00" in target time → taps "Brew This" → brew teleprompter shows old target time (e.g. "3:00").

## Root Cause

The target time input used a local state (`targetTimeInput`) for the display value, with a `commitTargetTimeInputs()` function that parsed and wrote the values into the `recipe` state object. This commit function was only called:

1. On `onBlur` of the input field
2. When the user tapped "Done" to exit edit mode

Tapping "Brew This" triggered `onStartBrew()` directly, bypassing both paths. The input's display value was correct, but `recipe.targetTime` still held the previous value.

```
User types "4:00-5:00" in input
  → targetTimeInput = "4:00-5:00"  (local display state ✓)
  → recipe.targetTime = 180        (still old value ✗)

User taps "Brew This"
  → onStartBrew() → phase = 'brew'
  → buildBrewRecord reads recipe.targetTime → gets 180 (stale!)
```

## The Pattern

**Every primary action button must flush all pending edit state before proceeding.** If a component has edit mode with deferred commits (blur-based, "Done"-based), the primary action that exits or advances the workflow must call the same commit functions.

This is the event handler equivalent of "timer stop must flush pause gap" — any function that ends the editing lifecycle must flush uncommitted input.

## Fix

1. Made `commitTargetTimeInputs()` return the computed values (for synchronous use):

```jsx
const commitTargetTimeInputs = () => {
  const range = parseTimeRange(targetTimeInput)
  if (!range) return null
  const timeFields = {
    targetTime: Math.round((range.min + range.max) / 2),
    targetTimeMin: range.min,
    targetTimeMax: range.max,
    targetTimeRange: formatTimeRange(range.min, range.max),
  }
  setRecipe(prev => ({ ...prev, ...timeFields }))
  return timeFields
}
```

2. Created a `flushPendingEdits()` function that aggregates all pending flushes:

```jsx
const flushPendingEdits = () => {
  const timeOverrides = commitTargetTimeInputs()
  if (Object.keys(beanOverrides).length > 0) {
    onBeanUpdate(beanOverrides)
    setBeanOverrides({})
  }
  return timeOverrides
}
```

3. Called `flushPendingEdits()` before every exit path:

| Exit path | Needs return value? | Why |
|-----------|-------------------|-----|
| "Brew This" | No | `buildBrewRecord` runs later (next phase) |
| "Log without timer" | Yes | `buildBrewRecord` runs immediately in same tick |
| "Done" (exit edit) | No | Just committing to state |
| "Save Recipe" | Yes | Passes fields to parent callback in same tick |

4. For paths needing immediate values, pass overrides through:

```jsx
<button onClick={() => {
  const timeOverrides = flushPendingEdits()
  onLogWithoutTimer(timeOverrides || {})
}}>
```

## BrewForm variant

The same pattern appeared in BrewForm's `handleSave`: the target time input might not have been blurred before save. The fix creates an immutable `timeFlush` object and merges it into the save payload:

```jsx
const range = parseTimeRange(targetTimeInput)
const timeFlush = range ? {
  targetTime: Math.round((range.min + range.max) / 2),
  targetTimeMin: range.min,
  targetTimeMax: range.max,
  targetTimeRange: formatTimeRange(range.min, range.max),
} : {}

const merged = { ...form, ...timeFlush }
if (Object.keys(timeFlush).length > 0) setForm(prev => ({ ...prev, ...timeFlush }))
```

**Important:** Don't mutate React state directly (`form.targetTime = value`). Create a local merged copy and also queue a state update for any subsequent handlers.

## Prevention

**Audit checklist for edit-mode components:**

1. List every input that uses deferred commit (blur-based or explicit "Done")
2. List every action button that advances the workflow (save, submit, navigate)
3. For each action button, verify it calls the same commit/flush functions
4. If the action runs synchronously in the same tick as the flush, the flush must **return** values (React state updates are batched and not visible until next render)
5. Test: edit a field → without blurring or pressing Done → tap the primary action → verify the new value is used

## Related

- `paired-input-blur-race-causes-value-flicker.md` — The blur race that originally motivated deferred commits
- `timer-stop-must-flush-pause-gap.md` — Same principle: lifecycle-ending functions must flush pending state
- `entity-form-field-mapping-diverges-across-sites.md` — RECIPE_FIELDS as single source of truth for which fields to flush
