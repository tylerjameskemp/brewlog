---
title: "Enforce uniqueness in storage layer, not callers"
category: logic-errors
tags: [deduplication, data-integrity, localStorage, single-source-of-truth, normalization]
module: storage, BeanLibrary, BrewForm
symptoms:
  - Duplicate entries appear in a list despite caller-side checks
  - Same entity shows up multiple times with different casing or whitespace
  - Multiple callers implement the same validation differently
date: 2026-02-24
severity: P1
---

# Enforce uniqueness in storage layer, not callers

## Problem Statement

The bean library showed 3 duplicate entries for "Romero Red Bourbon" each claiming 7 brews. The dedup check only existed in one caller (`BrewForm.handleSave`), while another caller (`BeanLibrary.handleSaveBean`) bypassed it entirely.

## Root Cause

`saveBean()` in `storage.js` blindly prepended new beans with no uniqueness check:

```javascript
// BAD: No dedup — trusts callers to check
export function saveBean(bean) {
  const beans = getBeans()
  beans.unshift(bean)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}
```

The only dedup guard was in `BrewForm.handleSave`, which checked the `beans` React prop. But `BeanLibrary.handleSaveBean` called `saveBean()` directly with only a warning (not a block) for duplicates. Two callers, two different behaviors, one broken invariant.

Additional issue: bean names were stored untrimmed (`form.beanName` instead of `form.beanName.trim()`), so "Heart Colombia" and "Heart Colombia " were treated as different beans.

## The Gotcha

**Dedup logic in callers is insufficient.** Any new caller that forgets the check creates duplicates. The invariant ("one bean per normalized name") must be enforced at the lowest layer — the storage function itself.

**Name normalization must be consistent.** If you normalize for comparison (`trim().toLowerCase()`) but store the raw value, the data and the logic disagree. Store the normalized value.

## Solution

### 1. Add dedup to `saveBean()` itself

```javascript
export function saveBean(bean) {
  const beans = getBeans()
  const normalized = bean.name?.trim().toLowerCase()
  if (normalized && beans.some(b => b.name?.trim().toLowerCase() === normalized)) {
    return beans // Already exists, skip
  }
  beans.unshift(bean)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}
```

### 2. Clean existing duplicates on app load

```javascript
export function deduplicateBeans() {
  const beans = getBeans()
  const seen = new Set()
  const deduped = beans.filter(b => {
    const key = b.name?.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (deduped.length !== beans.length) {
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
  }
  return deduped
}
```

### 3. Store trimmed names

Override the untrimmed form value when constructing records:

```javascript
const trimmedName = form.beanName.trim()
const brew = { ...form, beanName: trimmedName }
const bean = { name: trimmedName }
```

### 4. Remove redundant caller-side checks

Once the storage layer enforces uniqueness, caller-side dedup checks are redundant. Remove them to keep one source of truth:

```javascript
// Before: redundant check + saveBean
if (trimmedName && !beans.find(b => ...)) {
  saveBean(newBean)
}

// After: just saveBean (it handles dedup internally)
if (trimmedName) {
  saveBean(newBean)
}
```

## Prevention

- **Enforce invariants at the storage layer**, not in callers. Every write function should validate its own constraints.
- **Use consistent normalization** for both comparison AND storage. A single `normalizeName()` helper prevents divergence.
- **When fixing duplicates, also clean existing data.** Prevention alone leaves historical duplicates in place.
- **Audit all callers** of a storage function when adding validation to it. Check that the change doesn't break any caller's expectations (e.g., silent rejection vs. throwing).

## Affected Files

- `src/data/storage.js` — `saveBean()` dedup, `deduplicateBeans()` helper
- `src/components/BrewForm.jsx` — trimmed name, removed redundant check
- `src/App.jsx` — lazy init with `deduplicateBeans()`

## Related

- PR #8: fix: Resolve 4 bugs
- `docs/solutions/logic-errors/string-reference-rename-orphans-records.md` — related normalization issue
- Plan: `docs/plans/2026-02-24-fix-four-bug-fixes-plan.md`
