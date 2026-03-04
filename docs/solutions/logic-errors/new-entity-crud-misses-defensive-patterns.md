---
title: New Entity CRUD Misses Defensive Patterns from Existing Entities
category: logic-errors
module: storage
tags: [crud, defensive-programming, safeSetItem, entity-parity, recipe]
symptoms:
  - New CRUD functions silently fail on localStorage quota exceeded
  - Protected fields (id, FK) overwritable via spread operator
  - Return value conventions inconsistent between entities
  - Cascade operations proceed despite partial write failure
created: 2026-03-04
---

# New Entity CRUD Misses Defensive Patterns from Existing Entities

## Problem

When adding a new entity (Recipes) following the pattern of an existing entity (Brews), it's easy to copy the happy-path API shape but miss defensive patterns that were added to existing functions during later hardening passes. The original Brew CRUD went through multiple rounds of fixes (safeSetItem return checks, cache invalidation, mutable reference protection). The new Recipe CRUD replicated the initial shape but not the accumulated defenses.

## Symptoms

- `saveRecipe()` returned a recipe object even when `safeSetItem()` failed (quota exceeded)
- `updateRecipe()` allowed `id`, `beanId`, `createdAt` to be overwritten via `...updates` spread
- `archiveRecipesForBean()` returned `undefined` — no way for callers to detect failure
- `deleteBean()` cascade proceeded even if recipe archival failed
- Callers like `linkRecipeToBrew` stamped phantom `recipeId` on brew records pointing at non-persisted recipes

## Root Cause

The Recipe CRUD was written by reading the Brew CRUD *structure* (function signatures, localStorage read/write pattern) but not auditing every *defensive guard* that had been added over time. The Brew functions had accumulated `if (!safeSetItem(...))` checks, field pinning after spread, and boolean return values through prior bug fixes — but these weren't part of the visible "pattern" a developer would copy when creating a new entity.

## Solution

### 1. Check safeSetItem return in all write functions

```js
// Before — silent failure
safeSetItem(STORAGE_KEYS.RECIPES, JSON.stringify(all))
return newRecipe

// After — fail explicitly
if (!safeSetItem(STORAGE_KEYS.RECIPES, JSON.stringify(all))) return null
return newRecipe
```

### 2. Pin immutable fields after spread in update functions

```js
all[index] = {
  ...all[index],
  ...updates,
  id: all[index].id,           // prevent identity mutation
  beanId: all[index].beanId,   // prevent re-parenting
  createdAt: all[index].createdAt,
  version: (all[index].version || 1) + 1,
  updatedAt: new Date().toISOString(),
}
```

### 3. Return success indicator from cascade functions

```js
// Before — void return
export function archiveRecipesForBean(beanId) {
  // ...
  if (changed) safeSetItem(...)
}

// After — boolean return
export function archiveRecipesForBean(beanId) {
  // ...
  if (changed) return safeSetItem(...)
  return true
}
```

### 4. Check cascade success before proceeding

```js
export function deleteBean(id) {
  if (!archiveRecipesForBean(id)) return getBeans() // abort
  // ... proceed with bean deletion
}
```

## Prevention

**When adding a new entity's CRUD functions, audit the existing entity's functions for:**

1. **Write safety** — Does every `safeSetItem` call check the return value?
2. **Field protection** — Does the update function pin immutable fields (`id`, FKs, `createdAt`) after the spread?
3. **Return conventions** — Does the function return `null` on failure so callers can detect it?
4. **Cascade safety** — Do multi-key operations check each step before proceeding?
5. **Cache invalidation** — If the existing entity has a cache, does the new one need one too?

**Checklist for new entity CRUD:**

- [ ] `save[Entity]` checks `safeSetItem` return, returns `null` on failure
- [ ] `update[Entity]` pins `id` and FKs after spread, checks write return
- [ ] Cascade/bulk functions return boolean success indicator
- [ ] Callers handle `null` returns (don't assume success)
- [ ] Import/merge paths include the new entity with validation

## Related

- `docs/solutions/logic-errors/multiple-write-paths-bypass-bean-deduplication.md` — same-entity path consistency
- `docs/solutions/logic-errors/cache-mutation-breaks-sort-invariant.md` — cache pattern to replicate
- Todo #075 (resolved), #078 (resolved), #081 (resolved)
