---
status: complete
priority: p2
issue_id: "084"
tags: [code-review, data-integrity, race-condition, recipe-entity]
dependencies: []
---

# No Double-Tap Guard on handleFinishBrew/handleLogWithoutTimer

## Problem Statement

`handleFinishBrew` and `handleLogWithoutTimer` in BrewScreen.jsx have no `savingRef` guard to prevent double invocation from rapid taps. If the event fires twice before React processes the state update, duplicate brews and duplicate recipes could be created.

## Findings

- RateThisBrew.handleDone (~line 1115) has `savingRef` guard — existing pattern
- handleFinishBrew (~line 1593) and handleLogWithoutTimer (~line 1631) lack this guard
- linkRecipeToBrew calls saveRecipe which creates a new recipe — two calls = two recipes
- saveBrew creates a new brew — two calls = two brews with different IDs
- Risk is low (UI transitions away immediately) but non-zero for fast taps

## Proposed Solutions

### Option A: Add savingRef guard (recommended)
Add `const savingRef = useRef(false)` and check at the top of both handlers:
```js
if (savingRef.current) return
savingRef.current = true
```
- **Pros:** Matches existing RateThisBrew pattern, prevents duplicates
- **Cons:** None
- **Effort:** Small (4 lines)
