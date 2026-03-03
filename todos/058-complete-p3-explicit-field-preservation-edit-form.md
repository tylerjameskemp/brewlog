---
status: complete
priority: p3
issue_id: "058"
tags: [code-review, data-integrity, brewform]
dependencies: []
---

# Explicitly preserve recipeSnapshot and equipment fields in edit form

## Problem Statement

BrewForm's `handleSave` preserves `stepResults`, `timeStatus`, `schemaVersion`, `pourTemplateId`, and `nextBrewChanges` explicitly. However, `recipeSnapshot`, `method`, `grinder`, `dripper`, and `filterType` are preserved only by accident — the `...form` spread doesn't include them because `form` state doesn't have those fields, so `updateBrew`'s spread preserves the originals.

This is correct today but fragile: if `form` state ever gains a `method` field (e.g., for equipment editing in BrewForm), it would silently overwrite per-brew equipment data.

## Findings

**Agent:** Data Integrity Guardian (LOW, findings 4.2 and 4.3)

## Proposed Solutions

Add explicit preservation:

```js
recipeSnapshot: editBrew.recipeSnapshot,
method: editBrew.method,
grinder: editBrew.grinder,
dripper: editBrew.dripper,
filterType: editBrew.filterType,
```

- **Effort:** Small (5 lines)

## Acceptance Criteria

- [ ] All V2 fields explicitly preserved in edit form save
- [ ] No reliance on "absence from form state" for field preservation
