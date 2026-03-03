---
status: complete
priority: p3
issue_id: "043"
tags: [code-review, convention, brewscreen]
dependencies: []
---

# Mixed null-check convention for tappedAt across pre/post-save contexts

## Problem Statement

`handleFinishBrew` converts `undefined` tappedAt values to `null` in stepResults. This creates a two-convention codebase:

- **Pre-save** (ActiveBrew): checks `!== undefined` because raw tappedSteps has missing keys as `undefined`
- **Post-save** (RateThisBrew): checks `!= null` because stepResults normalize to `null`

Functionally correct but undocumented. A future developer reading ActiveBrew would use `!== undefined` when reading stepResults, which would miss `null` values.

## Proposed Solutions

Standardize on `!= null` (loose equality) everywhere — it catches both `null` and `undefined` and is more defensive. Or add a code comment explaining the convention.

- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] Either consistent null-check style or documented convention

## Work Log

- 2026-03-03: Created from Phase 3 code review
