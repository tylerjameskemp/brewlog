---
status: complete
priority: p3
issue_id: "045"
tags: [code-review, dead-code, brewscreen]
dependencies: []
---

# Dead `setRecipe(active.recipe)` in rate-recovery path

## Problem Statement

In the crash recovery logic, the rate-phase branch calls `setRecipe(active.recipe)` but `RateThisBrew` never reads from the `recipe` state — it reads everything from the `brew` record prop. The `setRecipe` call is dead code in the rate-recovery path.

Similarly, `recipe` is persisted in the active brew during rate phase (`saveActiveBrew({ phase: 'rate', ..., recipe })`) but is only needed during brew-phase recovery (for timer/step restore). For rate-phase recovery, only `brewId` and `beanName` are needed.

**Location:** `src/components/BrewScreen.jsx` ~line 1343

## Proposed Solutions

1. Remove `setRecipe(active.recipe)` from the rate-recovery branch
2. Optionally, omit `recipe` from the rate-phase `saveActiveBrew` call (reduces localStorage footprint)

- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] No dead `setRecipe` call in rate-recovery path
- [ ] Tests pass, build clean

## Work Log

- 2026-03-03: Created from Phase 3 code review
