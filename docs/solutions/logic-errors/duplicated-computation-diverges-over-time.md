---
title: "Duplicated computation diverges over time"
category: logic-errors
tags: [duplication, DRY, fallback-chain, extract-function]
module: BrewScreen
symptoms:
  - "Displayed value differs from saved value for the same computation"
  - "Edge cases produce inconsistent results across two code paths"
created: 2026-03-01
---

# Duplicated computation diverges over time

## Problem

The "time status" computation — whether a brew finished on-target, over, or under — was implemented in two places inside `BrewScreen.jsx`:

1. In `handleCommit` — to persist `timeStatus` to the brew record in localStorage
2. In the `PostBrewCommit` JSX — as an IIFE to display the status badge on screen

Both computed nominally the same thing, but with **inconsistent fallback chains**:

```js
// handleCommit
const target = recipe.targetTimeMin || recipe.targetTime
// (no fallback to totalDuration)

// JSX IIFE
const target = recipe.targetTimeMin || recipe.targetTime
// (different tolerance handling, no totalDuration fallback either)
```

In edge cases (e.g., a brew with only `targetTime` set, or a brew where `targetTimeMin` is 0), the saved value and the displayed value could diverge. The user would see one badge but a different value written to their brew history.

## Symptoms

- The time-status badge in the post-commit screen shows "on-target" while the saved brew record contains `timeStatus: "over"` (or vice versa).
- Edge cases involving `targetTimeMin === 0`, missing `targetTimeMax`, or absent `targetTime` produce different results depending on which code path runs.
- A developer fixes a fallback bug in one location and the other location silently retains the old behavior.

## Root Cause

When the same computation lives in two places — an imperative event handler and a JSX render path — they are written by the same developer at the same time and look identical. Over time, a bug fix or new requirement is applied to one location and the other is missed. The two contexts (handler vs render) make the duplication less visually obvious than duplicated utility functions would be.

The root cause is not the initial copy — it is the absence of a shared, named function that makes the duplication explicit and its single-source nature enforceable.

## Solution

Extract the computation to a single exported function in `src/data/storage.js`. Both consumers import and call the same function. The IIFE in the JSX is replaced with a pre-computed variable for clarity.

### Shared function in `storage.js`

```js
const SINGLE_TARGET_TOLERANCE_SECS = 10

/**
 * Determine whether elapsed time was on-target, over, or under.
 *
 * When targetTimeMin === targetTimeMax (single-target mode) a ±10-second
 * tolerance is applied. When a min/max range is provided the brew must land
 * inside the range with no tolerance.
 *
 * Returns null if no target can be determined.
 */
export function computeTimeStatus(elapsed, targetTimeMin, targetTimeMax, targetTime, fallbackDuration) {
  const tMin = targetTimeMin || targetTime || fallbackDuration
  const tMax = targetTimeMax || targetTime || fallbackDuration
  if (tMin == null) return null
  const tolerance = tMin === tMax ? SINGLE_TARGET_TOLERANCE_SECS : 0
  if (elapsed < tMin - tolerance) return { status: 'under', delta: tMin - elapsed }
  if (elapsed > tMax + tolerance) return { status: 'over', delta: elapsed - tMax }
  return { status: 'on-target', delta: 0 }
}
```

### In `handleCommit` (imperative path)

```js
import { computeTimeStatus } from '../data/storage'

// inside handleCommit:
const timeResult = computeTimeStatus(
  brewData.elapsed,
  recipe.targetTimeMin,
  recipe.targetTimeMax,
  recipe.targetTime,
  totalDuration
)
const brewRecord = {
  ...brewData,
  timeStatus: timeResult?.status ?? null,
}
```

### In `PostBrewCommit` JSX (render path)

```jsx
import { computeTimeStatus } from '../data/storage'

// pre-computed variable replaces the IIFE
const displayTimeResult = computeTimeStatus(
  brewData.elapsed,
  recipe.targetTimeMin,
  recipe.targetTimeMax,
  recipe.targetTime,
  displayTotalDuration
)

// used in JSX:
{displayTimeResult && (
  <span className={`badge badge-${displayTimeResult.status}`}>
    {displayTimeResult.status}
  </span>
)}
```

## Code Examples

### Before — two divergent paths

```js
// handleCommit (handler)
const target = recipe.targetTimeMin || recipe.targetTime   // no totalDuration fallback
const isOver = elapsed > target + 10
const isUnder = elapsed < target - 10
const timeStatus = isOver ? 'over' : isUnder ? 'under' : 'on-target'

// PostBrewCommit (JSX IIFE)
const result = (() => {
  const t = recipe.targetTimeMin || recipe.targetTime      // same fallback gap
  if (!t) return null
  if (elapsed > t + 15) return 'over'                     // different tolerance: 15 vs 10
  if (elapsed < t - 10) return 'under'
  return 'on-target'
})()
```

### After — single shared function

```js
// storage.js
export function computeTimeStatus(elapsed, targetTimeMin, targetTimeMax, targetTime, fallbackDuration) {
  const tMin = targetTimeMin || targetTime || fallbackDuration
  const tMax = targetTimeMax || targetTime || fallbackDuration
  if (tMin == null) return null
  const tolerance = tMin === tMax ? SINGLE_TARGET_TOLERANCE_SECS : 0
  if (elapsed < tMin - tolerance) return { status: 'under', delta: tMin - elapsed }
  if (elapsed > tMax + tolerance) return { status: 'over', delta: elapsed - tMax }
  return { status: 'on-target', delta: 0 }
}

// handleCommit — one call
const timeResult = computeTimeStatus(brewData.elapsed, recipe.targetTimeMin, recipe.targetTimeMax, recipe.targetTime, totalDuration)

// JSX — one call, pre-computed
const displayTimeResult = computeTimeStatus(brewData.elapsed, recipe.targetTimeMin, recipe.targetTimeMax, recipe.targetTime, displayTotalDuration)
```

## Prevention

1. **Extract immediately when a computation appears in both a handler and a render path.** The moment you copy the logic, extract it. Do not wait — divergence is inevitable once two authors or two PRs touch the same feature.

2. **Name the function after what it computes, not where it is used.** `computeTimeStatus` is clear regardless of call site. `getHandlerTimeStatus` is not.

3. **Put shared computation functions in the storage/utility layer**, not in a component. Components import from `storage.js`; they do not re-export logic to each other.

4. **IIFEs in JSX are a code smell for missing extraction.** If you find yourself writing `{(() => { ... })()}` in JSX, the computation belongs in a named variable or a shared function.

5. **Code review: grep for the same arithmetic in more than one place.** Before merging, search for key literals (e.g., the tolerance constant `10`) to catch copies that belong in a shared function.

## Related

- `docs/solutions/logic-errors/dual-field-names-for-same-data-cause-silent-loss.md` — similar class: two representations of the same datum that diverge
- `src/data/storage.js` — home for all shared computation functions
- `src/components/BrewScreen.jsx` — module where this bug was found
