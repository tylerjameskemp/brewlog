---
title: "useState([]) + useEffect loses data on refresh in React 18"
category: logic-errors
tags: [react, useState, useEffect, localStorage, persistence, StrictMode]
module: App
symptoms:
  - Data appears to disappear on page refresh
  - Flash of empty/welcome screen before data loads
  - Users report data loss that is actually a visual flash
  - React 18 StrictMode amplifies the issue (double effect invocation)
date: 2026-02-24
severity: P1
---

# useState([]) + useEffect loses data on refresh

## Problem Statement

Users reported data disappearing on page refresh. Investigation revealed that data was actually persisted in localStorage but the app showed an empty state for one render cycle before the `useEffect` fired and loaded data.

## Root Cause

The app initialized React state with empty defaults, then loaded from localStorage in a `useEffect`:

```javascript
// BAD: Empty state for one render cycle
const [brews, setBrews] = useState([])
const [equipment, setEquipment] = useState(null)

useEffect(() => {
  setBrews(getBrews())
  setEquipment(getEquipment())
}, [])
```

This creates a window where `equipment` is `null`, causing `needsSetup` to be `true`, which renders the "Welcome to BrewLog" setup screen. The effect fires after the first paint, correcting the state — but the user sees a flash of the wrong screen.

In React 18 dev mode, `StrictMode` double-invokes effects, amplifying the visual glitch.

## The Gotcha

No downstream code actually *writes* during the empty window (that would require user interaction, which can't happen between mount and first effect). So this is a **visual bug, not a data loss bug** — but users perceive it as data loss because they see the empty/welcome state.

## Solution

Replace `useState` + `useEffect` with lazy state initialization:

```javascript
// GOOD: State is correct from the first render
const [brews, setBrews] = useState(() => getBrews())
const [equipment, setEquipment] = useState(() => getEquipment())
const [beans, setBeans] = useState(() => getBeans())
```

Then remove the `useEffect` entirely. Lazy initializers run synchronously during the first render, so state is correct from frame one.

## Prevention

- **Always use lazy initializers** when initial state comes from an external source (localStorage, URL params, cookies).
- **Never use `useState(defaultValue)` + `useEffect(loadRealValue)`** for data that must be present on first render.
- **Test with React StrictMode enabled** — it amplifies timing issues that are invisible in production mode.

## Affected Files

- `src/App.jsx` — state initialization (lines 30-32), removed useEffect (lines 41-45)

## Related

- PR #8: fix: Resolve 4 bugs
- Plan: `docs/plans/2026-02-24-fix-four-bug-fixes-plan.md`
- React docs: useState lazy initial state
