---
status: pending
priority: p3
issue_id: "021"
tags: [code-review, performance, brewscreen]
dependencies: []
---

# Use getBoundingClientRect for auto-scroll in ActiveBrew

## Problem Statement

The auto-scroll logic in ActiveBrew uses `offsetTop` to calculate scroll position. `offsetTop` is relative to the nearest offset parent, which makes the calculation sensitive to DOM structure changes. If an intermediate wrapper with `position: relative` were added between the steps container and the step cards, the calculation would silently break.

## Findings

- Architecture review identified that `getBoundingClientRect()` is immune to offset parent chain changes
- Current code at `src/components/BrewScreen.jsx:553-557` uses `ref.offsetTop - container.offsetTop`
- Works correctly today but fragile to future DOM restructuring

## Proposed Solutions

### Option A: Switch to getBoundingClientRect
```js
const rect = ref.getBoundingClientRect()
const containerRect = container.getBoundingClientRect()
container.scrollTo({
  top: container.scrollTop + (rect.top - containerRect.top) - 16,
  behavior: 'smooth'
})
```
- Pros: Immune to DOM restructuring, accounts for scroll position automatically
- Cons: Slightly more expensive (forces layout reflow if DOM is dirty)
- Effort: Small
- Risk: Low

## Technical Details

- Affected files: `src/components/BrewScreen.jsx` (ActiveBrew auto-scroll effect)

## Acceptance Criteria

- [ ] Auto-scroll works correctly with getBoundingClientRect
- [ ] No visible behavior change
- [ ] Works if intermediate DOM wrappers are added between container and step cards
