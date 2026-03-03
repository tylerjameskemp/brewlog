---
status: complete
priority: p2
issue_id: "068"
tags: [code-review, performance, cache]
dependencies: ["059"]
---

# saveBrew Invalidates Cache Then Immediately Re-reads

## Problem Statement

`saveBrew` calls `_invalidateBrewsCache()`, then `getBrews()` (which re-parses from localStorage), then mutates the array, writes back, and returns `getBrews()` (re-parses again). This means every save does 2 full JSON.parse operations on the entire brews array — defeating the purpose of caching.

## Findings

- Flow: `_invalidateBrewsCache()` → `getBrews()` [parse] → `unshift` → `setItem` → `return getBrews()` [parse again]
- The second `getBrews()` is needed because `setItem` may have failed (the cache was invalidated, so it re-reads from localStorage to get the "truth")
- For ~100 brews this is negligible, but the pattern is wasteful
- Same pattern in `updateBrew`, `deleteBrew`, `renameBrewBean`

## Proposed Solutions

### Option A: Update cache in-place after successful write
After `setItem` succeeds, set `_brewsCache = brews` and `_brewsCacheRaw = JSON.stringify(brews)` instead of re-reading.
- **Pros:** Zero re-parses on write, cache stays warm
- **Cons:** Must handle the failed-write case (cache should reflect localStorage truth)
- **Effort:** Small
- **Risk:** Low (tied to fixing todo 059 — mutable cache reference)

## Technical Details

**Affected files:** `src/data/storage.js` (saveBrew, updateBrew, deleteBrew, renameBrewBean)

## Acceptance Criteria

- [ ] Write operations don't re-parse the brews array unnecessarily
- [ ] Cache reflects actual persisted state after writes
- [ ] Existing tests pass
