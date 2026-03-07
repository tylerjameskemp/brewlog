---
title: "Touch target min-h must use flex centering to avoid layout inflation"
category: ui-bugs
tags: [touch-targets, mobile, accessibility, Tailwind, layout]
module: FlavorPicker, StepEditor, BeanLibrary
symptoms:
  - "Button content appears top-aligned after adding min-h-[44px]"
  - "Icon buttons have tiny tap areas on mobile"
  - "Tag pills grow taller but text floats to top"
created: 2026-03-06
---

# Touch target min-h must use flex centering to avoid layout inflation

## Problem

Adding `min-h-[44px]` alone to buttons that are below the 44px mobile touch target minimum causes content misalignment. The button grows taller but the visual content (text or icon) stays at its natural position instead of centering within the expanded area.

## Symptoms

- Button text or icon appears top-aligned within a taller-than-expected button.
- Tag pill buttons look stretched vertically with text near the top.
- Icon buttons have visible extra whitespace below the icon.

## Root Cause

`min-h-[44px]` only sets the minimum height. Without `flex items-center justify-center`, block-level content uses default flow positioning (top-aligned). The button meets the 44px requirement but looks wrong because the visual content isn't centered in the expanded space.

## Solution

Three-tier approach based on button type:

### 1. Full-width block buttons (already well-padded)

```jsx
{/* py-3 or py-4 already nearly 44px — just add the floor */}
<button className="w-full py-3 min-h-[44px] ...">Add Step</button>
```

No `flex` needed — block layout with generous padding already centers text.

### 2. Icon-only compact buttons (p-1, ~24px)

```jsx
{/* Both dimensions + centering */}
<button className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1 ...">
  <TrashIcon className="w-4 h-4" />
</button>
```

Need `min-w-[44px]` too — icons are small in both dimensions. `flex items-center justify-center` keeps the icon centered in the larger tap area.

### 3. Pill/tag buttons with text content (py-2.5, ~38px)

```jsx
{/* Height floor + centering */}
<button className="min-h-[44px] flex items-center justify-center py-2.5 px-4 ...">
  Chocolate
</button>
```

`flex items-center justify-center` prevents text from floating to the top of the taller pill.

## Decision Table

| Button Type | Classes to Add | Why |
|-------------|---------------|-----|
| Full-width block (`w-full py-3+`) | `min-h-[44px]` | Padding already centers content |
| Icon-only compact (`p-1`) | `min-w-[44px] min-h-[44px] flex items-center justify-center` | Both dimensions tiny, icon must center |
| Pill/tag with text (`py-2.5`) | `min-h-[44px] flex items-center justify-center` | Width OK, height needs floor + centering |

## Gotcha

Don't forget `min-w-[44px]` on icon buttons. An icon button that is 44px tall but only 24px wide still fails the touch target requirement — Apple's HIG specifies 44pt in both dimensions.

## References

- Phase 3 plan: `docs/plans/2026-03-06-refactor-phase3-polish-plan.md` (section 3.3)
- Apple HIG: 44pt minimum touch target
- WCAG 2.5.8: Target Size (Minimum) — 24px, but 44px is the practical mobile standard
