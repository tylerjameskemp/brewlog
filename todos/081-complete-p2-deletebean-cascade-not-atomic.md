---
status: complete
priority: p2
issue_id: "081"
tags: [code-review, data-integrity, recipe-entity]
dependencies: ["075"]
---

# deleteBean Cascade to Recipes Is Not Atomic

## Problem Statement

`deleteBean()` calls `archiveRecipesForBean(id)` then deletes the bean in a separate `safeSetItem` call. If the recipe archival succeeds but the bean deletion fails (quota exceeded), the data is inconsistent: recipes are archived but the bean still exists.

## Findings

- storage.js ~line 178: `archiveRecipesForBean(id)` followed by separate `safeSetItem(STORAGE_KEYS.BEANS, ...)`
- `archiveRecipesForBean` does not return success/failure indicator
- If bean write fails, recipes are already archived with no rollback
- Reverse scenario: if recipe archival fails, bean is still deleted, leaving active recipes pointing at a nonexistent bean

## Proposed Solutions

### Option A: Check safeSetItem return in archiveRecipesForBean
Return boolean from `archiveRecipesForBean`. In `deleteBean`, skip bean deletion if recipe archival failed.
- **Pros:** Prevents inconsistent state
- **Cons:** Bean deletion is blocked by recipe archival failure
- **Effort:** Small

### Option B: Reverse the order — delete bean first, archive recipes second
If bean deletion fails, recipes remain untouched. If it succeeds, archive recipes (orphaned recipes are less harmful than phantom beans).
- **Pros:** More predictable failure mode
- **Cons:** Temporary orphaned recipes if archival fails
- **Effort:** Small
