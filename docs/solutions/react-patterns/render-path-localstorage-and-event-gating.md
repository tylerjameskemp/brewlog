---
title: "Avoid localStorage reads in React render path; gate lookups behind in-memory checks"
category: react-patterns
tags: [performance, localstorage, react-state, render-path, event-gating, bean-prefill]
module: BrewForm, storage
symptoms:
  - "localStorage.getItem + JSON.parse fires on every render cycle"
  - "Typing in an input causes unnecessary storage reads"
  - "Component re-renders feel sluggish with large datasets"
date: 2026-02-25
severity: P1
---

# Avoid localStorage reads in React render path; gate lookups behind in-memory checks

## Problem

Two related anti-patterns emerged during the BrewForm 3-phase restructure:

1. **Render-path localStorage call**: An IIFE in JSX called `getLastBrewOfBean()` (which reads and parses localStorage) on every render. Any state change — typing, toggling a section, clicking a flavor tag — triggered a synchronous `localStorage.getItem` + `JSON.parse`.

2. **Ungated keystroke lookup**: `handleBeanNameChange` called `getLastBrewOfBean()` on every keystroke. While individual calls are sub-millisecond, this is wasteful — partial typing like "Hea" will never match a bean named "Heart Colombia".

## Root Cause

**Pattern 1**: Calling a storage function inside JSX means it runs during React's render phase, not during an event. React re-renders on *any* state change in the component, so the function fires far more often than intended.

**Pattern 2**: The handler ran an expensive check (localStorage read) without first checking whether the input could possibly match. The `beans` prop (already in memory) contains all known bean names — a cheap `Array.some()` check can gate the expensive call.

## Solution

### Cache storage results in state, update on events only

```jsx
// State to cache the lookup result
const [lastBeanBrew, setLastBeanBrew] = useState(null)

// Update in event handler — NOT in render
const handleBeanNameChange = (newName) => {
  // ... lookup logic ...
  if (beanBrew) {
    setLastBeanBrew(beanBrew)     // cache for render
  } else {
    setLastBeanBrew(null)         // clear cache
  }
}

// In JSX — read from state, never call storage
{lastBeanBrew && (
  <div>{lastBeanBrew.coffeeGrams}g / {lastBeanBrew.waterGrams}g</div>
)}
```

### Gate expensive lookups behind cheap in-memory checks

```jsx
const handleBeanNameChange = (newName) => {
  const trimmed = newName.trim()
  // Cheap check: does this name match a known bean? (in-memory prop)
  const knownBean = trimmed && beans.some(
    b => b.name?.trim().toLowerCase() === trimmed.toLowerCase()
  )

  if (knownBean) {
    // Expensive check: read localStorage only when we know there's a match
    const beanBrew = getLastBrewOfBean(trimmed)
    // ...
  }
}
```

## Why This Matters

- `localStorage.getItem` is synchronous and blocks the main thread
- `JSON.parse` on a large brews array compounds the cost
- React components can re-render 10-50x per user interaction (typing, scrolling, toggling)
- The fix moves the cost from O(renders) to O(events) — a dramatic reduction

## Prevention

1. **Never call storage/IO functions in JSX return blocks** — if you need data from storage, read it in an event handler or `useEffect` and store in state
2. **Gate expensive operations behind cheap checks** — if you have the answer in memory (props, state), check that first
3. **Use `??` not `||` for numeric field fallbacks** — `||` treats `0` as falsy, `??` only falls back on `null`/`undefined`

## Related

- `docs/solutions/logic-errors/multiple-write-paths-bypass-bean-deduplication.md` — same `trim().toLowerCase()` normalization pattern used for gating
- `docs/solutions/logic-errors/string-reference-rename-orphans-records.md` — string-based matching requires consistent normalization
- PR #12: feat: Restructure BrewForm into Recipe/Brew/Tasting phases
