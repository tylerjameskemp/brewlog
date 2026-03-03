---
status: complete
priority: p2
issue_id: "040"
tags: [code-review, testing, brewscreen, phase3]
dependencies: []
---

# Phase 3 has zero test coverage

## Problem Statement

Phase 3 restructures the core brew lifecycle (the most critical user flow) but adds no tests. Phases 1 and 2 each had test follow-up commits (34 and 10 tests respectively). Phase 3 introduces `handleFinishBrew`, `RateThisBrew`, `recipeSnapshot` construction, and crash-recovery during the `rate` phase — all untested.

## Findings

- **Git History Analyzer**: "Before this branch merges, Phase 3 needs a test follow-up commit covering the RateThisBrew flow, recipeSnapshot construction, and crash-recovery during the rate phase."
- **Pattern Recognition**: Confirmed all new code paths are currently unverified by automated tests.

## Proposed Solutions

### Option A: Unit tests for storage-level operations (Recommended)

Test `updateBrew()`, `computeTimeStatus()` recomputation, and active brew persistence/recovery with `phase: 'rate'` scenarios.

- **Effort**: Small
- **Risk**: Low
- **Pros**: Uses existing Vitest infrastructure, tests data layer which is most critical
- **Cons**: Doesn't test React component behavior directly

### Option B: Component-level tests with React Testing Library

Add RTL to test `RateThisBrew` rendering, form interactions, and `handleDone` flow.

- **Effort**: Medium (requires adding RTL dependency)
- **Risk**: Low
- **Pros**: Tests the full component interaction
- **Cons**: More infrastructure needed, slower tests

## Acceptance Criteria

- [ ] `updateBrew()` tested with partial updates (tasting data merge)
- [ ] `computeTimeStatus()` recomputation tested when totalTime changes
- [ ] Active brew persistence with `phase: 'rate'` + `brewId` tested
- [ ] Recovery path tested: rate-phase recovery finds brew by ID
- [ ] Recovery path tested: rate-phase recovery handles missing brew gracefully

## Work Log

- 2026-03-03: Created from Phase 3 code review
