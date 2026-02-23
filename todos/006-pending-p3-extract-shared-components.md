---
status: pending
priority: p3
issue_id: "006"
tags: [code-review, duplication, architecture]
dependencies: []
---

# Extract shared components: Collapsible, Modal, EmptyState

## Problem Statement

Three UI patterns are duplicated across multiple components:
1. **Expand/collapse** -- identical CSS pattern in 3 files
2. **Modal overlay** -- identical structure in 3 files (one missing animations)
3. **Empty state** -- identical layout in 3 files

## Findings

- **Pattern reviewer**: HIGH priority for expand/collapse and formatTime; MEDIUM for modal and empty state
- **Architecture reviewer**: P3 -- noted the duplication but said it's not blocking
- **Simplicity reviewer**: Noted the pattern is repeated verbatim

## Proposed Solutions

### Solution: Extract three small shared components

1. **`<Collapsible open={bool}>`** -- wraps the max-height/opacity transition
2. **`<Modal title onClose>`** -- wraps the backdrop + card + header + close button
3. **`<EmptyState emoji title description>`** -- wraps the empty state layout

Also extract `formatTime` to `src/utils/formatting.js` (duplicated 4 times with inconsistent null handling).

- Effort: Medium (30-45 min)
- Risk: Low
- Pros: Single-site changes for future updates, fixes SettingsMenu missing animations
- Cons: Premature if these patterns don't spread further

## Acceptance Criteria

- [ ] Expand/collapse pattern exists in one place
- [ ] Modal pattern exists in one place (all modals animated consistently)
- [ ] Empty state pattern exists in one place
- [ ] formatTime exists in one shared utility

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by pattern and architecture reviewers |
