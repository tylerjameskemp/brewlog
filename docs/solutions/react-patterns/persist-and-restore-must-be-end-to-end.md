---
title: "Persist and restore flows must be wired up end-to-end or not at all"
category: react-patterns
tags: [localstorage, persistence, crash-recovery, half-baked-feature, brewscreen]
module: BrewScreen, useTimer
symptoms:
  - "Save/persist logic runs but the restore path is never called"
  - "Resume dialog appears but the feature doesn't actually resume"
  - "Dead code in hooks — functions exported but never imported"
  - "localStorage writes on every render tick with no consumer"
date: 2026-02-27
severity: P1
---

# Persist and restore flows must be wired up end-to-end or not at all

## Problem

The BrewScreen implemented crash recovery in two halves that were never connected:

**Save half (working):**
- `useTimer.getTimerState()` returns timer refs for persistence
- `persistState` effect writes to localStorage every second during active brew
- `saveActiveBrew()` stores timer state, tapped steps, skipped steps, recipe, and bean

**Restore half (broken):**
- `useTimer.restore(savedState)` exists but is never called
- Mount effect reads `getActiveBrew()` and shows a "Resume brew?" dialog
- User clicks "Resume" → bean and recipe are restored, but timer starts at 0:00
- `tappedSteps` and `skippedSteps` are not initialized from saved state

The result: 210 localStorage writes per brew session that serve no purpose, plus a resume dialog that misleads the user into thinking their brew will be recovered.

## Root Cause

The persist path and restore path were implemented at different times (or by different agents) without verifying the round-trip. The `useTimer` hook was designed with both `getTimerState()` and `restore()` APIs, but the component that orchestrates them (BrewScreen) only called the save side.

This is a common pattern when building crash recovery incrementally: the save logic is easy to add (just write state), but the restore logic requires careful coordination between multiple components (timer, steps, phase, bean selection).

## Solution

### Rule: Never ship a save path without verifying the restore path works

Before merging persistence code, always verify the round trip:
1. Start the feature (begin a brew)
2. Force-refresh the page
3. Confirm the resume dialog appears
4. Confirm the feature actually resumes from where it was

### If the restore path is too complex for this sprint:

Remove the save path entirely. Don't persist and don't show a resume dialog. The user experience of "no crash recovery" is better than "promises crash recovery but doesn't deliver."

### Implementation pattern for localStorage crash recovery:

```jsx
// Save: write state at meaningful moments (not every tick)
const persistBrewState = useCallback(() => {
  saveActiveBrew({
    timerState: timer.getTimerState(),
    tappedSteps,
    skippedSteps,
    recipe,
    beanId: selectedBean?.id,
  })
}, [timer, tappedSteps, skippedSteps, recipe, selectedBean])

// Trigger saves on user actions, not timer ticks
const handleTapStep = (step) => { /* ... */ persistBrewState() }
const handleSkipStep = (step) => { /* ... */ persistBrewState() }
const handlePause = () => { timer.pause(); persistBrewState() }

// Restore: pass saved state to child components as initial props
useEffect(() => {
  const saved = getActiveBrew()
  if (saved) {
    setSelectedBean(findBean(saved.beanId))
    setRecipe(saved.recipe)
    setInitialBrewState(saved) // pass to ActiveBrew
    setPhase('brew')
  }
}, [])

// In ActiveBrew:
useEffect(() => {
  if (initialBrewState) {
    timer.restore(initialBrewState.timerState)
    setTappedSteps(initialBrewState.tappedSteps)
    setSkippedSteps(initialBrewState.skippedSteps)
  }
}, []) // mount only
```

## Checklist for Persist/Restore Features

- [ ] Save path writes at meaningful moments (not every render tick)
- [ ] Restore path reads on mount and initializes ALL relevant state
- [ ] Round-trip verified manually: start → refresh → resume → state matches
- [ ] Cleanup: `clearActiveBrew()` called after successful commit
- [ ] Edge case: very old saved state (> 1 hour) is discarded, not restored
