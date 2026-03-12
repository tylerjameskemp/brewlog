---
status: complete
priority: p3
issue_id: "104"
tags: [code-review, quality]
dependencies: []
---

# Un-export WORKER_URL and WORKER_TOKEN Constants

## Problem Statement
`WORKER_URL` and `WORKER_TOKEN` are exported from `recipeImport.js` but only consumed internally by `extractRecipes()`. Exporting invites direct use elsewhere, bypassing the abstraction.

## Findings
- **Location:** `src/data/recipeImport.js:66-67`
- **Agent:** pattern-recognition-specialist

## Proposed Solutions
Remove `export` keyword from both constants.
- **Effort:** Trivial

## Acceptance Criteria
- [ ] Constants are module-scoped, not exported
