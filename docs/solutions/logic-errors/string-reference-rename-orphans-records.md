---
title: "String-based entity references orphan records on rename"
category: logic-errors
tags: [data-integrity, rename-cascade, string-references, localStorage, react]
module: BeanLibrary, storage
symptoms:
  - Renaming an entity silently disconnects related records
  - Brew counts drop to zero after editing a bean name
  - Historical records reference a name that no longer exists
date: 2026-02-23
severity: P1
---

# String-based entity references orphan records on rename

## Problem Statement

When two entity types reference each other by **name string** instead of by ID, renaming one entity silently orphans all related records. The related records still carry the old name and no longer match.

In BrewLog, brews store `beanName` as a plain string (e.g., `"Heart Columbia Javier Omar"`). When a user renames a bean in the Bean Library, all historical brew records still point to the old name. The brew count drops to zero and the brews become invisible under that bean — even though they still exist in localStorage.

## Root Cause

The architecture uses string names as implicit foreign keys:

```
Bean record:  { id: "uuid-1", name: "Heart Columbia" }
Brew record:  { id: "uuid-2", beanName: "Heart Columbia" }
                                ^^^^^^^^
                                This is the "join" — a raw string, not an ID
```

When `bean.name` changes to `"Heart Colombia"`, all brews with `beanName: "Heart Columbia"` become orphaned. There is no referential integrity enforcement in localStorage.

## Solution

### 1. Add a cascade function in the storage layer

`src/data/storage.js`:

```js
export function renameBrewBean(oldName, newName) {
  const brews = getBrews()
  let changed = false
  brews.forEach(b => {
    if (b.beanName === oldName) {
      b.beanName = newName
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}
```

### 2. Call it from the rename handler

`src/components/BeanLibrary.jsx`:

```jsx
const handleSaveBean = (formData) => {
  if (editingBean) {
    if (editingBean.name !== formData.name) {
      const updatedBrews = renameBrewBean(editingBean.name, formData.name)
      onBrewsChange(updatedBrews)  // sync React state
    }
    const updated = updateBean(editingBean.id, formData)
    setBeans(updated)
  }
  // ...
}
```

### 3. Wire the callback from the parent

`src/App.jsx`:

```jsx
<BeanLibrary
  beans={beans}
  setBeans={setBeans}
  brews={brews}
  onBrewsChange={setBrews}  // needed so cascade updates React state
/>
```

## Gotcha: Normalization mismatch

The cascade function must use the **same normalization** as the display layer. If the UI matches beans to brews using `trim().toLowerCase()` but the cascade uses exact `===`, brews with whitespace or casing differences will be silently skipped.

```js
// BAD — exact match misses " Heart Columbia " or "heart columbia"
if (b.beanName === oldName)

// GOOD — matches the same way the display layer does
if (b.beanName?.trim().toLowerCase() === oldName.trim().toLowerCase())
```

This was caught in a second code review after the initial fix shipped. The display looked correct (normalized matching showed the right counts) but the write path still used exact matching.

## Prevention

1. **Prefer ID-based references.** Store `beanId` (UUID) in brew records instead of `beanName`. Renaming the bean then has zero impact on brews. This eliminates the entire class of bug.

2. **If using string references, centralize normalization.** Create a single `normalizeName()` function and use it everywhere — reads, writes, comparisons, cascades.

3. **Audit all reference points when adding rename/delete.** When you add the ability to rename or delete an entity, grep the codebase for every place that references it. Each reference site needs either a cascade (rename) or an explicit decision about what happens (delete).

4. **Write path must match read path.** If your display layer normalizes before comparing, your mutation layer must normalize the same way. Otherwise the UI will show data that the write path can't find.

## Affected Files

| File | Role |
|------|------|
| `src/data/storage.js` | `renameBrewBean()` — cascade function |
| `src/components/BeanLibrary.jsx` | `handleSaveBean()` — calls cascade on name change |
| `src/App.jsx` | Passes `onBrewsChange={setBrews}` prop |

## Related

- PR #2: fix(beans): Address code review findings (P1 + P2)
- Plan: `docs/plans/2026-02-23-feat-bean-library-tab-plan.md`
- Future consideration: Migrate to ID-based bean-to-brew linking (documented in plan as out-of-scope)
