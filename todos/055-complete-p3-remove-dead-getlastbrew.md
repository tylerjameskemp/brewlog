---
status: complete
priority: p3
issue_id: "055"
tags: [code-review, dead-code, storage]
dependencies: []
---

# Remove dead getLastBrew() function

## Problem Statement

`getLastBrew()` in storage.js is exported but has no production callers. It was used by BrewForm's old new-brew pre-fill logic, which was removed when BrewForm was scoped to edit-only (Phase 4.4). Only test files reference it.

## Findings

**Agent:** Code Simplicity Reviewer (finding #3)

## Proposed Solutions

Remove `getLastBrew()` from storage.js and its tests. ~6 lines.

## Acceptance Criteria

- [ ] Function removed from storage.js
- [ ] No production imports of `getLastBrew`
