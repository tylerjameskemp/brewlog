---
status: pending
priority: p2
issue_id: "036"
tags: [code-review, react-patterns, state-management, brewscreen]
dependencies: []
---

# onFlowChange useEffect cleanup fires on every phase change

## Problem Statement

The `onFlowChange` effect in BrewScreen fires its cleanup function on every `phase` change, not just on unmount. When transitioning from 'recipe' to 'brew', the sequence is:
1. Cleanup fires: `onFlowChange(false)` — briefly sets `brewFlowActive` to false
2. New effect fires: `onFlowChange(true)` — sets it back to true

React 18 should batch these, but the semantic incorrectness could cause a brief MobileNav flash on slower devices or in edge cases.

## Findings

- **Simplicity reviewer**: Flagged as overly defensive; recommended removing cleanup or splitting into two effects
- **Architecture reviewer**: Confirmed the cleanup is correct for unmount but problematic for phase transitions; recommended centralizing reset in App.jsx

## Proposed Solutions

### Option A: Split into two effects (Recommended)
```jsx
// Report phase changes
useEffect(() => {
  onFlowChange(phase !== 'pick')
}, [phase, onFlowChange])

// Reset on unmount only
useEffect(() => {
  return () => onFlowChange(false)
}, [onFlowChange])
```
- **Pros**: Eliminates transient false state between phase transitions
- **Cons**: Two effects instead of one
- **Effort**: Small
- **Risk**: Low

### Option B: Centralize reset in App.jsx
Remove cleanup from BrewScreen. Add reset to App's view-change effect:
```jsx
useEffect(() => {
  if (view !== 'brew') {
    setBrewFlowActive(false)
    setEditingBrew(null)
    setBrewingBean(null)
  }
}, [view])
```
- **Pros**: State reset logic lives in the component that owns the state
- **Cons**: BrewScreen unmount no longer self-cleans
- **Effort**: Small
- **Risk**: Low

## Technical Details

- **File**: `src/components/BrewScreen.jsx` lines 1073-1077
- **File**: `src/App.jsx` lines 63-68 (view-change cleanup)

## Acceptance Criteria

- [ ] Transitioning between recipe/brew/commit phases does NOT briefly set `brewFlowActive` to false
- [ ] Navigating away from brew view correctly resets `brewFlowActive` to false
- [ ] MobileNav does not flash during phase transitions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created from multi-agent code review | Simplicity + architecture agents both flagged |
