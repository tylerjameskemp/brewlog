---
title: "New code path drops side effects from original path"
category: logic-errors
tags: [data-integrity, dual-mode, side-effects, beans, edit-mode]
module: BrewForm
symptoms:
  - Editing a brew with a new bean name does not add the bean to the library
  - Bean library missing entries that should have been auto-created
  - Create path and edit path behave differently for the same form
date: 2026-02-25
severity: P2
---

# New code path drops side effects from original path

## Problem

Adding edit mode to BrewForm created a second save path (`if (isEditing) { ... } else { ... }`). The original create path called `saveBean()` + `setBeans(getBeans())` after saving, which auto-adds the bean to the library. The new edit path omitted both calls.

Result: editing a brew with a changed bean name silently skipped bean library creation. The plan doc explicitly specified `saveBean()` in both paths, but the implementation dropped it.

## Root Cause

When splitting a single code path into two branches (create vs. edit), side effects from the original branch must be audited and replicated where applicable. The edit branch was written focused on `updateBrew()` — the primary operation — and the secondary `saveBean()` side effect was overlooked.

This is a recurrence of the same pattern documented in [multiple-write-paths-bypass-bean-deduplication.md](./multiple-write-paths-bypass-bean-deduplication.md): any time a new code path writes to the same entity, all side effects from existing paths must be checked.

## Solution

Add `saveBean()` and `setBeans()` to the edit branch, matching the create path:

```jsx
// BrewForm.jsx — handleSave, edit branch
if (isEditing) {
  const updatedBrews = updateBrew(editBrew.id, { ... })
  if (trimmedName) {
    saveBean({ name: trimmedName, roaster: form.roaster, roastDate: form.roastDate })
    setBeans(getBeans())
  }
  onBrewSaved(updatedBrews)
  savingRef.current = false
  onEditComplete()
  return
}
```

`saveBean()` is idempotent (normalizes names, skips duplicates), so calling it in both paths is always safe.

## Prevention

**Checklist when adding a second code path to an existing function:**

1. List every side effect in the original path (state updates, storage writes, external calls)
2. For each side effect, decide: does the new path need it too?
3. If a side effect is idempotent (like `saveBean()`), default to including it — the cost of calling it unnecessarily is zero, but the cost of skipping it is a bug
4. Review the plan/spec to verify all specified behaviors are present in both paths

**General principle:** When you branch `if (modeA) { ... } else { ... }`, the branching creates a gap where shared effects can fall through. Audit the gap.

## Affected Files

| File | Change |
|------|--------|
| `src/components/BrewForm.jsx` | Added `saveBean()` + `setBeans()` to edit save path |

## Related

- [Multiple write paths bypass bean deduplication](./multiple-write-paths-bypass-bean-deduplication.md) — Same class of bug (Sprint 2). New write path skipped dedup logic.
- [String-based entity references orphan records on rename](./string-reference-rename-orphans-records.md) — Related string-reference hazard pattern.
- PR #13 branch: `tylerjameskemp/demo-ux-tweaks` — Tweak 1 (edit mode) commit `98e6715`, fix applied during code review.
