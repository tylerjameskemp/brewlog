---
title: "useState lazy initializer goes stale when derived from changing props"
category: state-management
tags: [react-state, useState, derived-state, stale-closure, brewscreen]
module: BrewScreen
symptoms:
  - "State computed from a prop at mount time never updates when that prop changes"
  - "Feature works from one entry point but not another"
  - "Lazy initializer runs once but the source data changes later"
date: 2026-02-27
severity: P1
---

# useState lazy initializer goes stale when derived from changing props

## Problem

When `useState(() => computeFromProp(prop))` is used to derive initial state from a prop, the computation runs once on mount and never again. If the prop changes later (e.g., user selects a different item), the state remains stale.

In BrewScreen, the `changes` state (notes from the last brew of a selected bean) was computed via lazy initializer from `selectedBean`. When the user picked a bean from the BeanPicker, `selectedBean` updated but `changes` stayed empty — the "Notes from last brew" feature only worked when entering via BeanLibrary's "Brew this bean" button (which set `initialBean` before mount).

## Root Cause

`useState(() => expr)` is a **one-shot initializer**. It runs during the first render only. Unlike `useMemo`, it does not re-run when dependencies change. This is the correct behavior for state initialization, but it becomes a bug when the "initial" value needs to be recomputed after the component is already mounted.

The pattern is tempting when you want lazy initialization (avoid computing on every render) AND the initial value depends on props — but these two goals conflict.

## Solution

### Option A: Use `useMemo` instead of `useState` (preferred for read-only derived data)

```jsx
// Before (broken):
const [changes] = useState(() => {
  if (!selectedBean) return []
  return getChangesForBean(selectedBean.name)?.split('\n').filter(s => s.trim()) || []
})

// After (reactive):
const changes = useMemo(() => {
  if (!selectedBean) return []
  return getChangesForBean(selectedBean.name)?.split('\n').filter(s => s.trim()) || []
}, [selectedBean])
```

`useMemo` recomputes when `selectedBean` changes. Since `changes` is read-only (never needs a setter), this is the right tool.

### Option B: Explicitly update state in the event handler (for writable state)

If the derived state also needs a setter (e.g., `recipe`), update it explicitly in the handler that changes the source prop:

```jsx
const [recipe, setRecipe] = useState(() => buildRecipe(initialBean))

const handleBeanSelect = (bean) => {
  setSelectedBean(bean)
  setRecipe(buildRecipe(bean))  // Explicit re-derivation
}
```

This is the pattern used for `recipe` in BrewScreen — the lazy initializer handles mount, and `handleBeanSelect` handles subsequent changes. The bug was that `changes` used Option A's pattern (lazy init) when it should have used either `useMemo` or explicit update.

## Key Distinction

| Tool | Re-runs on dependency change? | Has a setter? | Use when... |
|------|-------------------------------|---------------|-------------|
| `useState(() => ...)` | No (mount only) | Yes | State is writable AND source never changes after mount |
| `useMemo(() => ..., [deps])` | Yes | No | Derived data, read-only, recompute when source changes |
| `useState` + explicit update | Yes (manually) | Yes | State is writable AND source can change |

## Gotcha

Don't use `useState` with the setter destructured away (`const val = useState(() => ...)[0]`) as a substitute for `useMemo`. This is a common mistake — it looks like it works because the initial value is correct, but it hides the fact that the value never updates.
