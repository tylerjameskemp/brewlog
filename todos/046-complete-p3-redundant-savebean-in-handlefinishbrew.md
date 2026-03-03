---
status: complete
priority: p3
issue_id: "046"
tags: [code-review, simplification, brewscreen]
dependencies: []
---

# Redundant saveBean + setBeans in handleFinishBrew

## Problem Statement

`handleFinishBrew` calls `saveBean()` to re-save a bean that was already selected from the bean library (which means it already exists in storage). Per CLAUDE.md, `saveBean` deduplicates by normalized name, so this is a no-op for existing beans. The `setBeans(getBeans())` after it triggers an unnecessary re-render.

The bean is already persisted by BeanPicker selection. `handleBeanUpdate` on line 1217-1223 already persists bean field changes during the recipe phase.

**Location:** `src/components/BrewScreen.jsx` ~lines 1303-1313

## Proposed Solutions

Remove the `saveBean` block and the subsequent `setBeans(getBeans())` call.

- **Effort**: Small (remove ~10 lines)
- **Risk**: Low — bean is guaranteed to exist since BeanPicker only shows stored beans

## Acceptance Criteria

- [ ] `saveBean` block removed from `handleFinishBrew`
- [ ] `setBeans(getBeans())` removed from `handleFinishBrew`
- [ ] Tests pass, build clean

## Work Log

- 2026-03-03: Created from Phase 3 code review
