---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, race-condition, react]
dependencies: []
---

# Guard against double-fire of onSave in EquipmentSetup timer

## Problem Statement

The EquipmentSetup confirmation screen has a 2-second auto-dismiss timer AND a "Start Brewing" button that both call `onSave(form)`. The `useEffect` dependency array includes `form` and `onSave`, where `onSave` is an inline arrow function in App.jsx that creates a new reference on every render. Any parent re-render during the 2-second window will cancel and restart the timer, potentially causing:

1. Timer extension (confirmation screen lingers unexpectedly)
2. Visual jank (animation restarts when effect re-runs)
3. Theoretical double-call of `onSave` if cleanup timing is imprecise

## Findings

- **Frontend races reviewer**: P1 -- the `onSave` prop is an inline arrow recreated every render, making `[step, form, onSave]` deps unstable
- **Performance reviewer**: P1 -- stale closure risk, timer restarts on parent re-render
- **Architecture reviewer**: Identified the issue but noted React unmount cleanup prevents double-call in practice

**Location**: `src/components/EquipmentSetup.jsx`, lines 41-45 and 93-94

## Proposed Solutions

### Solution A: Add dismissed guard + trim deps (Recommended)
Add a `dismissed` state flag so `onSave` can only fire once. Remove `form` and `onSave` from the effect deps since the form is already saved to localStorage by `handleSave`.

```jsx
const [dismissed, setDismissed] = useState(false)

const dismiss = () => {
  if (dismissed) return
  setDismissed(true)
  onSave(form)
}

useEffect(() => {
  if (step !== 'done') return
  const timer = setTimeout(dismiss, 2000)
  return () => clearTimeout(timer)
}, [step])
```

- Effort: Small
- Risk: Low
- Pros: Simple, eliminates the entire class of issue
- Cons: None

### Solution B: Use refs for stable references
Store `form` and `onSave` in refs to avoid dependency churn.

- Effort: Small
- Risk: Low
- Pros: More React-idiomatic for effect stability
- Cons: Slightly more code

### Solution C: Memoize onSave in App.jsx with useCallback
Wrap the `onSave` handler in `useCallback` so the reference is stable.

- Effort: Small
- Risk: Low
- Pros: Fixes root cause (unstable prop reference)
- Cons: Only fixes one symptom; doesn't guard against double-call

## Recommended Action

Solution A -- simplest and most defensive.

## Technical Details

**Affected files:**
- `src/components/EquipmentSetup.jsx` (lines 41-45, 93-94)
- `src/App.jsx` (line 126-129 -- inline onSave)

## Acceptance Criteria

- [ ] Clicking "Start Brewing" before timer fires calls onSave exactly once
- [ ] Timer auto-dismiss calls onSave exactly once
- [ ] Parent re-renders during the 2s window do not restart the timer
- [ ] Confirmation animation does not restart unexpectedly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by frontend-races and performance reviewers |

## Resources

- PR #7: feat(ux): Improve empty states and first-time experience
