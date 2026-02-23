---
status: complete
priority: p2
issue_id: "004"
tags: [code-review, performance, react]
dependencies: []
---

# Prevent hidden DOM bloat from always-rendered expand/collapse content

## Problem Statement

The expand/collapse pattern change (from `{isExpanded && <Content>}` to max-height CSS transitions) means every brew card and bean card now renders its full expanded detail content into the DOM even when collapsed. For BrewHistory with many brews, this creates thousands of hidden DOM nodes that increase memory usage and slow React reconciliation.

## Findings

- **Performance reviewer**: P2 -- at 200 brews, ~3000-4000 hidden DOM nodes
- **Simplicity reviewer**: Flagged as making the UX worse (sluggish collapse animation) while adding DOM cost
- **Pattern reviewer**: Noted this is duplicated identically in 3 places

**Locations:**
- `src/components/BrewHistory.jsx` (lines 536-606)
- `src/components/BeanLibrary.jsx` (lines 174-178)
- `src/components/BrewForm.jsx` (lines 413-419)

## Proposed Solutions

### Solution A: Gate inner content while keeping transition container (Recommended)

```jsx
<div className={`overflow-hidden transition-all duration-300 ... ${
  isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
}`}>
  {isExpanded && (
    <div className="px-5 pb-5 border-t border-brew-50">
      {/* actual content */}
    </div>
  )}
</div>
```

- Effort: Small (15 min)
- Risk: Low -- collapse animation still works on empty container
- Pros: Eliminates DOM bloat, keeps open animation
- Cons: Collapse animation is slightly less smooth (empty container collapsing)

### Solution B: Revert to original conditional rendering
Remove max-height transitions entirely, go back to `{isExpanded && <Content>}`.

- Effort: Small
- Risk: None
- Pros: Simplest, best performance, least code
- Cons: No animation at all

## Recommended Action

Solution A as a compromise, or Solution B if animations aren't valued for these elements.

## Technical Details

**Affected files:**
- `src/components/BrewHistory.jsx`
- `src/components/BeanLibrary.jsx`
- `src/components/BrewForm.jsx`

## Acceptance Criteria

- [ ] Collapsed brew/bean cards do not render detail content in the DOM
- [ ] Expanding a card still shows content (with or without animation)
- [ ] No visual regression in the expanded state

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by performance and simplicity reviewers |

## Resources

- PR #7: feat(ux): Improve empty states and first-time experience
