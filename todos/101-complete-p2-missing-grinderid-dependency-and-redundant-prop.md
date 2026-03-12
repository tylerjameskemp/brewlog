---
status: complete
priority: p2
issue_id: "101"
tags: [code-review, react-patterns, correctness]
dependencies: []
---

# Missing grinderId Dependency + Redundant Prop

## Problem Statement
Two related issues:
1. `handleImport` in RecipeImportModal closes over `grinderId` (line 51) but the dependency array only lists `[inputText, equipment]` (line 93). Stale closure if grinderId changes independently.
2. `grinderId` is a redundant prop — it's always `equipment?.grinder`. The modal already receives `equipment` and reads its fields directly.

## Findings
- **Location:** `src/components/RecipeImportModal.jsx:51,93` — stale closure
- **Location:** `src/App.jsx:227-228` — redundant prop `grinderId={equipment?.grinder}`
- **Agents:** performance-oracle, architecture-strategist, pattern-recognition-specialist (all flagged)

## Proposed Solutions

### Option A: Remove grinderId prop, derive internally
Remove `grinderId` prop from RecipeImportModal. Use `equipment?.grinder` directly. Eliminates both the stale closure and the redundant prop.
- **Effort:** Small (touch 2 files)
- **Risk:** None

## Acceptance Criteria
- [ ] `grinderId` prop removed from RecipeImportModal
- [ ] Grinder name derived from `equipment?.grinder` inside the modal
- [ ] App.jsx no longer passes `grinderId` prop
