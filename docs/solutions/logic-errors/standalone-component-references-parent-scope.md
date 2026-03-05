---
title: "Standalone component references variable from parent scope"
category: logic-errors
module: BrewScreen
tags: [scoping, function-component, savingRef, TypeError, silent-failure]
severity: P1
symptoms:
  - "Button click does nothing (silent failure)"
  - "Only one of several action buttons works"
  - "TypeError: Cannot read properties of undefined"
  - "Post-brew Update Recipe and Save as New buttons unresponsive"
date_fixed: 2026-03-05
related:
  - synchronous-ref-guard-is-always-ineffective.md
---

# Standalone component references variable from parent scope

## Problem

After completing a brew, the `BrewSuccess` component showed three buttons: "Update Recipe", "Save as New Recipe", and "Keep Original". Only "Keep Original" worked. The other two buttons appeared clickable but did nothing on tap.

## Root Cause

`BrewSuccess` was defined as a standalone function component at module scope in BrewScreen.jsx:

```jsx
function BrewSuccess({ onUpdateRecipe, onSaveAsNew, ... }) {
  // ...
  onClick={() => {
    if (savingRef.current) return   // ← TypeError: savingRef is undefined
    savingRef.current = true
    onUpdateRecipe(selectedRecipeId)
    setForkDismissed(true)
    savingRef.current = false
  }}
}
```

`savingRef` was defined inside `RateThisBrew` (another sub-component) and inside the main `BrewScreen` component — but **not** inside `BrewSuccess` and **not** passed as a prop. The reference resolved to `undefined` at runtime.

The `savingRef.current` access threw a TypeError, but since it was inside an onClick handler, the error was swallowed silently (no visible crash, just a non-functional button). Only "Keep Original" worked because its handler didn't reference `savingRef`.

## The Pattern

**Function components defined at module scope cannot reference variables from other components' scopes.** This is a basic JavaScript scoping rule, but it's easy to violate when:

1. A component is extracted from an inline definition to a standalone function
2. The original inline version had access to parent closure variables
3. The extraction doesn't audit all variable references

## Fix

Removed the `savingRef` guards entirely. They were unnecessary because:
- The underlying operations are synchronous (localStorage writes)
- `setForkDismissed(true)` already hides the prompt, preventing re-clicks
- Per documented learning: synchronous ref guards are always ineffective

```jsx
// After: clean, no dead guards
onClick={() => {
  onUpdateRecipe(selectedRecipeId)
  setForkDismissed(true)
}}
```

## Prevention

**When extracting a component from inline to standalone:**

1. Search the component body for every variable reference
2. Verify each is either: a prop, a local definition, an import, or a React hook
3. Any variable that comes from a parent closure must become a prop or be removed
4. Test every interactive element (buttons, links, inputs) after extraction

**When reviewing code with multiple sub-components in one file:**

1. Check if standalone function components reference variables defined in sibling or parent components
2. Look for `useRef` values used across component boundaries without prop passing
3. Silent onClick failures are a strong signal — add temporary `console.log` to verify handlers fire

## Related

- `synchronous-ref-guard-is-always-ineffective.md` — The `savingRef` guard pattern was already dead code even if it were in scope
