---
status: pending
priority: p3
issue_id: "038"
tags: [code-review, css, tailwind, brewscreen]
dependencies: []
---

# text-xs and text-base conflict on inline-edit inputs

## Problem Statement

Several inline-edit inputs in RecipeAssembly have both `text-xs` (for visual sizing) and `text-base` (for iOS auto-zoom prevention) in the same className string. Tailwind does not guarantee the last class in the HTML attribute wins — specificity depends on CSS generation order. This could cause either the visual sizing or the iOS prevention to fail unpredictably.

Affected lines: 300, 321-322, 331-332 of BrewScreen.jsx.

## Proposed Solutions

### Option A: Remove text-xs, use only text-base
- **Pros**: No specificity conflict, iOS zoom prevention guaranteed
- **Cons**: Inputs appear slightly larger than intended visual design
- **Effort**: Small

### Option B: Use inline style for font-size minimum
```jsx
className="w-12 text-center text-xs ..." style={{ fontSize: 'max(0.75rem, 16px)' }}
```
- **Pros**: Visual sizing preserved, iOS zoom prevented
- **Cons**: Inline style mixed with Tailwind
- **Effort**: Small

## Acceptance Criteria

- [ ] No Tailwind class conflict on font-size
- [ ] Inputs do not trigger iOS auto-zoom (font-size >= 16px)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created from pattern review | Pattern agent identified specificity risk |
