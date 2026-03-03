---
status: pending
priority: p3
issue_id: "018"
tags: [code-review, duplication, utility]
dependencies: []
---

# Extract Shared `formatTime` Utility

## Problem Statement

`formatTime` is implemented 3-4 times independently across BrewHistory.jsx, BrewTrends.jsx, and BrewForm.jsx with inconsistent null/undefined handling. This violates DRY and creates risk of formatting divergence.

## Findings

- BrewHistory.jsx: `formatTime` handles null with `'—'` fallback
- BrewTrends.jsx: `formatTime` in chart tooltip, no null guard
- BrewForm.jsx: inline time formatting in quick diff section
- Some implementations use `Math.floor(s/60)`, others vary in zero-padding

## Proposed Solutions

### Solution A: Extract to `src/data/defaults.js`

Add a single `formatTime(seconds)` to the shared defaults module (already imported everywhere).

**Pros:** Single source of truth, consistent null handling
**Cons:** Minor churn across 3 files
**Effort:** Small
**Risk:** None

## Technical Details

**Affected files:** `src/data/defaults.js`, `src/components/BrewHistory.jsx`, `src/components/BrewTrends.jsx`, `src/components/BrewForm.jsx`

## Acceptance Criteria

- [ ] Single `formatTime` function in `src/data/defaults.js`
- [ ] All components import and use the shared version
- [ ] Null/undefined input returns consistent fallback

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-25 | Found during code review | 3-4 independent implementations |
