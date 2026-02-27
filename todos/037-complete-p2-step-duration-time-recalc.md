---
status: pending
priority: p2
issue_id: "037"
tags: [code-review, brewscreen, data-model]
dependencies: []
---

# Editing step duration doesn't recalculate downstream start times

## Problem Statement

When a user edits a step's `duration` in the RecipeAssembly steps card, the `time` (start time) of subsequent steps is not recalculated. This creates overlapping or gapped time ranges in the display.

Example: If step 2 starts at 0:30 with duration 30s (ends at 1:00), and step 3 starts at 1:00 — changing step 2's duration to 45s means it now ends at 1:15, but step 3 still shows starting at 1:00, creating a 15-second overlap.

## Proposed Solutions

### Option A: Recalculate downstream times on duration change (Recommended)
When `updateStep` modifies `duration`, recompute `time` for all subsequent steps.
- **Pros**: Time ranges stay consistent
- **Cons**: Slightly more complex update logic
- **Effort**: Small
- **Risk**: Low

### Option B: Only show duration in edit mode
Hide start/end time ranges when editing; just show duration field.
- **Pros**: No confusion from stale time values
- **Cons**: Less context while editing
- **Effort**: Small
- **Risk**: Low

## Technical Details

- **File**: `src/components/BrewScreen.jsx` lines 184-190 (updateStep)
- Steps have `time` (start), `duration`, and derived end time (`time + duration`)

## Acceptance Criteria

- [ ] Editing a step's duration updates the start times of all subsequent steps
- [ ] OR: Time ranges are hidden in edit mode, only duration shown

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created from architecture review | Architecture agent identified the inconsistency |
