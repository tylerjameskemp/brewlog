---
status: pending
priority: p3
issue_id: "020"
tags: [code-review, performance, react]
dependencies: []
---

# Wrap `chartData` in BrewTrends with `useMemo`

## Problem Statement

`chartData` in `BrewTrends.jsx` is recomputed on every render despite only depending on `brews` and `beans`. With 3 Recharts line charts consuming this data, unnecessary recomputation triggers unnecessary chart re-renders.

## Proposed Solutions

### Solution A: Wrap in useMemo

```jsx
const chartData = useMemo(() => { /* existing computation */ }, [brews, beans])
```

**Pros:** Prevents unnecessary chart re-renders
**Cons:** Minor complexity
**Effort:** Small
**Risk:** None

## Technical Details

**Affected files:** `src/components/BrewTrends.jsx`

## Acceptance Criteria

- [ ] `chartData` wrapped in `useMemo` with `[brews, beans]` dependencies
- [ ] Charts still render and update correctly when brews change
