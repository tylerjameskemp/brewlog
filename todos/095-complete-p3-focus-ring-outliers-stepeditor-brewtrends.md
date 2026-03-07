---
status: complete
priority: p3
issue_id: "095"
tags: [code-review, color-branding, consistency, phase3-polish]
dependencies: []
---

# Focus Ring Outliers in StepEditor and BrewTrends

## Problem Statement

Phase 3 standardized focus states to `focus:ring-2 focus:ring-brew-400`, but StepEditor and BrewTrends have outlier focus ring styles.

## Findings

- `StepEditor.jsx` line ~240: uses `focus:ring-1 focus:ring-brew-300` (ring-1 instead of ring-2, brew-300 instead of brew-400)
- `BrewTrends.jsx` lines ~86, ~135: uses `focus:ring-brew-300` (brew-300 instead of brew-400)

## Proposed Solutions

### Option A: Normalize to focus:ring-2 focus:ring-brew-400
- **Effort:** Small (3 occurrences across 2 files)
- **Risk:** None

## Acceptance Criteria

- [ ] All focus rings use `focus:ring-2 focus:ring-brew-400`
