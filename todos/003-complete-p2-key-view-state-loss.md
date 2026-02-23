---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, ux, react, data-loss]
dependencies: []
---

# Fix key={view} destroying BrewForm state on tab switch

## Problem Statement

The `<div key={view}>` wrapper in App.jsx forces React to unmount and remount the entire view subtree when switching tabs. This means if a user is halfway through filling out a brew form, switches to the Beans tab to check a bean name, and switches back, **all their in-progress form data is lost**. The form resets to its initial state (pre-filled from last brew).

## Findings

- **Frontend races reviewer**: P2 -- "data loss on tab switch during active form editing. The user loses work. Silently."
- **Performance reviewer**: Noted the tradeoff -- animation benefit vs. state destruction
- **Architecture reviewer**: Confirmed the behavior was pre-existing (conditional rendering already unmounted), but the `key` prop makes it explicit

**Location**: `src/App.jsx`, line 89

## Proposed Solutions

### Solution A: Use ref-based animation restart (Recommended)
Remove `key={view}` and instead use a ref to manually restart the CSS animation on view change. This preserves component state across tab switches.

```jsx
const viewRef = useRef(null)
const prevView = useRef(view)

useEffect(() => {
  if (view !== prevView.current && viewRef.current) {
    viewRef.current.classList.remove('animate-fade-in')
    void viewRef.current.offsetWidth // force reflow
    viewRef.current.classList.add('animate-fade-in')
    prevView.current = view
  }
}, [view])

<div ref={viewRef} className="animate-fade-in motion-reduce:animate-none">
```

- Effort: Small
- Risk: Low
- Pros: Preserves BrewForm state, keeps animation
- Cons: Slightly more code than `key` trick

### Solution B: Lift BrewForm state to App.jsx
Pass form state as props from App so it survives unmount.

- Effort: Medium
- Risk: Medium -- increases App.jsx complexity significantly
- Cons: Over-engineering for this app's scale

### Solution C: Accept the behavior
The pre-existing conditional rendering already unmounted views. The `key` prop didn't change the behavior, just made the animation work.

- Effort: None
- Risk: None -- but users still lose work

## Recommended Action

Solution A -- simple fix that preserves both the animation and user data.

## Technical Details

**Affected files:**
- `src/App.jsx` (line 89)

## Acceptance Criteria

- [ ] Switching from Brew tab to another tab and back preserves in-progress form edits
- [ ] View switch still triggers a fade-in animation
- [ ] prefers-reduced-motion still suppresses animation

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by frontend-races reviewer |

## Resources

- PR #7: feat(ux): Improve empty states and first-time experience
