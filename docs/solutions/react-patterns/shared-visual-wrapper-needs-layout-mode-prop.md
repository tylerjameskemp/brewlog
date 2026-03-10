---
title: Shared Visual Wrapper Needs Layout Mode Prop
category: react-patterns
module: FeltBoard, BeanLibrary, BrewScreen
tags: [component-extraction, layout, visual-wrapper, conditional-styling, fullPage]
symptoms:
  - Double negative margins when wrapper is nested in a full-bleed parent
  - Rounded corners/borders appear when component should fill the viewport
  - Visual wrapper component can't be reused across card and full-page contexts
date: 2026-03-10
---

# Shared Visual Wrapper Needs Layout Mode Prop

## Problem

When extracting a visual wrapper component (background texture, decorative container) from one context and reusing it in another, the original context's layout assumptions (negative margins, rounded corners, borders) break in the new context. A card-style wrapper doesn't work as a full-page background without modification.

## Symptom

FeltBoard was extracted from BeanLibrary where it was an inset card with `-mx-4`, rounded corners (`md:rounded-xl`), and a thick border (`md:border-8`). When BeanPicker needed the same felt texture as a full-page background, using FeltBoard directly caused double negative margins (parent already had `-mx-4`) and unwanted rounded corners/borders at the viewport edge.

## Root Cause

The extracted component baked in one layout mode (inset card) without accounting for an alternate layout mode (full-page). The visual treatment (texture, gradients, noise) is shared, but the container styling (margins, rounding, borders) is context-dependent.

## Solution

Add a `fullPage` prop that toggles between card mode (default) and full-page mode:

```jsx
// FeltBoard.jsx
export default function FeltBoard({ children, fullPage }) {
  return (
    <div className={fullPage ? '' : '-mx-4 md:-mx-0'}>
      <div className={`bg-felt-800 relative overflow-hidden
                      shadow-[...]
                      ${fullPage
                        ? 'min-h-screen'
                        : 'rounded-none md:rounded-xl border-0 md:border-8 md:border-felt-700'
                      }`}>
        {/* Texture layers — shared between both modes */}
        <div className="relative z-[1]">{children}</div>
      </div>
    </div>
  )
}
```

Usage:

```jsx
// Card mode (BeanLibrary) — inset with margins and rounded corners
<FeltBoard>
  <div className="px-6 py-8">...</div>
</FeltBoard>

// Full-page mode (BeanPicker) — fills viewport, no card chrome
<div className="-mx-4 bg-felt-900 pb-32">
  <FeltBoard fullPage>
    <div className="px-6 pt-8 pb-6">...</div>
  </FeltBoard>
</div>
```

## Prevention

When extracting a visual wrapper component:

1. **Separate decoration from layout.** The texture/gradients/noise are the component's core concern. Margins, rounding, and borders are layout concerns that vary by context.
2. **Default to the most common mode.** Card mode is the default (no prop needed). Full-page is the opt-in variant.
3. **Keep it to a single boolean.** Don't over-engineer with multiple layout modes — two is usually sufficient (card vs full-page). If more modes emerge, refactor then.
4. **The caller controls outer margins.** In full-page mode, the parent handles `-mx-4` and background color fallback (`bg-felt-900`), not the wrapper.

## Related

- `docs/solutions/react-patterns/extracted-component-should-not-bake-layout-wrapper.md` — complementary: don't bake parent layout into extracted components
- `docs/solutions/logic-errors/standalone-component-references-parent-scope.md` — another extraction pitfall
