---
status: pending
priority: p2
issue_id: "083"
tags: [code-review, react-patterns, recipe-entity]
dependencies: ["076"]
---

# Inline onRecipeSelect/onSaveToRecipe Handlers Too Large

## Problem Statement

The `onRecipeSelect` (~25 lines) and `onSaveToRecipe` (~18 lines) callbacks are defined inline in JSX props. These contain real logic (state updates, storage writes, recipe-to-form transforms) and are recreated on every render. Every other handler in BrewScreen is a named useCallback — these should follow the same pattern.

## Findings

- BrewScreen.jsx ~line 1725-1770: inline handlers in RecipeAssembly JSX render
- `onRecipeSelect` duplicates `buildRecipeFromEntity` field mapping (see #076)
- Every render creates new closure references, causing unnecessary RecipeAssembly re-renders
- All other handlers (handleBeanSelect, handleFinishBrew, etc.) are named useCallbacks

## Proposed Solutions

### Option A: Extract to named useCallback functions
Move both handlers to the handler section of BrewScreen, alongside `handleBeanSelect`, `handleFinishBrew`, etc.
- **Pros:** Matches existing pattern, referentially stable, more readable
- **Cons:** None
- **Effort:** Small (reorganization, no logic change)
