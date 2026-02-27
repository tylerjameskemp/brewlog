---
status: complete
priority: p1
issue_id: "023"
tags: [code-review, brewscreen, bug]
---

# Timer Restore Persisted But Never Restored

## Problem Statement

The BrewScreen persists timer state to localStorage every second (via `persistState` effect) and shows a "Resume brew?" dialog on mount, but never actually restores the timer. After clicking "Resume", the timer starts at 0:00 instead of where it left off. `tappedSteps` and `skippedSteps` from the saved state are also lost.

This creates a broken user experience: the app promises crash recovery but doesn't deliver.

## Findings

- `useTimer.restore()` exists (useTimer.js:46-57) but is never called
- BrewScreen mount effect (BrewScreen.jsx:1022-1038) restores bean + recipe but not timer
- Comment on line 1033 says "Timer restore happens inside ActiveBrew" — but it doesn't
- `persistState` effect fires every second (BrewScreen.jsx:479-487), writing timer state that is never consumed

## Proposed Solutions

### Option A: Wire up the restore flow end-to-end
- Pass saved active brew state as a prop to ActiveBrew
- In ActiveBrew, call `timer.restore(savedState.timerState)` on mount
- Initialize `tappedSteps` and `skippedSteps` from saved state
- Pros: Feature works as intended; crash recovery is valuable for brew-station use
- Cons: Medium effort; must handle edge cases (very old saved state, corrupted data)
- Effort: Medium

### Option B: Remove persistence and resume entirely
- Remove the `persistState` effect (saves 210 localStorage writes per brew)
- Remove the `getActiveBrew` check on mount
- Remove `useTimer.restore()` and `getTimerState()`
- Pros: Eliminates dead code and the 1Hz localStorage write storm
- Cons: Loses crash recovery feature; accidental refreshes lose brew progress
- Effort: Small

## Acceptance Criteria

- [ ] Either: resuming a brew restores the timer to the correct elapsed time, with tapped/skipped steps intact
- [ ] Or: no resume dialog appears, no timer state is persisted

## Work Log

- 2026-02-27: Identified during code review
