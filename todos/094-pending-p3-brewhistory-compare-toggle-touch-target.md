---
status: pending
priority: p3
issue_id: "094"
tags: [code-review, touch-targets, accessibility, phase3-polish]
dependencies: []
---

# BrewHistory Compare Toggle Missing min-h-[44px]

## Problem Statement

The Compare mode toggle button in BrewHistory may be below the 44px minimum touch target. It was not in the Phase 3 touch target audit table.

## Findings

- `BrewHistory.jsx` line ~308: Compare toggle button
- Was categorized as "not fixing (desktop-only)" in the plan, but Compare mode is usable on mobile

## Proposed Solutions

### Option A: Add min-h-[44px] to Compare toggle
- **Effort:** Small (1 element)
- **Risk:** None

## Acceptance Criteria

- [ ] Compare toggle has `min-h-[44px]`
