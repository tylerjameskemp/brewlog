---
title: "UI wizard state in data objects leaks to persistence layers"
category: react-patterns
module: BrewScreen
tags: [state-separation, data-model, persistence, recipe, template-picker]
severity: P2
date_fixed: 2026-03-02
pr: "#25"
symptoms:
  - UI-only boolean flag persisted to localStorage via saveActiveBrew
  - Data object carries fields that no consumer needs
  - Multiple handlers must remember to clear a flag that should be transient
related:
  - lazy-init-state-goes-stale-on-prop-change.md
  - reset-handler-must-clear-all-related-state.md
  - persist-and-restore-must-be-end-to-end.md
---

# UI wizard state in data objects leaks to persistence layers

## Problem

When adding a template picker for new beans, the initial implementation put a `needsTemplatePick: boolean` flag directly on the `recipe` state object — the same object that flows through to `saveBrew()` and `saveActiveBrew()`.

The `recipe` object's contract is recipe domain data (grams, temp, steps, grind). Adding a UI routing flag (`needsTemplatePick`) conflated two concerns:

- **Domain data**: what the user intends to brew
- **Navigation state**: which sub-view of RecipeAssembly is visible

## Root Cause

The flag was set in `buildRecipeFromBean()` — a data-construction function — because it was convenient. The function already returns a recipe object, so adding one more field seemed harmless. But this meant:

1. **Three places had to clear the flag**: `handleTemplateSelect`, the Custom button handler, and the `buildRecipeFromBean` null-bean path. Missing any one would re-show the picker unexpectedly.
2. **`saveActiveBrew` serialized the entire recipe**: Since `persistState` spreads the full `recipe` object into localStorage, the UI flag leaked into persisted state. Safe only because the flag was always `false` by brew phase — an invariant maintained by execution order, not by design.
3. **Every `recipe` consumer implicitly ignored the field**: `PostBrewCommit`, `ActiveBrew`, and `handleCommit` all receive `recipe` as a prop but must know not to use `needsTemplatePick`. Undocumented knowledge.

## The Pattern

**Never embed transient UI state (wizard step, modal visibility, edit mode) into domain data objects that are passed broadly or serialized.**

Domain data objects should contain only fields that are meaningful to persist, display, or compute with. UI routing belongs in separate `useState` calls or component-local state.

## Fix

Replaced `needsTemplatePick` on the recipe object with a local `templatePicked` state in `RecipeAssembly`, derived from the recipe's actual data:

```jsx
// RecipeAssembly — local state, not on recipe object
const [templatePicked, setTemplatePicked] = useState(
  () => recipe.steps.length > 0 || !!recipe.pourTemplateId
)
```

The condition is self-documenting: if the recipe has steps or a template ID, the user has already picked. No flag to set or clear across multiple handlers.

`handleTemplateSelect` was also unified to accept `null` (for Custom), eliminating the duplicate inline handler:

```jsx
const handleTemplateSelect = (template) => {
  setSelectedTemplateId(template?.id ?? null)
  setRecipe(prev => ({
    ...prev,
    steps: template?.steps ?? [],
    pourTemplateId: template?.id ?? null,
  }))
  setTemplatePicked(true)
}

// Custom button: onClick={() => handleTemplateSelect(null)}
```

## Prevention

- **Before adding a field to a data object**: ask "would this be meaningful if I loaded this object from storage tomorrow?" If no, it is UI state and belongs in a separate `useState`.
- **Check persistence paths**: if the object is passed to any `save*()` or `JSON.stringify()` call, every field on it will be persisted. UI flags will leak.
- **Derive from data when possible**: `recipe.steps.length === 0 && !recipe.pourTemplateId` already encodes "no template chosen." A boolean flag is a redundant cache of a derivable condition.
- **One handler per action**: if two UI paths do the same logical action (select a template vs select Custom), route both through the same handler with a parameter (e.g., `handleTemplateSelect(null)`).

## Affected Files

- `src/components/BrewScreen.jsx` — `buildRecipeFromBean`, `RecipeAssembly`, `handleTemplateSelect`
