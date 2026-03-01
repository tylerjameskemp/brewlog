---
title: "min-h-screen on flex parent makes scrollIntoView scroll the document instead of the intended container"
category: react-patterns
tags: [css-layout, scroll, fixed-positioning, flex, mobile, brewscreen]
module: BrewScreen
symptoms:
  - "Timer moves when steps auto-advance"
  - "scrollIntoView scrolls the entire page instead of just one section"
  - "flex-1 overflow-y-auto child does not scroll — it expands instead"
  - "Fixed header/toolbar shifts position during scroll"
date: 2026-03-01
severity: P1
---

# min-h-screen on flex parent makes scrollIntoView scroll the document

## Problem

A timer display that should stay pinned at the top of the screen was moving every time `scrollIntoView` fired on step transitions. The layout used `min-h-screen flex flex-col` on the parent, with a `flex-1 overflow-y-auto` child for the scrollable step list. Despite `overflow-y-auto`, the steps container expanded to fit all content instead of scrolling internally.

## Root Cause

`min-h-screen` sets `min-height: 100vh` but imposes **no maximum height**. A flex container without a constrained height allows `flex-1` children to grow unbounded — the browser interprets "fill the remaining space" as "be as tall as your content." Since the child never overflows, `overflow-y-auto` has no effect.

When `scrollIntoView({ block: 'center' })` fires on a step card, the browser looks for the nearest scrollable ancestor. The steps container doesn't scroll (it expanded to fit), so the browser walks up to the document itself and scrolls the entire page — moving the timer, the controls, everything.

## Fix

Convert the parent from a normal-flow element to a **fixed viewport overlay** with a constrained height:

```jsx
// BEFORE — unconstrained, flex-1 child expands
<div className="min-h-screen flex flex-col">
  <div>Timer</div>
  <div className="flex-1 overflow-y-auto">Steps</div>
</div>

// AFTER — constrained, flex-1 child scrolls
<div className="fixed top-12 left-0 right-0 bottom-0 flex flex-col">
  <div className="shrink-0">Timer</div>
  <div className="flex-1 overflow-y-auto">Steps</div>
</div>
```

Also replace `scrollIntoView` with `container.scrollTo` to explicitly target the steps container:

```jsx
// BEFORE — scrolls nearest scrollable ancestor (the document)
ref.scrollIntoView({ behavior: 'smooth', block: 'center' })

// AFTER — scrolls only the steps container
const stepTop = ref.offsetTop - container.offsetTop
container.scrollTo({ top: Math.max(0, stepTop - 16), behavior: 'smooth' })
```

## Key Insight

**`min-h-screen` and `h-screen` produce fundamentally different flex behavior.** `min-h-screen` says "be at least this tall" — the container can grow taller, and flex children will grow with it. `h-screen` (or `fixed` with `top`/`bottom` constraints) says "be exactly this tall" — the container is capped, and `flex-1 overflow-y-auto` children actually scroll.

If you need a section to scroll independently within a flex layout, the flex parent **must** have a constrained height. Common ways to constrain:
- `h-screen` or `h-dvh`
- `fixed` with `top` + `bottom` (or `inset-0`)
- Explicit `max-h-[...]` or `h-[calc(...)]`

## Gotchas

1. **Header height coupling**: If you use `fixed top-12` to sit below a sticky header, the `top` value must match the header's `h-12`. Add a comment documenting this coupling — changing the header height without updating the overlay will create a gap or overlap.

2. **Nested `position: fixed`**: If the constrained parent uses `fixed`, children with `position: fixed` still position relative to the **viewport** (not the parent) — unless the parent has `transform`, `filter`, or `will-change`, which would create a containing block and break nested fixed elements.

3. **`transition-all` on items inside a scroll container**: When items change `border-width` or `padding` during transitions, `transition-all` animates those layout properties, causing reflow. Use explicit transition properties like `transition-[background-color,color,opacity,border-color]` instead.

## Related

- PR #19: fix(brewscreen): Pin ActiveBrew timer to top with high-contrast layout
- `src/components/BrewScreen.jsx` — ActiveBrew function
