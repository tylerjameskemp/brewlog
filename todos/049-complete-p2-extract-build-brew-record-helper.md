---
status: complete
priority: p2
issue_id: "049"
tags: [code-review, duplication, brewscreen, architecture]
dependencies: []
---

# Extract buildBrewRecord helper to deduplicate handleFinishBrew / handleLogWithoutTimer

## Problem Statement

`handleFinishBrew` (lines 1428-1509) and `handleLogWithoutTimer` (lines 1512-1573) in BrewScreen.jsx share ~90% identical code. The `recipeSnapshot` construction is copy-pasted verbatim (15 lines). The full brew record construction differs only in `isManualEntry`, `totalTime`, `stepResults`, and `timeStatus`. If a new field is added to the brew schema, both functions must be updated — a maintenance hazard.

## Findings

**Agents that flagged this:** Architecture Strategist (High priority), Code Simplicity (Priority 1), Pattern Recognition (Medium)

~50-70 lines of duplicated brew record construction code.

## Proposed Solutions

Extract a `buildBrewRecord(recipe, selectedBean, overrides)` helper:

```js
const buildBrewRecord = (overrides = {}) => {
  const totalDuration = getTotalDuration(recipe.steps)
  return {
    id: uuidv4(),
    schemaVersion: 2,
    beanName: selectedBean.name.trim(),
    roaster: selectedBean.roaster || '',
    roastDate: selectedBean.roastDate || '',
    recipeSnapshot: { ...recipe, steps: structuredClone(recipe.steps) },
    coffeeGrams: recipe.coffeeGrams,
    // ... all shared fields ...
    brewedAt: new Date().toISOString(),
    ...overrides,
  }
}
```

Both callers become ~5 lines passing only their unique fields.

- **Effort:** Medium (~50 LOC saved)
- **Risk:** Low — purely mechanical extraction

## Acceptance Criteria

- [ ] Single `buildBrewRecord` helper used by both `handleFinishBrew` and `handleLogWithoutTimer`
- [ ] No duplicated `recipeSnapshot` construction
- [ ] Both brew paths produce identical records except for their documented differences
- [ ] Tests still pass, build clean
