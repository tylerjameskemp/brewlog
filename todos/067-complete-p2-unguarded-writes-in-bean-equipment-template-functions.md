---
status: complete
priority: p2
issue_id: "067"
tags: [code-review, data-integrity, error-handling, storage]
dependencies: ["060"]
---

# Unguarded localStorage Writes in Bean, Equipment, and Template Functions

## Problem Statement

Phase 5 added try/catch to brew-related write functions (saveBrew, updateBrew, deleteBrew, renameBrewBean), but other write functions remain unguarded: `saveBean`, `updateBean`, `deleteBean`, `saveEquipment`, `savePourTemplate`, `updatePourTemplate`, `deletePourTemplate`, `setUIPref`, `saveActiveBrew`, `clearActiveBrew`.

A quota exceeded error in any of these crashes the calling component.

## Findings

- 11 additional `localStorage.setItem` calls lack try/catch
- `saveActiveBrew` is called every 5 seconds during timer + on every step tap — high frequency, higher chance of hitting quota
- `setUIPref` is called on dismissible hints — not critical data but still crashes
- Same pattern as the brew functions — wrap in try/catch, log warning

## Proposed Solutions

### Option A: Add try/catch to all remaining write functions
Same pattern as Phase 5 commit 5 — wrap setItem, log warning.
- **Pros:** Consistent error handling across all write paths
- **Cons:** Still has the silent-data-loss issue (see todo 060)
- **Effort:** Small
- **Risk:** Low

### Option B: Extract a safe setItem wrapper
```javascript
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) }
  catch (e) { console.warn(`Storage write failed for ${key}:`, e) }
}
```
Then use `safeSetItem` everywhere.
- **Pros:** DRY, consistent, single place to add error reporting later
- **Cons:** Adds indirection
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option B — extract wrapper, then apply todo 060's solution to the wrapper.

## Technical Details

**Affected files:** `src/data/storage.js` (11 functions with unguarded setItem calls)

## Acceptance Criteria

- [ ] All localStorage.setItem calls are wrapped in try/catch
- [ ] No unhandled exceptions from quota errors
- [ ] Existing tests pass
