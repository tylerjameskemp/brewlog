---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, logic-gap, brewform]
dependencies: []
---

# Missing `saveBean()` in Edit Save Path

## Problem Statement

The edit save path in `BrewForm.jsx` does not call `saveBean()` after updating a brew. The plan explicitly specified this (since `saveBean()` is idempotent and uses duplicate detection), but the implementation dropped it. This means if a user edits a brew and changes the bean name to a new bean, that bean won't be added to the bean library automatically.

Found by 4/5 review agents (pattern-recognition, architecture, security, simplicity).

## Findings

- `BrewForm.jsx` handleSave — the `if (isEditing)` branch at ~line 126 calls `updateBrew()` but skips the `saveBean()` + `setBeans()` calls that exist in the create path
- The plan doc (`docs/plans/2026-02-25-feat-demo-ux-tweaks-plan.md`) explicitly states bean auto-save should happen in both paths
- `saveBean()` in `storage.js` is idempotent — it normalizes names and skips duplicates, so calling it is always safe
- The create path correctly calls `saveBean()` followed by `setBeans(getBeans())`

## Proposed Solutions

### Solution A: Add saveBean() to edit branch (Recommended)

Add the same `saveBean()` + `setBeans()` calls to the edit branch, matching the create path.

**Pros:** Matches plan intent, 2-line fix, idempotent so no risk
**Cons:** None
**Effort:** Small (< 5 min)
**Risk:** None

### Solution B: Leave as-is, document as intentional

Argue that editing a brew shouldn't create new beans — users should add beans explicitly.

**Pros:** Simpler mental model
**Cons:** Inconsistent with create path, contradicts plan
**Effort:** None
**Risk:** Low — edge case only

## Recommended Action

Solution A — match the create path behavior.

## Technical Details

**Affected files:** `src/components/BrewForm.jsx`
**Location:** handleSave function, `if (isEditing)` branch (~line 126)

## Acceptance Criteria

- [ ] Editing a brew with a new bean name adds that bean to the library
- [ ] Editing a brew with an existing bean name does not create duplicates
- [ ] `setBeans(getBeans())` called after `saveBean()` to refresh UI state

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-25 | Found during code review | Plan specified it, implementation missed it |

## Resources

- PR commits: `98e6715` (feat: Make brews editable)
- Plan: `docs/plans/2026-02-25-feat-demo-ux-tweaks-plan.md`
