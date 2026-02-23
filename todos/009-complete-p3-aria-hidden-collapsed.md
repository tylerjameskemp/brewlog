---
status: complete
priority: p3
issue_id: "009"
tags: [code-review, accessibility]
dependencies: []
---

# Add aria-hidden to collapsed expand/collapse containers

## Problem Statement

Since the expand/collapse content is now always in the DOM (just visually hidden via max-height), screen readers can navigate into collapsed sections.

## Findings

- **Architecture reviewer**: P3 -- accessibility improvement for future iteration

**Locations:** All 3 expand/collapse instances in BrewForm, BeanLibrary, BrewHistory

## Proposed Solutions

Add `aria-hidden={!isExpanded}` to the transition wrapper div in each location.

- Effort: Small (5 min)
- Risk: None

## Acceptance Criteria

- [ ] Collapsed sections have `aria-hidden="true"`
- [ ] Expanded sections have `aria-hidden="false"`

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by architecture reviewer |
