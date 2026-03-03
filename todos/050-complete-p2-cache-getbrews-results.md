---
status: complete
priority: p2
issue_id: "050"
tags: [code-review, performance, storage]
dependencies: []
---

# Cache getBrews() results to avoid cascading JSON deserialization

## Problem Statement

`getBrews()` re-parses the entire localStorage JSON string and re-sorts the array on every call. It is called 4+ times during app init (once per migration plus final return), and by `getLastBrew()`, `getLastBrewOfBean()`, `saveBrew()`, `updateBrew()`, `deleteBrew()`, etc. At 100+ brews, this means parsing ~100KB of JSON 4+ times and creating 400+ Date objects, all blocking initial render.

## Findings

**Agent:** Performance Oracle (CRITICAL-1)

Projected impact:
- 100 brews: ~20-35ms during init
- 500 brews: ~100-200ms during init
- 1000 brews: ~250-500ms (poor first-paint on mobile)

Additional optimization: ISO 8601 strings are lexicographically sortable, so `new Date()` construction in the sort comparator can be replaced with `localeCompare`.

## Proposed Solutions

### Option A: Module-level cache with invalidation

```js
let _brewsCache = null
let _brewsCacheKey = null

export function getBrews() {
  const raw = localStorage.getItem(STORAGE_KEYS.BREWS)
  if (!raw) return []
  if (raw === _brewsCacheKey) return _brewsCache
  // ... parse, sort, cache ...
}

function invalidateBrewsCache() { _brewsCache = null; _brewsCacheKey = null }
```

Call `invalidateBrewsCache()` in write functions (`saveBrew`, `updateBrew`, `deleteBrew`, `renameBrewBean`, import/merge).

### Option B: Also encapsulate migration chain

Move migration chain into `runMigrations()` in storage.js, reducing App.jsx to `useState(() => runMigrations())`. Single read-mutate-write cycle instead of 4 passes.

- **Effort:** Medium (Option A: ~30 lines, Option B: ~50 lines)

## Acceptance Criteria

- [ ] `getBrews()` returns cached result when localStorage hasn't changed
- [ ] Write operations invalidate the cache
- [ ] Init performs at most 1 full JSON parse (not 4)
