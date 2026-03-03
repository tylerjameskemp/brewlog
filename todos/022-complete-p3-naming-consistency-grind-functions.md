---
status: pending
priority: p3
issue_id: "022"
tags: [code-review, naming, defaults]
dependencies: []
---

# Naming Inconsistency: `grindToNumeric` vs `numericToGrindNotation`

## Problem Statement

The two conversion functions in `defaults.js` have asymmetric naming:
- `grindToNumeric(setting)` — converts notation to number
- `numericToGrindNotation(numeric, grinder)` — converts number to notation

The mismatch (`grindTo*` vs `numericTo*`) makes the API harder to discover. A consistent pattern would be either `grindNotationToNumeric`/`numericToGrindNotation` or `grindToNumeric`/`numericToGrind`.

## Proposed Solutions

### Solution A: Rename to consistent pair

`grindNotationToNumeric()` / `numericToGrindNotation()` — both clearly describe direction.

**Pros:** Consistent, discoverable
**Cons:** Rename churn across consumers
**Effort:** Small
**Risk:** None

## Technical Details

**Affected files:** `src/data/defaults.js` (definition), consumers in BrewHistory.jsx, BrewTrends.jsx

## Acceptance Criteria

- [ ] Both functions follow consistent `XToY` / `YToX` naming pattern
- [ ] All import sites updated
