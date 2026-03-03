---
title: "Cache mutation breaks sort invariant"
category: logic-errors
tags: [cache, sort-invariant, unshift, module-state, optimization]
module: storage
symptoms:
  - "getBrews() returns brews in wrong order after saveBrew()"
  - "Test 'returns brews sorted by brewedAt descending' fails with ['mid', 'new', 'old'] instead of ['new', 'mid', 'old']"
created: 2026-03-03
---

# Cache mutation breaks sort invariant

## Problem

The `getBrews()` function in `src/data/storage.js` guarantees brews are returned sorted by `brewedAt` descending. It enforces this with an explicit `.sort()` call every time it parses from localStorage. A module-level cache (`_brewsCache` / `_brewsCacheRaw`) avoids re-parsing JSON on repeated calls.

When optimizing write functions to populate the cache directly after successful writes (instead of invalidating and forcing a re-parse on the next read), `saveBrew()` used `Array.unshift()` to prepend the new brew at position 0. This assumed the newest brew always belongs at the front — but `brewedAt` is caller-controlled, not guaranteed to be "now". A brew with an older `brewedAt` value inserted via `unshift` would sit at position 0 despite not being the newest, breaking the sort invariant for all subsequent `getBrews()` calls that hit the cache.

## Symptoms

- `getBrews()` returns brews in insertion order instead of `brewedAt`-descending order.
- The test `'returns brews sorted by brewedAt descending'` fails: saves `old`, `new`, `mid` in that order and expects `['new', 'mid', 'old']` but gets `['mid', 'new', 'old']` (last-inserted first).
- Any consumer that relies on "first element is newest brew" gets stale or wrong data.

## Root Cause

Before the optimization, the write path was:

1. `_invalidateBrewsCache()` — clear cache
2. Mutate localStorage directly
3. Next `getBrews()` call re-parses JSON and re-sorts — invariant restored

After the optimization, the write path became:

1. `_invalidateBrewsCache()` — clear cache
2. `getBrews()` — re-parse (sorts correctly)
3. `brews.unshift(brew)` — prepend new brew at index 0 **without sorting**
4. Write to localStorage
5. `_setBrewsCache(brews, raw)` — cache the unsorted array

Step 3 is the bug. `unshift` assumes the new brew is always the newest, but the sort key (`brewedAt`) is an arbitrary ISO string set by the caller. The cache now holds an array that violates the sort guarantee, and all subsequent reads return the wrong order until the cache is invalidated.

## Solution

Replace `unshift` with `push` + `sort`. This maintains the sort invariant regardless of the new brew's `brewedAt` value.

```js
export function saveBrew(brew) {
  _invalidateBrewsCache()
  const brews = getBrews()
  brews.push(brew)
  brews.sort((a, b) => (b?.brewedAt || '').localeCompare(a?.brewedAt || ''))
  const raw = JSON.stringify(brews)
  if (!safeSetItem(STORAGE_KEYS.BREWS, raw)) {
    _invalidateBrewsCache()
    return getBrews()
  }
  _setBrewsCache(brews, raw)
  return [...brews]
}
```

The `_setBrewsCache` helper populates both `_brewsCache` and `_brewsCacheRaw` so subsequent `getBrews()` calls return the cached copy without re-parsing.

```js
function _setBrewsCache(brews, raw) {
  _brewsCache = brews
  _brewsCacheRaw = raw
}
```

## Code Examples

### Before — unshift breaks ordering

```js
export function saveBrew(brew) {
  _invalidateBrewsCache()
  const brews = getBrews()
  brews.unshift(brew)                // BUG: assumes brew is newest
  const raw = JSON.stringify(brews)
  localStorage.setItem(STORAGE_KEYS.BREWS, raw)
  _setBrewsCache(brews, raw)         // caches unsorted array
  return [...brews]
}
```

### After — push + sort preserves invariant

```js
export function saveBrew(brew) {
  _invalidateBrewsCache()
  const brews = getBrews()
  brews.push(brew)
  brews.sort((a, b) => (b?.brewedAt || '').localeCompare(a?.brewedAt || ''))
  const raw = JSON.stringify(brews)
  if (!safeSetItem(STORAGE_KEYS.BREWS, raw)) {
    _invalidateBrewsCache()
    return getBrews()
  }
  _setBrewsCache(brews, raw)
  return [...brews]
}
```

### Test that catches it

```js
it('returns brews sorted by brewedAt descending', () => {
  saveBrew({ id: 'old', beanName: 'Old', brewedAt: '2026-01-01T00:00:00Z' })
  saveBrew({ id: 'new', beanName: 'New', brewedAt: '2026-03-01T00:00:00Z' })
  saveBrew({ id: 'mid', beanName: 'Mid', brewedAt: '2026-02-01T00:00:00Z' })
  const brews = getBrews()
  expect(brews.map(b => b.id)).toEqual(['new', 'mid', 'old'])
})
```

## Prevention

1. **When populating a cache directly after a write, re-apply the same invariants the read path enforces.** If `getBrews()` sorts, then any function that updates `_brewsCache` must also sort. The cache is a mirror of the read path, not the write path.

2. **Never assume insertion position implies sort position.** `unshift` and `push` are insertion primitives — they say nothing about the sort key. If ordering matters, sort explicitly.

3. **Test insertion order independence.** The test that caught this bug inserts `old`, `new`, `mid` in a deliberately scrambled order. When writing tests for sorted collections, always insert out of order to verify the sort is enforced, not accidental.

4. **Treat module-level caches as having the same contract as the function that reads them.** `_brewsCache` is not "the raw data in localStorage" — it is "what `getBrews()` would return." Any code that writes to the cache must uphold that contract.

5. **Prefer invalidate-and-re-read over direct cache mutation when the invariant is complex.** Direct population is a valid optimization, but it shifts the burden of maintaining invariants from one function (`getBrews`) to every write function. If the invariant is non-trivial, the optimization may not be worth the risk.

## Related

- `docs/solutions/logic-errors/duplicated-computation-diverges-over-time.md` — similar class: optimization creates a second code path that diverges from the canonical one
- `docs/solutions/logic-errors/multiple-write-paths-bypass-bean-deduplication.md` — every write path must enforce the same constraints
- `src/data/storage.js` — module containing `getBrews()`, `saveBrew()`, and the cache machinery
- `src/data/__tests__/storage.test.js` — test suite with sort-order verification
