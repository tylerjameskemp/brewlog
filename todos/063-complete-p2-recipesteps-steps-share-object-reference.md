---
status: complete
priority: p2
issue_id: "063"
tags: [code-review, data-integrity, aliasing]
dependencies: []
---

# recipeSteps and steps Share Same Object Reference in buildBrewRecord

## Problem Statement

In `buildBrewRecord`, both `recipeSteps: recipe.steps` and `steps: recipe.steps` point to the same array object. If any code later mutates one (e.g., pushing an element, changing a step's `waterTo`), both fields change. The `recipeSnapshot.steps` uses `structuredClone` correctly, but the top-level fields don't.

## Findings

- `buildBrewRecord` line ~1434: `recipeSteps: recipe.steps` and `steps: recipe.steps` — same reference
- `recipeSnapshot.steps` uses `structuredClone(recipe.steps)` — correctly cloned
- Currently no code mutates these after creation, but it's a latent bug waiting for any future code that modifies steps on a brew record
- The `stepResults` field is fine (it's a new object built from scratch)

## Proposed Solutions

### Option A: Clone steps in buildBrewRecord
```javascript
recipeSteps: recipe.steps,
steps: [...recipe.steps.map(s => ({...s}))],
```
- **Pros:** Prevents aliasing, safe for future mutations
- **Cons:** Minor allocation cost
- **Effort:** Small
- **Risk:** Low

## Technical Details

**Affected files:** `src/components/BrewScreen.jsx` (buildBrewRecord, ~line 1430)

## Acceptance Criteria

- [ ] `brew.recipeSteps` and `brew.steps` are different object references
- [ ] Mutating one does not affect the other
- [ ] Existing tests pass
