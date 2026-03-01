---
title: "Derived booleans in the same scope must share lifecycle gates"
category: react-patterns
module: BrewScreen
tags: [state, derived-state, boolean, consistency, lifecycle]
severity: P2
symptoms:
  - Step renders in wrong state before timer starts
  - Edge case with zero-duration steps showing as collapsed/past
date_fixed: 2026-03-01
pr: "#21"
related:
  - timer-stop-must-flush-pause-gap.md
---

# Derived booleans in the same scope must share lifecycle gates

## Problem

When refactoring `isCurrent` from `timer.running` to `hasStarted` to keep the current step highlighted during pause, `isPast` was left ungated — creating an inconsistency where steps could be classified as "past" before the brew even started.

## Root Cause

```js
const isCurrent = i === currentStepIdx && hasStarted  // gated on hasStarted
const isPast = timer.elapsed >= step.time + step.duration || skipped  // NOT gated
```

Before the timer starts, `timer.elapsed` is 0. For a step with `time: 0` and `duration: 0` (degenerate but possible), `isPast` would be `true` before the brew starts — collapsing the step into the compact past-step view when nothing has happened yet.

## The Pattern

**When a set of derived booleans (`isCurrent`, `isPast`, `isFuture`, `isNext`) form a state partition, they must all share the same lifecycle gate.** If one gets a new precondition (like `hasStarted`), audit all the others.

## Fix

```js
const isCurrent = i === currentStepIdx && hasStarted
const isPast = hasStarted && (timer.elapsed >= step.time + step.duration || skipped)
const isFuture = !isCurrent && !isPast
const isNext = isFuture && i === currentStepIdx + 1 && hasStarted
```

Now the entire partition is gated on `hasStarted`. Before the brew starts, all steps are `!isCurrent && !isPast` → `isFuture`, which renders them at full opacity as a preview.

## Prevention

When modifying any boolean in a derived-state partition:
1. Identify all booleans that form the partition (they should be mutually exclusive and exhaustive)
2. If you add a gate to one, add it to all that need it
3. Test the "before lifecycle starts" state — what renders when the precondition is false?
