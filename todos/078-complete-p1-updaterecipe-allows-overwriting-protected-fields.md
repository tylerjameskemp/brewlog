---
status: complete
priority: p1
issue_id: "078"
tags: [code-review, security, data-integrity, recipe-entity]
dependencies: []
---

# updateRecipe Allows Overwriting Protected Fields via Spread

## Problem Statement

`updateRecipe` in storage.js uses unrestricted `...updates` spread, allowing `id`, `beanId`, and `createdAt` to be overwritten by callers. While current callers pass controlled fields, this is a latent vulnerability if a future code path passes user-influenced data.

`saveRecipe` correctly pins `id`, `version`, `createdAt`, `updatedAt`, and `archivedAt` after the spread. `updateRecipe` only pins `version` and `updatedAt`.

## Findings

- storage.js ~line 256: `all[index] = { ...all[index], ...updates, version: ..., updatedAt: ... }`
- `id`, `beanId`, `createdAt` are not pinned after the spread
- All current callers pass safe field sets, but asymmetry with `saveRecipe` is a defect waiting to surface

## Proposed Solutions

### Option A: Pin protected fields after spread (recommended)
Add 3 lines: `id: all[index].id, beanId: all[index].beanId, createdAt: all[index].createdAt`
- **Pros:** Prevents identity corruption, matches saveRecipe pattern
- **Cons:** None
- **Effort:** Small (3 lines)
