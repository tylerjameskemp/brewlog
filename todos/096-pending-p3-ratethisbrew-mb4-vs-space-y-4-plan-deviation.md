---
status: pending
priority: p3
issue_id: "096"
tags: [code-review, spacing, consistency, phase3-polish]
dependencies: []
---

# RateThisBrew Uses mb-4 per-card Instead of space-y-4 on Parent

## Problem Statement

Phase 3 spacing plan specifies `space-y-4` on the parent wrapper for form views, replacing per-card `mb-4`. The RateThisBrew section still uses `mb-4` on individual cards.

## Findings

- RateThisBrew cards use `mb-4` on each card div
- Plan item 3.2 acceptance criteria: "Form views use space-y-4 on parent"
- The card merge in 3.6 kept `mb-4` on the merged cards rather than wrapping in `space-y-4`

## Proposed Solutions

### Option A: Wrap RateThisBrew cards in space-y-4 container
Remove `mb-4` from individual cards, add `space-y-4` to their parent wrapper.
- **Effort:** Small
- **Risk:** None — equivalent visual output

## Acceptance Criteria

- [ ] RateThisBrew section uses `space-y-4` on parent, no `mb-4` on children
