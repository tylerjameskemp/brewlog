---
status: pending
priority: p2
issue_id: "035"
tags: [code-review, performance, state-management, brewscreen]
dependencies: []
---

# Per-keystroke localStorage writes in handleBeanUpdate

## Problem Statement

`handleBeanUpdate` writes to localStorage and triggers a full App re-render on every character typed in the origin card inputs (origin, process, roaster). Each keystroke:
1. Calls `updateBean()` — reads localStorage, modifies array, writes back
2. Calls `getBeans()` — reads localStorage again
3. Calls `setBeans()` — re-renders App and all children

This creates 2 localStorage reads + 1 write per keystroke, plus a full component tree re-render cascade. On mobile devices, this can cause input lag during fast typing.

Additionally, edits persist immediately with no cancel path — if the user edits a bean's origin and then hits the back button, the change is already saved.

## Findings

- **Simplicity reviewer**: Flagged per-keystroke writes; recommended deferring persist to "Done" toggle
- **Architecture reviewer**: Flagged stale closure on `selectedBean`, missing cancel path, and violation of BeanLibrary as primary bean write path
- **Performance reviewer**: Confirmed this is the only genuine performance issue; recommended debouncing
- **Pattern reviewer**: Noted deviation from BeanLibrary's pattern of using `updateBean()` return value

## Proposed Solutions

### Option A: Batch on "Done" (Recommended)
Buffer edits in local RecipeAssembly state. Persist once when editing toggles off.
- **Pros**: No per-keystroke writes, clean cancel path, single write point
- **Cons**: Slightly more complex state management in RecipeAssembly
- **Effort**: Small
- **Risk**: Low

### Option B: Debounce persistence (400ms)
Keep immediate UI updates via `setSelectedBean`, debounce the `updateBean` + `setBeans` calls.
- **Pros**: Simple to implement, reduces writes from N to ~3 per edit session
- **Cons**: Still no cancel path, still a second write path for beans
- **Effort**: Small
- **Risk**: Low

## Technical Details

- **File**: `src/components/BrewScreen.jsx` lines 1080-1086
- **Affected components**: RecipeAssembly origin card, BrewScreen, App (via re-render cascade)

## Acceptance Criteria

- [ ] Typing in origin/process/roaster inputs does NOT trigger localStorage writes per keystroke
- [ ] Bean edits persist at a well-defined moment (Done button or phase transition)
- [ ] No input lag on mobile during text editing

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created from multi-agent code review | All 4 code agents flagged this independently |
