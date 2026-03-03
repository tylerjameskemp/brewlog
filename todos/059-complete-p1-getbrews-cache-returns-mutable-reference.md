---
status: complete
priority: p1
issue_id: "059"
tags: [code-review, performance, data-integrity, cache]
dependencies: []
---

# `getBrews()` Cache Returns Mutable Reference

## Problem Statement

`getBrews()` in `storage.js` caches the parsed array at module level (`_brewsCache`) and returns it directly. Any caller that mutates the returned array (e.g., `brews.unshift(brew)` in `saveBrew`, or `.sort()`, `.filter()`) corrupts the cache for all subsequent readers until the next invalidation.

This is a data integrity risk — one mutation path that forgets to call `_invalidateBrewsCache()` first will silently corrupt all downstream reads.

## Findings

- `saveBrew` calls `_invalidateBrewsCache()` first, then `getBrews()`, then `brews.unshift(brew)` — safe because cache was just invalidated and re-read
- But if any new consumer calls `getBrews()` and mutates the result (e.g., `.filter()` is fine, `.sort()` in-place is not), the cache is corrupted
- `Object.freeze` would catch this in dev but break production write paths
- The standard fix is to return a shallow copy: `return [..._brewsCache]`

## Proposed Solutions

### Option A: Return shallow copy from getBrews()
Change `return _brewsCache` to `return [..._brewsCache]`. Callers get their own array. Cache stays pristine.
- **Pros:** Simple, defensive, zero risk of cache corruption
- **Cons:** Allocates a new array on every call (negligible for <1000 brews)
- **Effort:** Small
- **Risk:** Low

### Option B: Freeze cached array + fix write paths
`Object.freeze(_brewsCache)` and ensure all write paths create new arrays instead of mutating.
- **Pros:** Catches mutation bugs in dev
- **Cons:** Requires auditing all callers, more invasive
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

Option A — return shallow copy.

## Technical Details

**Affected files:** `src/data/storage.js` (getBrews function, ~line 78)

## Acceptance Criteria

- [ ] `getBrews()` returns a new array reference on each call
- [ ] Mutating the returned array does not affect subsequent `getBrews()` calls
- [ ] All existing tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created from Phase 5 code review | Cross-agent finding: performance + architecture + data-integrity agents all flagged this |

## Resources

- Phase 5 review: `docs/plans/2026-03-03-refactor-phase5-polish-acceptance-testing-plan.md`
