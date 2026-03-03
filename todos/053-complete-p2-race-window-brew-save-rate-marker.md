---
status: complete
priority: p2
issue_id: "053"
tags: [code-review, data-integrity, crash-recovery, brewscreen]
dependencies: []
---

# Race window between brew save and rate-phase marker can create duplicate brews

## Problem Statement

In `handleFinishBrew`, the brew is saved to localStorage (step 1) before the active brew marker is updated to `phase: 'rate'` (step 3). If the browser crashes between these two calls, the recovery logic finds the old timer-phase active brew marker and prompts "Resume brew in progress." The user re-runs the brew flow, calling `saveBrew()` again with a new UUID — creating a duplicate brew record.

## Findings

**Agent:** Data Integrity Guardian (MEDIUM, finding 2.2)

The sequence:
```js
const updatedBrews = saveBrew(brew)       // 1. Write to localStorage
onBrewSaved(updatedBrews)                  // 2. Update React state
saveActiveBrew({ phase: 'rate', ... })     // 3. Write rate-phase marker
```

Window between steps 1 and 3: brew saved, but active brew marker still says "timer phase."

## Proposed Solutions

Clear active brew state BEFORE saving, then set rate-phase marker:

```js
clearActiveBrew()                           // Clear timer-phase state
const updatedBrews = saveBrew(brew)
onBrewSaved(updatedBrews)
saveActiveBrew({ phase: 'rate', brewId: brew.id, ... })
```

Now if crash occurs after `clearActiveBrew` but before `saveBrew`, the brew is lost — but this is the same window that existed before. The key improvement: no crash path produces a duplicate.

- **Effort:** Small (reorder 2 lines)

## Acceptance Criteria

- [ ] No crash window can produce duplicate brew records
- [ ] Rate-phase recovery still works after reordering
