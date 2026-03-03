---
status: complete
priority: p1
issue_id: "062"
tags: [code-review, data-integrity, crash-recovery]
dependencies: []
---

# handleLogWithoutTimer Missing saveActiveBrew for Rate Phase Recovery

## Problem Statement

`handleFinishBrew` saves active brew state for rate-phase crash recovery:
```javascript
saveActiveBrew({ phase: 'rate', brewId: brew.id, beanName: selectedBean.name, recipe })
```

But `handleLogWithoutTimer` does NOT call `saveActiveBrew`. If the user logs a brew without timer, enters the rate phase, and the browser crashes, the rate phase is lost — they can't resume rating. The brew record itself is saved (saveBrew was called), but the user has no way to know they were in the middle of rating it.

## Findings

- `handleFinishBrew` (~line 1477): calls `saveActiveBrew({ phase: 'rate', ... })` after `saveBrew`
- `handleLogWithoutTimer` (~line 1512): calls `saveBrew` but never `saveActiveBrew`
- Phase 5 acceptance Test E specifically tests rate-phase crash recovery — but only for timed brews
- The fix is a one-line addition

## Proposed Solutions

### Option A: Add saveActiveBrew call to handleLogWithoutTimer
```javascript
const handleLogWithoutTimer = useCallback(() => {
  const brew = buildBrewRecord({ isManualEntry: true })
  const updatedBrews = saveBrew(brew)
  onBrewSaved(updatedBrews)
  saveActiveBrew({ phase: 'rate', brewId: brew.id, beanName: selectedBean.name, recipe })
  setRatingBrew(brew)
  setSavedBrewState(null)
  setPhase('rate')
}, [buildBrewRecord, onBrewSaved, selectedBean, recipe])
```
- **Pros:** Parity with handleFinishBrew, one-line fix
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A.

## Technical Details

**Affected files:** `src/components/BrewScreen.jsx` (handleLogWithoutTimer, ~line 1512)

## Acceptance Criteria

- [ ] Skip-timer brew → rate phase → crash → reopen → rate phase resumes
- [ ] Existing tests pass
- [ ] Test E (crash recovery) passes for both timed and skip-timer flows

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created from Phase 5 code review | Data integrity agent flagged this |

## Resources

- BrewScreen.jsx handleFinishBrew (has the pattern): ~line 1477
- BrewScreen.jsx handleLogWithoutTimer (missing it): ~line 1512
