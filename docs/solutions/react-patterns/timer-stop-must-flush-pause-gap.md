---
title: "Timer stop() must flush final pause gap before computing elapsed"
category: react-patterns
module: useTimer, BrewScreen
tags: [timer, wall-clock, pause, stop, refs, elapsed, data-integrity]
severity: P1
symptoms:
  - Elapsed time inflated after pause-then-finish
  - Timer shows wrong value in brew report
  - "350 when stopped earlier" — elapsed includes pause duration
date_fixed: 2026-03-01
pr: "#21"
related:
  - persist-and-restore-must-be-end-to-end.md
---

# Timer stop() must flush final pause gap before computing elapsed

## Problem

A wall-clock timer hook using `Date.now()` delta with pause tracking showed inflated elapsed time when the user paused and then stopped (finished) without resuming first.

**Symptoms:** User pauses at 1:00, waits 30 seconds, taps "Finish Brew" — elapsed reports 1:30 instead of 1:00.

## Root Cause

The hook tracked pause duration across three functions:

| Function | Updates `pausedDurationRef`? | Updates `pausedAtRef`? |
|----------|------------------------------|------------------------|
| `pause()` | No | Sets to `Date.now()` |
| `play()` (resume) | Yes — adds gap | Nulls out |
| `stop()` | **No (bug)** | **No (bug)** |

`computeElapsed()` subtracts `pausedDurationRef` from the wall-clock delta:

```js
Math.floor((Date.now() - startedAtRef - pausedDurationRef) / 1000)
```

But `pausedDurationRef` only got updated on **resume** (in `play()`). If the user never resumed — they paused and then stopped — the gap between `pausedAtRef` and the stop time was never added to `pausedDurationRef`. The elapsed calculation therefore included the entire pause as brew time.

## The Pattern

**Any function that ends the timer's lifecycle must flush the open pause gap first.** This applies to `stop()`, and would apply to any future `reset()` or `destroy()` function.

The flush is identical to what `play()` does on resume:

```js
if (pausedAtRef.current !== null) {
  pausedDurationRef.current += Date.now() - pausedAtRef.current
  pausedAtRef.current = null
}
```

## Fix

```js
const stop = useCallback(() => {
  // Flush final pause gap if currently paused
  if (pausedAtRef.current !== null) {
    pausedDurationRef.current += Date.now() - pausedAtRef.current
    pausedAtRef.current = null
  }
  clearInterval(intervalRef.current)
  setRunning(false)
  const finalElapsed = computeElapsed()
  setElapsed(finalElapsed) // sync React state with final value
  return finalElapsed
}, [computeElapsed])
```

Key details:
- **Null out `pausedAtRef`** after flushing to prevent double-counting if `getTimerState()` is called post-stop
- **Call `setElapsed(finalElapsed)`** so any UI reading `timer.elapsed` after stop sees the correct value, not a stale interval tick
- The return value is what `onFinish` captures and stores as `brewData.elapsed`

## Prevention

**Audit checklist for ref-based duration tracking:**

1. List every function that transitions the timer out of a state (pause, stop, reset, destroy)
2. For each, verify it flushes any open duration gap before computing the final value
3. The flush pattern is always: `accumulator += Date.now() - anchor; anchor = null`
4. Test the pause-then-X path for every X (stop, reset, destroy) — not just pause-then-resume

**Test case:** Start timer → pause at known time → wait → call stop/finish → assert elapsed equals only the running duration, not running + paused.

## Related

- `persist-and-restore-must-be-end-to-end.md` — Timer crash recovery round-trip (save → refresh → restore)
- `terminal-state-must-be-a-formal-phase.md` — Phase machine terminal states
- PR #21 — Full fix including step visual hierarchy improvements
