---
status: complete
priority: p3
issue_id: "007"
tags: [code-review, performance, css]
dependencies: []
---

# Replace transition-all with specific transition properties

## Problem Statement

The expand/collapse pattern uses `transition-all` which transitions every CSS property that changes. The actual properties being animated are only `max-height` and `opacity`.

## Findings

- **Performance reviewer**: P3 -- minor optimization but good hygiene
- Prevents accidental animation of unintended property changes

**Locations:** All 3 expand/collapse instances in BrewForm, BeanLibrary, BrewHistory

## Proposed Solutions

Replace `transition-all` with `transition-[max-height,opacity]` in all three locations.

- Effort: Small (5 min)
- Risk: None

## Acceptance Criteria

- [ ] No `transition-all` on expand/collapse containers
- [ ] Animations still work correctly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by performance reviewer |
