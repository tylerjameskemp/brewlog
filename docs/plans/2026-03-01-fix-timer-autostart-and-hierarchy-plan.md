---
title: "fix: Timer auto-start, elapsed accuracy, and step visual hierarchy"
type: fix
date: 2026-03-01
files:
  - src/hooks/useTimer.js
  - src/components/BrewScreen.jsx
---

# fix: Timer auto-start, elapsed accuracy, and step visual hierarchy

## Overview

Three timer-related issues from testing the ActiveBrew component:

1. **Timer auto-start** — Timer should not auto-start on entering Phase 2. Show a "Tap to start brew" prompt. First tap starts the timer.
2. **Elapsed accuracy bug** — If user pauses then taps "Finish Brew" without resuming, `stop()` returns inflated elapsed because `pausedDurationRef` never accounts for the final pause gap.
3. **Step visual hierarchy** — Current step needs stronger highlight, next step should be dimmed but visible, past steps should collapse to minimal height.

## Problem Statement

### (A) Timer starts before user is ready

When the user enters Phase 2 (brew), the play button is visible but the UX doesn't clearly communicate "nothing is running yet." The user expects: tap the first step = brew begins. Currently the play button and step taps are separate actions. The fix unifies them: a clear "Tap to start brew" prompt, and tapping it starts the clock.

### (B) Elapsed time incorrect after pause-then-finish

**Root cause confirmed in `useTimer.js`:**

```
1. User starts timer         → startedAtRef = T0, pausedDurationRef = 0
2. User pauses at T+100      → pausedAtRef = T0+100
3. User waits 60 seconds
4. User taps "Finish Brew"   → stop() → computeElapsed()
5. computeElapsed = floor((T0+160 - T0 - 0) / 1000) = 160
6. Actual brew time should be 100
```

`pausedDurationRef` only gets updated in `play()` (resume), never in `stop()`. If the user finishes while paused, the pause gap is counted as brew time.

### (C) Step transitions unclear

Current hierarchy has weak differentiation:
- **Current:** `bg-brew-50 border-l-4 border-l-brew-600` — subtle cream background
- **Future:** `opacity-40` — all future steps look identical
- **Past:** `bg-gray-50 text-gray-400` — still fully expanded with all content

No distinction between "next step" and "further future steps." Past steps take up too much vertical space.

## Technical Approach

### Fix 1: Remove auto-start, add "Tap to start" prompt

**File: `src/components/BrewScreen.jsx` (ActiveBrew, ~line 515)**

Before timer starts (`!hasStarted`):
- Timer display shows `0:00` (already works)
- Show large play button with "Tap to start brewing" text below it (existing button at line 633)
- Step list visible at full opacity as a preview of the brew plan
- No step tap interaction before start

After user taps play:
- `timer.play()` fires, `hasStarted` becomes true
- Step 1 (bloom) highlights as current
- Step taps become interactive
- Finish Brew button appears

No changes to what "activates step 1" means — the existing `currentStepIdx` logic already puts step 0 as current at elapsed=0. No auto-recording of `tappedSteps` for bloom. User must tap step 1 to record it, consistent with all other steps.

**Changes:**
- Add descriptive text below play button: `"Tap to start brewing"` (small, muted)
- No other behavioral changes — the play button already exists and works

### Fix 2: Fix `stop()` to account for final pause gap

**File: `src/hooks/useTimer.js` (line 39)**

Current `stop()`:
```javascript
const stop = useCallback(() => {
  clearInterval(intervalRef.current)
  setRunning(false)
  return computeElapsed()
}, [computeElapsed])
```

Fixed `stop()`:
```javascript
const stop = useCallback(() => {
  // Account for final pause gap if currently paused
  if (pausedAtRef.current !== null) {
    pausedDurationRef.current += Date.now() - pausedAtRef.current
    pausedAtRef.current = null
  }
  clearInterval(intervalRef.current)
  setRunning(false)
  const finalElapsed = computeElapsed()
  setElapsed(finalElapsed) // Sync state with final value
  return finalElapsed
}, [computeElapsed])
```

Key details:
- Check `pausedAtRef.current !== null` → add the gap to `pausedDurationRef`
- Null out `pausedAtRef` to prevent double-counting if `getTimerState()` is ever called post-stop
- Call `setElapsed(finalElapsed)` so any UI reading `timer.elapsed` after stop sees the correct value (not a stale interval tick)
- Return value unchanged — `computeElapsed()` now includes the final gap

### Fix 3: Step visual hierarchy

**File: `src/components/BrewScreen.jsx` (ActiveBrew step rendering, ~line 666)**

Three changes to step states:

#### 3a. Current step — stronger highlight

Change from subtle cream to prominent:
- Background: `bg-amber-50` (warmer, more visible)
- Left border: `border-l-4 border-l-brew-600` (keep)
- Text: `font-semibold text-brew-900` (bold the step name)
- Add subtle scale or shadow to lift the card: `shadow-sm`

#### 3b. Next step — visible but dimmed

Distinguish `i === currentStepIdx + 1` from further future steps:
- Next step: `opacity-70` (visible, clearly "on deck")
- Further future: `opacity-40` (existing behavior)

```javascript
const isNext = !isCurrent && !isPast && i === currentStepIdx + 1
// ...
${timer.running && isFuture && !isNext ? 'opacity-40' : ''}
${timer.running && isNext ? 'opacity-70' : ''}
```

#### 3c. Past steps — collapsed

Past steps collapse to a single compact line showing only the step name and a checkmark or timestamp. The note, water target, and variance details are hidden.

```jsx
{isPast && !skipped ? (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-2">
      <span className="text-green-500 text-xs">✓</span>
      <span className="text-sm text-gray-400">{step.name}</span>
    </div>
    <span className="text-xs tabular-nums text-gray-300">
      {tappedAt !== undefined ? formatTime(tappedAt) : formatTime(step.time)}
    </span>
  </div>
) : (
  // Full step content (current, future, skipped)
  ...existing JSX...
)}
```

Past steps reduce from ~60-70px to ~32px, freeing vertical space for current and upcoming steps.

#### 3d. Pause-state step highlight

Fix `isCurrent` to keep the active step highlighted during pause:

```javascript
// Before: isCurrent = i === currentStepIdx && timer.running
// After:
const isCurrent = i === currentStepIdx && hasStarted
```

This keeps the current step visually highlighted during pause, so the user knows where they are. Step taps remain gated on `timer.running` (can only tap while timer is running).

## Acceptance Criteria

- [x] **No auto-start:** Entering Phase 2 shows timer at `0:00`, play button, and "Tap to start brewing" text. Timer does not run until play is tapped.
- [x] **Elapsed accuracy:** Pause at 1:00, wait 30 seconds, tap Finish Brew → elapsed shows `1:00`, not `1:30`.
- [x] **Elapsed accuracy (no pause):** Start timer, brew for 3:00, tap Finish Brew → elapsed shows `3:00` (wall-clock accurate).
- [x] **Elapsed accuracy (pause-resume):** Start, pause at 1:00, wait, resume, brew to 2:00, finish → elapsed shows `2:00`.
- [x] **Current step:** Bold text, warm background, shadow — clearly the active step.
- [x] **Next step:** Visible at ~70% opacity, distinguishable from further future steps.
- [x] **Past steps:** Collapsed to single line with checkmark and timestamp. Note and water target hidden.
- [x] **Pause highlight:** Current step stays highlighted when timer is paused.
- [x] **Crash recovery:** Resume from saved state still works correctly (timer restore unaffected).
- [x] **Animations:** All new transitions respect `motion-reduce:animate-none`.

## Institutional Learnings Applied

- **Double-tap guards** (CLAUDE.md) — Play button is safe from double-tap (second `play()` call is a no-op). No additional guard needed.
- **Persist and restore end-to-end** (`docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md`) — After fixing `stop()`, verify that `getTimerState()` returns clean state post-stop and that `restore()` still works for crash recovery.
- **Terminal state as formal phase** (`docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`) — Already implemented correctly with `committed` phase.

## Out of Scope

- Crash recovery `window.confirm` replacement (works but could be better)
- Bean-not-found guard in crash recovery (pre-existing bug, separate fix)
- Back navigation from Phase 2 (no back button in ActiveBrew currently)
- Persistence during "tap to start" state (nothing to persist yet)
- Auto-recording bloom step tap at timer start

## References

- `src/hooks/useTimer.js` — Wall-clock timer hook with the `stop()` bug
- `src/components/BrewScreen.jsx:515-757` — ActiveBrew component
- `docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md` — Crash recovery pattern
- `docs/brainstorms/2026-02-25-brew-step-tracking-brainstorm.md` — Step tracking data model context
