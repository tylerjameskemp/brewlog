---
status: complete
priority: p3
issue_id: "056"
tags: [code-review, ux, brewscreen]
dependencies: []
---

# changesAccepted Apply/Skip buttons have no downstream effect

## Problem Statement

In RecipeAssembly's "Notes from last brew" section, Apply/Skip buttons exist next to each change suggestion. Pressing them only updates local `changesAccepted` state for visual feedback (checkmarks/dimming). Neither action modifies the recipe. The user must manually edit recipe values regardless — the buttons are misleading.

## Findings

**Agent:** Code Simplicity Reviewer (finding #4)

## Proposed Solutions

Replace Apply/Skip buttons with read-only text display of the change notes. ~25 lines saved, removes misleading UX.

## Acceptance Criteria

- [ ] "Notes from last brew" displayed as read-only text
- [ ] No misleading interactive elements
