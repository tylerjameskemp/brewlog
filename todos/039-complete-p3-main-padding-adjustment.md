---
status: pending
priority: p3
issue_id: "039"
tags: [code-review, layout, brewscreen]
dependencies: []
---

# Main container bottom padding not adjusted when MobileNav hidden

## Problem Statement

App.jsx `<main>` has `pb-32` for MobileNav clearance. When `brewFlowActive` hides MobileNav, the 128px bottom padding remains, creating dead space below BrewScreen's fixed CTAs.

## Proposed Solutions

Make padding responsive to flow state:
```jsx
<main className={`max-w-2xl mx-auto px-4 ${brewFlowActive ? 'pb-24' : 'pb-32'} md:pb-24`}>
```

- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] No excess bottom padding when MobileNav is hidden during BrewScreen flow

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created from architecture review | |
