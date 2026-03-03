---
title: "Immediate save on finish, then rate — eliminates the data-loss window"
category: react-patterns
tags: [data-loss, save-flow, phase-machine, crash-recovery, brewscreen]
module: BrewScreen, RateThisBrew, ActiveBrew
symptoms:
  - "User loses brew data if they close the app during the post-brew screen"
  - "Tasting notes screen holds unsaved brew data for an unbounded amount of time"
  - "Crash during rating means the entire brew is lost"
  - "saveBrew and updateBrew responsibilities are tangled in one handler"
date: 2026-03-03
severity: P1
---

# Immediate save on finish, then rate — eliminates the data-loss window

## Problem

The original flow saved the brew only when the user completed the post-brew screen (`PostBrewCommit`). The full brew record — timer data, recipe, tasting notes — was assembled and written in a single `saveBrew()` call at the end:

```
brew → commit (assemble + rate + save) → success
```

This meant the brew existed only in component state (and crash-recovery localStorage) for the entire duration of rating. If the user:
- closed the tab during rating
- navigated away
- had the app crash after dismissing the recovery prompt

…the brew was lost. The data-loss window scaled with how long the user spent on tasting notes.

## Wrong Approach: Buffer Everything, Save Once

The `PostBrewCommit` component received raw timer data, recipe state, and bean info as props, then assembled the full brew record internally before saving. This created several problems:

1. **Unbounded data-loss window** — brew existed only in React state while user rated
2. **Fat component** — `PostBrewCommit` owned brew construction, tasting input, AND persistence
3. **Recovery was all-or-nothing** — crash recovery restored the timer state, but if the user had already finished timing and was mid-rating, there was no way to resume rating

## Right Approach: Save Immediately, Rate an Already-Saved Brew

Split the flow into two distinct save operations:

```
brew → [saveBrew()] → rate → [updateBrew()] → success
```

### Step 1: `handleFinishBrew` saves immediately

When the user taps "Finish Brew", the handler constructs the full brew record with empty tasting fields and saves it to localStorage in the same tick:

```jsx
const handleFinishBrew = useCallback((data) => {
  const brew = {
    id: uuidv4(),
    // ... recipe data, timer data, stepResults ...
    recipeSnapshot,           // frozen planned recipe
    totalTime: elapsed,       // actual time from timer
    flavors: [], body: '', rating: null,  // empty tasting fields
    issues: [], notes: '', nextBrewChanges: '',
  }

  const updatedBrews = saveBrew(brew)       // persisted NOW
  onBrewSaved(updatedBrews)

  saveActiveBrew({ phase: 'rate', brewId: brew.id, ... })
  setRatingBrew(brew)
  setPhase('rate')
}, [recipe, selectedBean, equipment, onBrewSaved])
```

### Step 2: `RateThisBrew` edits the saved brew

The rating screen receives the already-saved brew. On "Done", it calls `updateBrew()` to merge tasting data:

```jsx
const handleDone = () => {
  if (savingRef.current) return
  savingRef.current = true
  const updates = { flavors, body, rating, issues, notes, nextBrewChanges, grindSetting }

  // Recompute timeStatus if user corrected totalTime
  if (parsedTime != null && parsedTime !== brew.totalTime) {
    updates.timeStatus = computeTimeStatus(parsedTime, ...).status
  }

  updateBrew(brew.id, updates)
  clearActiveBrew()
  onComplete()                              // → phase = 'success'
}
```

### Step 3: Crash recovery handles both phases

The recovery effect distinguishes brew-phase vs rate-phase crashes:

```jsx
useEffect(() => {
  const active = getActiveBrew()
  if (!active?.beanName) return

  if (active.phase === 'rate' && active.brewId) {
    // Brew already saved — silently resume rating (no confirm prompt)
    const brew = getBrews().find(b => b.id === active.brewId)
    if (brew) { setRatingBrew(brew); setPhase('rate') }
    else { clearActiveBrew() }              // brew was deleted externally
  } else {
    // Timer phase — prompt to resume (brew not yet saved)
    const resume = window.confirm(`Resume brew for ${active.beanName}?`)
    if (resume) { /* restore timer state */ }
    else { clearActiveBrew() }
  }
}, [])
```

## What This Pattern Gives You

| Before | After |
|--------|-------|
| Data-loss window = entire rating duration | Data-loss window = 0 (brew saved before rating) |
| Crash during rating = brew lost | Crash during rating = silently resume, brew safe |
| PostBrewCommit owns construction + rating + save | handleFinishBrew owns construction; RateThisBrew owns rating |
| Recovery only for timer phase | Recovery for both timer and rating phases |
| `recipeSnapshot` impossible (no clear "planned vs actual" boundary) | `recipeSnapshot` frozen at finish; top-level fields are correctable actuals |

## The `recipeSnapshot` Bonus

Saving at "Finish Brew" creates a natural boundary for freezing the planned recipe. The `recipeSnapshot` captures what was planned; top-level fields (`coffeeGrams`, `grindSetting`, `totalTime`) are the actuals that the user can correct during rating. This separation would have been awkward in a single-save model where planned and actual values were assembled together.

## Rule

**Save domain data at the earliest moment it's complete. Post-save screens should edit the saved record, not buffer unsaved state.**

Signs you need this pattern:
- A screen holds assembled domain data in component state for an extended user interaction
- Crash recovery can't distinguish "data exists but is incomplete" from "data was never saved"
- A component is responsible for both constructing and enriching a record

## Related

- `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md` — The `rate → success` transition uses formal phases
- `docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md` — Active brew persistence/recovery
- `todos/040-complete-p2-phase3-zero-test-coverage.md` — Tests covering rate-phase recovery
