---
status: complete
priority: p2
issue_id: "066"
tags: [code-review, data-integrity, logic-error]
dependencies: []
---

# buildRecipeFromBean Uses || Instead of ?? for Numeric Fields

## Problem Statement

In `buildRecipeFromBean` (~line 1348), fallback values use `||` instead of `??`. For numeric fields where `0` is a valid value (e.g., `waterTemp: 0` for cold brew, `targetTimeMin: 0`), `||` treats `0` as falsy and falls through to the default.

## Findings

- `coffeeGrams: lastBrew.coffeeGrams || 15` — if someone brewed with 0g (unlikely but possible in testing), falls through to 15
- `waterTemp: lastBrew.waterTemp || 200` — cold brew at 0°F would fall through to 200
- `targetTimeMin: lastBrew.targetTimeMin || null` — a target min of 0 seconds falls through to null
- The `||` to `??` change is the standard fix — `??` only falls through on `null`/`undefined`

## Proposed Solutions

### Option A: Replace || with ?? for numeric fields
```javascript
coffeeGrams: lastBrew.coffeeGrams ?? 15,
waterGrams: lastBrew.waterGrams ?? 240,
waterTemp: lastBrew.waterTemp ?? 200,
```
- **Pros:** Correct null handling, preserves 0 values
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Technical Details

**Affected files:** `src/components/BrewScreen.jsx` (buildRecipeFromBean, ~line 1348-1380)

## Acceptance Criteria

- [ ] Numeric fields with value 0 are preserved (not replaced by defaults)
- [ ] Null/undefined fields still get defaults
- [ ] Existing tests pass
