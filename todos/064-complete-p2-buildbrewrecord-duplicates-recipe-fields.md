---
status: complete
priority: p2
issue_id: "064"
tags: [code-review, simplicity, duplication]
dependencies: []
---

# buildBrewRecord Duplicates 14 Recipe Fields Between recipeSnapshot and Top-Level

## Problem Statement

`buildBrewRecord` writes the same 14 recipe fields in two places: once inside `recipeSnapshot` and once at the top level of the brew record. This duplication means any new recipe field must be added in two places, and the two copies can drift out of sync.

## Findings

- Duplicated fields: `coffeeGrams`, `waterGrams`, `grindSetting`, `waterTemp`, `targetTime`, `targetTimeRange`, `targetTimeMin`, `targetTimeMax`, `steps`/`recipeSteps`, `pourTemplateId`, `method`, `grinder`, `dripper`, `filterType`
- The top-level fields exist for backward compatibility with BrewHistory/BrewTrends/BrewForm which read `brew.coffeeGrams` etc.
- The `recipeSnapshot` is the canonical source — top-level fields are convenience copies
- A future cleanup could make readers use `brew.recipeSnapshot.coffeeGrams` and drop the top-level duplication

## Proposed Solutions

### Option A: Generate top-level fields from recipeSnapshot (DRY)
```javascript
const recipeSnapshot = { ...recipeFields }
return {
  ...recipeSnapshot, // spread into top-level
  recipeSnapshot,    // also store as nested
  ...otherFields,
  ...overrides,
}
```
- **Pros:** Single source of truth, fewer lines
- **Cons:** Implicit — harder to see what fields are on the brew record
- **Effort:** Small
- **Risk:** Low

### Option B: Leave as-is, document the duplication
- **Pros:** Explicit, easy to understand
- **Cons:** Maintenance burden, drift risk
- **Effort:** None
- **Risk:** Low (current state works)

## Technical Details

**Affected files:** `src/components/BrewScreen.jsx` (buildBrewRecord, ~line 1400-1445)

## Acceptance Criteria

- [ ] Recipe fields exist in both recipeSnapshot and top-level (backward compat)
- [ ] No field drift between the two locations
- [ ] Existing tests pass
