---
title: "Boolean state classifications must be mutually exclusive"
category: logic-errors
tags: [boolean-logic, state-classification, mutual-exclusion, rendering]
module: BrewScreen
symptoms:
  - "Skipped steps render as both skipped and past"
  - "A step matches two rendering branches simultaneously"
  - "Conditional rendering falls through to wrong branch"
created: 2026-03-04
---

# Boolean state classifications must be mutually exclusive

## Problem

When rendering items in different visual states (past, current, future, skipped), the boolean conditions must be mutually exclusive. If a step can match multiple conditions, it renders through the first matching branch — which may not be the correct one, or its classification pollutes derived state for other items.

In ActiveBrew, `isPast` was defined as:

```js
const isPast = hasStarted && (timer.elapsed >= step.time + step.duration || skipped)
```

This made skipped steps also classify as `isPast`. While the render code checked `skipped` first (so skipped steps rendered correctly), the `isPast = true` for skipped steps meant `isFuture` was `false` for them, which could affect `isNext` calculations and any future logic that depends on `isPast` count or ordering.

## Symptoms

- A skipped step contributes to the "past" count even though it was never completed
- `isNext` may point to the wrong step if a skipped step between current and next is incorrectly classified as past
- Adding a new rendering branch (e.g., "retry") that checks `isPast` picks up skipped steps unintentionally

## Root Cause

The boolean flags were computed as overlapping sets rather than a partition:

```js
// WRONG — overlapping
const isPast = hasStarted && (elapsed >= endTime || skipped)  // skipped ⊂ isPast
const isFuture = !isCurrent && !isPast                        // skipped excluded from future too

// The render code had: if (skipped) ... else if (isPast) ...
// This worked by accident — the order masked the overlap
```

## Solution

Make each classification check exclude the others explicitly:

```js
const skipped = skippedSteps[step.id]
const isCurrent = i === currentStepIdx && hasStarted && !skipped
const isPast = hasStarted && !skipped && timer.elapsed >= step.time + step.duration
const isFuture = !isCurrent && !isPast && !skipped
```

Now each step belongs to exactly one set: `skipped`, `isPast`, `isCurrent`, or `isFuture`. No ordering dependency in the render branches.

## Prevention

1. **State classifications should form a partition.** Every item belongs to exactly one category. If you can't express this as `if/else if/else`, the conditions overlap.

2. **Never OR unrelated conditions into a single flag.** `elapsed >= endTime` and `skipped` are semantically different reasons for "not active." They deserve separate flags, not a combined `isPast`.

3. **Test with skipped items in different positions.** Skip the first step, skip a middle step, skip the last step. Verify each renders in exactly one branch.

4. **Derived flags (`isNext`, `isFuture`) should not depend on ordering of render branches.** If they're correct only because `skipped` is checked first, the model is fragile.

## Related

- `src/components/BrewScreen.jsx` — ActiveBrew step rendering
- `docs/solutions/react-patterns/derived-booleans-must-share-lifecycle-gate.md` — related pattern where derived booleans must be consistent
