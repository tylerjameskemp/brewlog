---
title: Fix Recipe Save Propagation + Explicit Save Button
type: fix
date: 2026-03-05
---

# Fix Recipe Save Propagation + Explicit Save Button

## Overview

Fix a cluster of related bugs that prevent recipe edits from propagating correctly through the brew flow. The root causes are: (1) a `savingRef` scoping error that silently kills post-brew recipe buttons, (2) buffered target time input not flushing before save/brew actions, (3) BrewForm recipe update only passing steps instead of all recipe fields, and (4) History displaying the midpoint integer instead of the range string.

## Problem Statement

During a live brew on March 5, three failures occurred in sequence:
- Entered target time "4:00-5:00" in RecipeAssembly, tapped "Brew This" without tapping "Done" — the teleprompter showed the old target time because `commitTargetTimeInputs()` never ran
- After brewing, the "Update Recipe" and "Save as New Recipe" buttons in the success screen were non-functional (silent TypeError from undefined `savingRef`)
- Editing the brew from History and updating the recipe only synced steps — target time changes were silently dropped
- History displayed "4:30" (the midpoint) instead of "4:00-5:00" (the range)

## Proposed Solution

Six targeted changes across 3 files, no architecture refactoring.

### Change 1: Fix BrewSuccess savingRef (BrewScreen.jsx)

**Problem:** `BrewSuccess` is a standalone function component (line 1549) that references `savingRef` in onClick handlers (lines 1604-1621), but `savingRef` is only defined inside `RateThisBrew` (line 1245) and the main `BrewScreen` (line 1668). Accessing `.current` on `undefined` throws a TypeError, silently killing "Update Recipe" and "Save as New Recipe" buttons.

**Fix:** Remove the `savingRef` guards entirely from BrewSuccess. Per documented learning (`docs/solutions/react-patterns/synchronous-ref-guard-is-always-ineffective.md`), `savingRef` around synchronous localStorage calls is dead code anyway. `setForkDismissed(true)` already hides the prompt after first click, preventing re-clicks.

**Lines to change:** BrewScreen.jsx lines 1603-1608 and 1616-1621. Remove the `if (savingRef.current) return` / `savingRef.current = true` / `savingRef.current = false` wrapping. Keep the `onUpdateRecipe(selectedRecipeId)` and `onSaveAsNewRecipe(selectedRecipeId)` calls and the `setForkDismissed(true)` calls.

### Change 2: Flush pending edits on all save/brew actions (BrewScreen.jsx)

**Problem:** `commitTargetTimeInputs()` (line 252) only runs when the user taps "Done" to exit edit mode. Three action buttons bypass it: "Brew This" (line 854), "Log without timer" (line 863), and "Save changes to recipe" (RecipeSaveChoice). `beanOverrides` also only flush in `handleDoneEditing()`.

**Fix:** Create a `flushPendingEdits()` function inside RecipeAssembly that calls `commitTargetTimeInputs()` and flushes `beanOverrides` via `onBeanUpdate(beanOverrides)` if non-empty. Call `flushPendingEdits()` before the three action callbacks.

**Approach — wrap callbacks inside RecipeAssembly:**

```jsx
// Inside RecipeAssembly, before the return:
const flushPendingEdits = () => {
  commitTargetTimeInputs()
  if (Object.keys(beanOverrides).length > 0) {
    onBeanUpdate(beanOverrides)
  }
}

const handleStartBrew = () => {
  flushPendingEdits()
  onStartBrew()
}

const handleLogWithout = () => {
  flushPendingEdits()
  onLogWithoutTimer()
}
```

Then replace `onClick={onStartBrew}` (line 855) with `onClick={handleStartBrew}` and `onClick={onLogWithoutTimer}` (line 863) with `onClick={handleLogWithout}`.

For `onSaveToRecipe`: the callback is passed through to `RecipeSaveChoice`. Either:
- (a) Wrap `onSaveToRecipe` before passing to RecipeSaveChoice: `onSaveToRecipe={(id, fields) => { flushPendingEdits(); onSaveToRecipe(id, fields); }}`
- (b) Or call `flushPendingEdits()` inside RecipeSaveChoice before calling the prop — but RecipeSaveChoice doesn't have access to `commitTargetTimeInputs`. Option (a) is cleaner.

**Note:** `flushPendingEdits` must be called synchronously before the action, in the same event handler. The flush writes to `recipe` state via `setRecipe`, but React batches state updates. This means the `recipe` state read by `onStartBrew` → `buildBrewRecord` may still be stale within the same render.

**Important subtlety:** `commitTargetTimeInputs()` calls `setRecipe(prev => ({...prev, ...timeFields}))`. But `buildBrewRecord` reads `recipe` from the closure, not from the updated state. The state update won't be visible until the next render. We need to either:
- Return the flushed values from `flushPendingEdits()` and pass them through, OR
- Have `commitTargetTimeInputs()` return the computed values and merge them into the recipe object used by buildBrewRecord

**Recommended approach:** Refactor `commitTargetTimeInputs` to return the computed range values:

```jsx
const commitTargetTimeInputs = () => {
  const range = parseTimeRange(targetTimeInput)
  if (!range) return null
  const timeFields = {
    targetTimeMin: range.min,
    targetTimeMax: range.max,
    targetTime: Math.round((range.min + range.max) / 2),
    targetTimeRange: formatTimeRange(range.min, range.max),
  }
  setRecipe(prev => ({ ...prev, ...timeFields }))
  setTargetTimeInput(formatTimeRange(range.min, range.max))
  return timeFields
}
```

Then in the parent BrewScreen, `onStartBrew` becomes a function that receives flushed overrides and merges them before calling `buildBrewRecord`. The simplest approach: pass a `getFlushOverrides` callback from RecipeAssembly to the parent, or have RecipeAssembly set the recipe state and use a `useEffect` to detect phase change.

**Simplest viable approach:** Have RecipeAssembly's wrapped handlers call `commitTargetTimeInputs()` which sets state, then use `setTimeout(onStartBrew, 0)` to defer the brew start to after React processes the state update. However, this is fragile.

**Better approach:** Have `onStartBrew` accept an optional overrides object. RecipeAssembly computes the flushed values synchronously and passes them:

```jsx
const handleStartBrew = () => {
  const timeOverrides = commitTargetTimeInputs() || {}
  onStartBrew(timeOverrides)
}
```

In BrewScreen parent, the `onStartBrew` handler merges overrides into recipe before phase transition:

```jsx
onStartBrew={(overrides) => {
  if (overrides && Object.keys(overrides).length > 0) {
    setRecipe(prev => ({ ...prev, ...overrides }))
  }
  setPhase('brew')
}}
```

But `buildBrewRecord` still reads from closure... The real fix is that `buildBrewRecord` should read from a ref that's always current, or the flush should happen before the brew phase where `buildBrewRecord` is called (which is in ActiveBrew's "Finish Brew", not at phase transition time).

**Wait — re-analysis:** `buildBrewRecord` is called in `handleFinishBrew` (line 1882) and `handleLogWithoutTimer` (line 1905), NOT at phase transition. So by the time the user finishes their brew and `handleFinishBrew` runs, the React state from `commitTargetTimeInputs()` will already be current. The state update from the flush will have been processed by then. So the simple approach works:

```jsx
const handleStartBrew = () => {
  commitTargetTimeInputs()
  // beanOverrides flush if needed
  onStartBrew()
}
```

For "Log without timer", `handleLogWithoutTimer` runs immediately (no timer phase). But it reads `recipe` from its own closure. Since `setRecipe` is batched, the `recipe` value in `handleLogWithoutTimer`'s closure won't reflect the flush. This IS a problem for the skip-timer path.

**For "Log without timer" specifically:** The flush values need to be passed through. Since `handleLogWithoutTimer` calls `buildBrewRecord` which reads `recipe` from closure, we need the overrides to be merged. Pass overrides to `onLogWithoutTimer`:

```jsx
const handleLogWithout = () => {
  const timeOverrides = commitTargetTimeInputs() || {}
  onLogWithoutTimer(timeOverrides)
}
```

Then in `handleLogWithoutTimer`:
```jsx
const handleLogWithoutTimer = useCallback((timeOverrides = {}) => {
  // Merge overrides into recipe for this call
  const currentRecipe = { ...recipe, ...timeOverrides }
  const brew = buildBrewRecord({ isManualEntry: true }, currentRecipe)
  // ... rest of save logic
}, [recipe, ...])
```

Or simpler: have `buildBrewRecord` accept a recipe override parameter.

**For "Brew This":** No problem — `buildBrewRecord` runs later (in "Finish Brew"), after state has updated.

**For "Save to Recipe":** The save reads from `recipe` state via `formStateToRecipeFields(recipe)` in the parent's callback. Same batching issue. Pass overrides through.

### Change 3: BrewForm recipe update passes all editable RECIPE_FIELDS (BrewForm.jsx)

**Problem:** `handleRecipeAction` (line 142) passes `{ steps: form.steps }` to `onUpdateRecipe`. Target time, grind, water, temp changes are silently dropped.

**Fix:** Build the update payload from all RECIPE_FIELDS that BrewForm actually manages:

```js
// Fields BrewForm exposes in its UI (9 of 14 RECIPE_FIELDS)
const BREWFORM_RECIPE_FIELDS = [
  'coffeeGrams', 'waterGrams', 'grindSetting', 'waterTemp',
  'targetTime', 'targetTimeRange', 'targetTimeMin', 'targetTimeMax',
  'steps',
]
// NOT included: method, grinder, dripper, filterType, pourTemplateId
// (BrewForm preserves these from the original brew, not editable)
```

Updated `handleRecipeAction`:
```jsx
const handleRecipeAction = (action) => {
  const fields = {}
  BREWFORM_RECIPE_FIELDS.forEach(f => {
    if (form[f] !== undefined) fields[f] = f === 'steps' ? [...form.steps] : form[f]
  })
  if (action === 'update') {
    onUpdateRecipe?.(editBrew.recipeId, fields)
  } else if (action === 'saveNew') {
    onSaveAsNewRecipe?.(editBrew.recipeId, fields)
  }
  setShowRecipePrompt(false)
  onEditComplete()
}
```

**Also expand the trigger condition** (lines 132-139). Currently only fires when steps changed vs planned. Should fire when ANY editable recipe field differs from the stored recipe entity:

```jsx
const hasRecipe = editBrew.recipeId && recipes?.find(r => r.id === editBrew.recipeId && !r.archivedAt)
if (hasRecipe) {
  const storedRecipe = recipes.find(r => r.id === editBrew.recipeId)
  const anyFieldChanged = BREWFORM_RECIPE_FIELDS.some(f => {
    const formVal = JSON.stringify(form[f] ?? null)
    const recipeVal = JSON.stringify(storedRecipe[f] ?? null)
    return formVal !== recipeVal
  })
  if (anyFieldChanged) {
    setShowRecipePrompt(true)
  } else {
    onEditComplete()
  }
} else {
  onEditComplete()
}
```

**Update prompt message** (lines 495-524): Change from "Your steps differed from the original plan" to "Your brew settings differed from the recipe" since the trigger now covers all fields.

**BrewForm target time flush:** Add a flush at the top of `handleSave()` — parse `targetTimeInput` and commit to form state before building the save payload. Same paired-input blur race pattern documented in `docs/solutions/ui-bugs/paired-input-blur-race-causes-value-flicker.md`.

### Change 4: History target time range display (BrewHistory.jsx)

**Problem:** All target time display in BrewHistory uses `brew.targetTime` (integer seconds) via `formatTime()`. Shows "4:30" instead of "4:00-5:00".

**Fix — 4 locations:**

1. **Expanded card** (lines 592-597): Change condition and display:
   ```jsx
   {(brew.targetTimeRange || brew.targetTime) && (
     <div className="text-xs">
       <span className="text-brew-500">Target Time:</span>{' '}
       <span className="font-mono text-brew-700">
         {brew.targetTimeRange || formatTime(brew.targetTime)}
       </span>
     </div>
   )}
   ```

2. **Diff badge** (lines 232-234): Use range string for display:
   ```jsx
   const prevDisplay = prev.targetTimeRange || formatTime(prev.targetTime) || '—'
   const brewDisplay = brew.targetTimeRange || formatTime(brew.targetTime) || '—'
   if (prevDisplay !== brewDisplay) {
     diffs.push(`Target: ${prevDisplay} → ${brewDisplay}`)
   }
   ```

3. **Time deviation line** (lines 632-636): Use range for display:
   ```jsx
   {(brew.targetTimeRange || brew.targetTime) && brew.totalTime && ... && (
     <span>Target {brew.targetTimeRange || formatTime(brew.targetTime)}, actual {formatTime(brew.totalTime)}</span>
   )}
   ```

4. **Compare panel** — `compareBrews()` (around line 47): Update the `targetTime` entry to use a custom format function that prefers `targetTimeRange`:
   ```js
   { key: 'targetTime', label: 'Target Time',
     format: (val, brew) => brew.targetTimeRange || formatTime(val),
     section: 'recipe' }
   ```
   (If `compareBrews` doesn't pass the full brew object, may need to add a `targetTimeRange` entry or restructure slightly.)

### Change 5: Ensure RecipeSaveChoice benefits from flush (BrewScreen.jsx)

`RecipeSaveChoice` already exists (lines 171-210) and calls `onSaveToRecipe` with `formStateToRecipeFields(recipe)`. The flush fix from Change 2 must also cover the `onSaveToRecipe` callback path.

In RecipeAssembly's render, wrap the `onSaveToRecipe` prop before passing to RecipeSaveChoice:

```jsx
<RecipeSaveChoice
  ...
  onSaveToRecipe={(id, fields) => {
    const timeOverrides = commitTargetTimeInputs() || {}
    // Merge flushed values into fields before saving
    onSaveToRecipe(id, { ...fields, ...timeOverrides })
  }}
/>
```

Or simpler: have `RecipeSaveChoice` call a wrapped version that flushes first and passes the complete `formStateToRecipeFields(recipe)` after flush.

## Acceptance Criteria

- [x] Post-brew "Update Recipe" and "Save as New Recipe" buttons are clickable and functional
- [x] Edit target time to "4:00-5:00" → tap "Brew This" without tapping "Done" → teleprompter shows "4:00-5:00"
- [x] Edit target time → tap "Log without timer" → saved brew has correct target time range
- [x] Edit target time → tap "Save changes to recipe" → recipe entity updated with new range
- [x] Edit brew from History → change target time → "Update Recipe" → recipe entity has new range
- [x] Edit brew from History → change grind setting → recipe update prompt appears (not just steps)
- [x] History expanded card shows "4:00-5:00" not "4:30" for brews with target time ranges
- [x] History diff badges show ranges not midpoints
- [x] Compare mode shows ranges not midpoints
- [x] Recipe update prompt message is accurate for non-step changes
- [x] Previous brew sessions remain unchanged (recipeSnapshot is frozen)
- [x] Recipe version increments on each update
- [x] `npm run build` passes with no errors

## Dependencies & Risks

**Risks:**
- The React state batching issue for "Log without timer" requires passing overrides through to `buildBrewRecord`. This is the trickiest change.
- Expanding the BrewForm recipe prompt trigger may surprise users who only changed grind — they'll now be asked about updating the recipe. This is arguably correct behavior.
- BrewForm equipment fields (method, grinder, dripper, filterType) are intentionally excluded from the recipe update payload to avoid regressing the recipe's equipment to brew-time values.

**Institutional learnings to follow:**
- `RECIPE_FIELDS` is the single source of truth — all mapping sites use it (docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md)
- `savingRef` around sync calls is dead code — remove, don't fix (docs/solutions/react-patterns/synchronous-ref-guard-is-always-ineffective.md)
- Edit forms must preserve unmodified fields verbatim (docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md)
- Recipe write functions must check `safeSetItem` return (docs/solutions/logic-errors/new-entity-crud-misses-defensive-patterns.md)

## Implementation Order

1. **Change 1** — BrewSuccess savingRef (simplest, unblocks testing of other changes)
2. **Change 4** — History display (independent, quick win)
3. **Change 3** — BrewForm recipe update (independent of flush work)
4. **Change 2 + 5** — Flush pending edits (most complex, affects multiple call sites)
5. Build verification: `npm run build`

## Files Changed

| File | Changes |
|------|---------|
| `src/components/BrewScreen.jsx` | Change 1 (remove savingRef from BrewSuccess), Change 2 (flush on Brew This / Log without timer), Change 5 (flush on RecipeSaveChoice save) |
| `src/components/BrewForm.jsx` | Change 3 (expand recipe update fields + trigger + message + target time flush) |
| `src/components/BrewHistory.jsx` | Change 4 (target time range display in 4 locations) |

## References

- Brainstorm: `docs/brainstorms/2026-03-05-recipe-save-propagation-brainstorm.md`
- Learning — entity-form mapping: `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md`
- Learning — sync ref guard: `docs/solutions/react-patterns/synchronous-ref-guard-is-always-ineffective.md`
- Learning — edit form overwrites: `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`
- Learning — CRUD defensive patterns: `docs/solutions/logic-errors/new-entity-crud-misses-defensive-patterns.md`
- Learning — blur race: `docs/solutions/ui-bugs/paired-input-blur-race-causes-value-flicker.md`
