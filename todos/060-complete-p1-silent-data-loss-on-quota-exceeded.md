---
status: complete
priority: p1
issue_id: "060"
tags: [code-review, data-integrity, storage, error-handling]
dependencies: []
---

# Silent Data Loss on localStorage Quota Exceeded

## Problem Statement

Phase 5 added try/catch around `localStorage.setItem` in `saveBrew`, `updateBrew`, `deleteBrew`, and `renameBrewBean`. However, the catch block only logs a warning — the function still returns `getBrews()` which reads the **old** (pre-write) data. The caller receives a stale brew list and believes the operation succeeded.

This means: user clicks "Finish Brew", gets the success screen, but the brew was never persisted. On refresh, the brew is gone with no indication it was lost.

## Findings

- `saveBrew` modifies the in-memory array, invalidates cache, then tries to write. On failure, it returns `getBrews()` which re-reads the **old** localStorage (write failed), but the caller receives this as if it were the new state
- The user sees the brew in the UI (it's in React state) until they refresh — then it vanishes
- Same pattern affects updateBrew, deleteBrew, renameBrewBean
- The cache invalidation before the failed write means the next `getBrews()` re-parses from localStorage (which has the old data)

## Proposed Solutions

### Option A: Return success/failure indicator
Change write functions to return `{ success: boolean, brews: array }`. Callers can show an error toast on failure.
- **Pros:** Explicit, lets UI show feedback
- **Cons:** Changes return signature (breaking change for all callers)
- **Effort:** Medium
- **Risk:** Medium (must update all callers)

### Option B: Throw on write failure
Let the error propagate. Add error boundaries or try/catch at the call sites in BrewScreen/BrewForm.
- **Pros:** Fail-fast, prevents false success state
- **Cons:** Requires error handling at every call site
- **Effort:** Medium
- **Risk:** Medium

### Option C: Show alert on catch + re-throw
In the catch block, `window.alert('Storage full — brew not saved')` then re-throw. Simple, visible, no caller changes.
- **Pros:** Minimal code change, user sees the error immediately
- **Cons:** Alert is blocking UX, not ideal
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A for proper UX, or Option C as a quick interim fix.

## Technical Details

**Affected files:** `src/data/storage.js` (saveBrew, updateBrew, deleteBrew, renameBrewBean)

## Acceptance Criteria

- [ ] User is informed when a write operation fails
- [ ] UI does not show false success state after a failed write
- [ ] Existing tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created from Phase 5 code review | Data integrity + architecture agents both flagged this |

## Resources

- Phase 5 Commit 5 added the try/catch: `src/data/storage.js`
