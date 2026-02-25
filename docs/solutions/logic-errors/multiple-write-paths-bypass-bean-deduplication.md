---
title: "Multiple write paths bypass bean name deduplication"
category: logic-errors
tags: [data-integrity, deduplication, localStorage, beans, normalization]
module: storage, BeanLibrary, BrewForm, App
symptoms:
  - Duplicate bean entries appear in the Bean Library
  - Bean autocomplete in BrewForm shows the same bean multiple times
  - Bean count in library grows unexpectedly after imports or renames
date: 2026-02-25
severity: P1
---

# Multiple write paths bypass bean name deduplication

## Problem Statement

Saving a brew created a new bean entry in the Bean Library even when a bean with the same name already existed. The Bean Library filled up with duplicates — especially after importing data or renaming beans. The deduplication logic in `saveBean()` worked correctly, but other code paths that write to `brewlog_beans` in localStorage did not apply the same normalization.

## Root Cause

Six code paths write to the `brewlog_beans` localStorage key. Only two of them performed name-based deduplication:

| Function | Dedup? | Issue |
|----------|--------|-------|
| `saveBean()` | Yes | Had `trim().toLowerCase()` check |
| `updateBean()` | **No** | Renaming a bean to an existing name created a collision |
| `deleteBean()` | N/A | Only removes, no dedup needed |
| `deduplicateBeans()` | Yes | Cleanup pass on app load |
| `mergeData()` | **No** | Only deduped by ID, not by name |
| `importData()` | N/A | Full replace mode, no dedup needed |

Two gaps allowed duplicates to enter:

1. **`updateBean()` had no merge logic.** Renaming "Heart Columbia" to "heart colombia" (a bean that already existed) created two beans with the same normalized name.

2. **`mergeData()` only deduped by ID.** Importing a backup where the same bean had a different UUID (common after a full replace + re-export cycle) would add it again even though a bean with that name already existed locally.

Additionally, `renameBrewBean()` used exact string matching (`===`) instead of normalized matching, so brew records with casing differences were silently skipped during rename cascades.

### Compounding factor: stranded fix

A previous fix for this issue (commit `68d24aa` on the `tylerjameskemp/doumentation` branch) contained the `updateBean()` merge logic and normalized `renameBrewBean()`, but only the docs portion of that branch was merged to main via PR #9. The code fix was left behind, making it appear the bug had been fixed when it hadn't.

## Solution

### 1. Add merge logic to `updateBean()`

When renaming a bean creates a name collision, remove the other bean instead of creating a duplicate:

```js
export function updateBean(id, updates) {
  const beans = getBeans()
  const index = beans.findIndex(b => b.id === id)
  if (index === -1) return beans

  beans[index] = { ...beans[index], ...updates }

  const newName = updates.name?.trim().toLowerCase()
  if (newName) {
    // Remove any OTHER bean with the same normalized name
    const deduped = beans.filter(b =>
      b.id === id || b.name?.trim().toLowerCase() !== newName
    )
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
    return deduped
  }

  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}
```

### 2. Normalize matching in `renameBrewBean()`

```js
export function renameBrewBean(oldName, newName) {
  const brews = getBrews()
  let changed = false
  const oldNorm = oldName.trim().toLowerCase()
  brews.forEach(b => {
    if (b.beanName?.trim().toLowerCase() === oldNorm) {
      b.beanName = newName.trim()
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}
```

### 3. Add name-based dedup to `mergeData()`

```js
if (data.beans && Array.isArray(data.beans)) {
  const existing = getBeans()
  const existingIds = new Set(existing.map(b => b.id))
  const existingNames = new Set(existing.map(b => b.name?.trim().toLowerCase()))
  const newBeans = data.beans.filter(b =>
    !existingIds.has(b.id) && !existingNames.has(b.name?.trim().toLowerCase())
  )
  if (newBeans.length > 0) {
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify([...existing, ...newBeans]))
  }
}
```

### 4. Fix `savingRef` reset in BrewForm

The `savingRef` double-tap guard was never reset to `false`, silently blocking all saves after the first one in a session:

```js
// In handleSave(), after all save logic:
savingRef.current = false
```

### 5. Use `deduplicateBeans()` after import

In `App.jsx`, the `onImportComplete` callback was calling `getBeans()` instead of `deduplicateBeans()`, meaning name-duplicates introduced by import merge weren't cleaned up until the next app load:

```jsx
onImportComplete={() => {
  setBrews(getBrews())
  setEquipment(getEquipment())
  setBeans(deduplicateBeans())  // was getBeans()
}}
```

## Key Insight: Audit All Write Paths

The fundamental pattern here is: **when you add dedup logic to one write path, you must audit every write path to the same storage key.** A single function having correct normalization is meaningless if other functions bypass it.

Checklist for any entity with a uniqueness constraint:

1. List every function that calls `localStorage.setItem()` for that key
2. Verify each one enforces the same normalization rules
3. Ensure the normalization function is centralized (not copy-pasted)
4. Test: create via path A, try to create duplicate via path B

## Prevention

1. **Centralize normalization.** Extract a `normalizeBean()` or `normalizeName()` function and use it in every write path. Don't rely on each function reimplementing `trim().toLowerCase()`.

2. **Audit all write paths when adding constraints.** When you add dedup to `saveBean()`, immediately check `updateBean()`, `mergeData()`, and any other path that touches the same key.

3. **Run `deduplicateBeans()` after any bulk operation.** Import, merge, and migration paths should all run the dedup cleanup as a safety net.

4. **Verify branch merges include code changes.** When a branch has both docs and code changes, verify the PR includes all files — not just the docs. The `git diff main..branch` output should match your expectations.

## Affected Files

| File | Change |
|------|--------|
| `src/data/storage.js` | `updateBean()` merge, `renameBrewBean()` normalization, `mergeData()` name dedup |
| `src/components/BrewForm.jsx` | `savingRef` reset after save |
| `src/App.jsx` | `onImportComplete` calls `deduplicateBeans()` |
| `src/components/BeanLibrary.jsx` | Updated duplicate warning text |

## Related

- [String-based entity references orphan records on rename](./string-reference-rename-orphans-records.md) — The companion bug: renaming without cascading. This doc covers the dedup side; that doc covers the cascade side. Together they represent the full set of string-reference hazards.
- PR #10: fix: Deduplicate beans across all write paths
- PR #8: fix: Resolve 4 bugs (duplicate beans, sort order, persistence, grind steps)
- PR #9: docs: Update README and CLAUDE.md (merged docs only — code fix was left behind)
