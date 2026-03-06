---
title: "Subtractive refactors leave a dead-prop halo that compiles cleanly"
category: react-patterns
tags: [dead-code, props, imports, subtractive-refactor, cleanup, code-review]
module: BrewScreen.jsx, BrewForm.jsx, App.jsx
symptoms:
  - "Props passed to a component that no longer uses them"
  - "Imports from storage/utils that are no longer called anywhere in the file"
  - "useCallback handlers defined in parent that no longer have a consumer in the child"
  - "Wrapper functions whose body was gutted to a single pass-through call"
date: 2026-03-06
---

# Subtractive refactors leave a dead-prop halo that compiles cleanly

## Problem

After deleting entire features (SwipeCards, Origin Details card, Edit/Done toggle, template picker), the codebase had dead symbols that still compiled and ran without errors:

- **Dead imports:** `getLastBrewOfBean`, `getRecipesForBean`, `archiveRecipe` — imported but never called after their features were deleted.
- **Dead props:** `templates` and `equipment` passed to `RecipeAssembly`, `beans` passed to `BrewForm` — received but never referenced in the component body.
- **Dead callbacks:** `handleBeanUpdate` (a `useCallback` in BrewScreen) defined and passed as `onBeanUpdate` to a component that no longer called it.
- **Dead wrappers:** `flushPendingEdits()` was gutted to just `return commitTargetTimeInputs()` after the `beanOverrides` flush was removed — a pointless alias.

## Root Cause

Large subtractive refactors that remove entire feature areas leave behind a "halo" of supporting code: imports that fed deleted functionality, props that transmitted deleted state, parent-side handlers that backed deleted child callbacks, and wrapper functions whose second clause was removed. None of these cause compile or runtime errors, so they survive until a dedicated cleanup pass.

## Solution

After any subtractive refactor, run a dedicated dead-code audit:

1. **Imports:** For each import, grep for usage below the import block. Remove any symbol that appears only in the import line.
2. **Component props:** For each destructured prop, grep the component body. Remove any prop that's never referenced.
3. **Parent call sites:** For each removed prop, remove the corresponding `propName={value}` at the call site.
4. **Wrapper functions:** If a multi-clause function was reduced to a single pass-through, inline the remaining call at all call sites and delete the wrapper.

```jsx
// Before — dead wrapper after beanOverrides clause was removed
const flushPendingEdits = () => {
  return commitTargetTimeInputs()
}
// ... later in JSX:
const timeOverrides = flushPendingEdits()

// After — inlined directly
const timeOverrides = commitTargetTimeInputs()
```

## Prevention

- **Two-commit pattern:** Large subtractive refactors should be followed by a cleanup commit that audits all deleted features' supporting symbols.
- **Review agents catch this:** Pattern-recognition and code-simplicity review agents reliably identify dead props, unused imports, and trivial wrapper functions.
- **Grep-verify after deletion:** When you delete a function/component, grep for its name across the file. If hits remain only in import/prop/call-site positions, clean them up in the same PR.

## Related

- `docs/plans/2026-03-06-refactor-prune-recipe-assembly-plan.md` — the pruning plan that triggered this
- `docs/plans/2026-03-06-ui-audit.md` — Phase 1 audit
