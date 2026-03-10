---
title: "feat: Bean Library felt-board reskin"
type: feat
date: 2026-03-09
---

# Bean Library — Felt-Board Visual Reskin

Reskin the BeanLibrary page to use the dark felt-board aesthetic from the Hone reference (ModeA inline layout). Cosmetic only — all existing functionality untouched.

## Overview

Replace the current white-card-on-parchment bean list with a dark felt-board aesthetic featuring 3D letterpress text, dim metadata, and inline expand/collapse. The reference is `.context/attachments/hone-bean-selector.jsx` (ModeA variant).

**What stays the same:** All CRUD operations, rename cascade, brew counts, "Brew this bean" action, recipe section, brew list, add/edit bean modal, empty state content, delete confirmations.

**What changes:** Visual presentation of the bean list only.

## Acceptance Criteria

- [x] Bean list page has a dark felt-board background with subtle texture
- [x] Bean names display in uppercase letterpress style with 3D text shadows
- [x] Metadata (roaster/origin/process) shows as a dim secondary line
- [x] Brew count displays on the right side of each row (spaced digits like reference)
- [x] Clicking a bean expands inline actions (Brew/Edit/Delete) with dimming of other beans
- [x] Expanded content (recipes, brew list) renders with dark-themed styling
- [x] Empty state works within the dark theme
- [x] Add/Edit modal remains functional (can stay light — it's an overlay)
- [x] All 44px touch targets maintained
- [x] `prefers-reduced-motion` respected on new animations
- [x] `npm run build` passes cleanly

## Implementation Plan

### 1. Add font + design tokens to Tailwind config

**`index.html`** — Add Barlow Condensed to Google Fonts link:
```
Barlow+Condensed:wght@400;500;600;700;800
```

**`tailwind.config.js`** — Add:
```js
fontFamily: {
  // ...existing
  condensed: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
},
colors: {
  // ...existing
  felt: {
    900: '#1A1A1A',  // outer bg
    800: '#222222',  // board bg
    700: '#2E2824',  // board border/frame
    600: '#2C2420',  // toast/card bg
    500: '#908880',  // dim text
    400: '#706858',  // dimmer text
    300: '#5C5047',  // dimmest text
    200: '#B87333',  // copper accent (brew CTA, new badge)
    100: '#EFEBE5',  // primary text (cream)
    50:  '#F5F1EB',  // bright text variant
  },
},
keyframes: {
  // ...existing
  'board-slide': {
    '0%': { opacity: '0', transform: 'translateY(-3px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
},
animation: {
  // ...existing
  'board-slide': 'board-slide 200ms ease-out',
},
```

### 2. Add letterpress text utilities to index.css

**`src/index.css`** — Add custom utilities for the 3D text shadow (not expressible in Tailwind classes):

```css
/* Felt-board letterpress text effects */
.text-letterpress {
  text-shadow:
    0 -1px 0 rgba(255,255,255,0.18),
    0 1px 0 #0A0A0A,
    0 2px 0 #050505,
    0 2px 4px rgba(0,0,0,0.5),
    1px 1px 0 rgba(0,0,0,0.3),
    -0.5px 0 0 rgba(0,0,0,0.15);
}

.text-letterpress-dim {
  text-shadow:
    0 -0.5px 0 rgba(255,255,255,0.08),
    0 1px 0 #0A0A0A,
    0 1px 3px rgba(0,0,0,0.4);
}
```

### 3. Add felt texture wrapper component (inline in BeanLibrary)

A local `FeltBoard` wrapper at the top of BeanLibrary.jsx — a dark container with CSS-based felt texture (SVG noise + repeating linear gradients, same approach as the reference). This wraps the entire bean list content.

Key: uses negative margins or a full-bleed technique to break out of the `max-w-2xl mx-auto px-4` parent and fill the viewport width with the dark background.

### 4. Reskin the bean list rows

Replace the current white card pattern with flat inline rows:

**Current:**
```jsx
<div className="bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden">
  <button className="w-full px-5 py-4 flex items-center gap-4 ...">
```

**New (ModeA style):**
```jsx
<button className="w-full py-3 bg-transparent border-none flex flex-col gap-1
                   transition-opacity duration-250"
        style={{ opacity: isDimmed ? 0.3 : 1 }}>
  {/* Name row */}
  <div className="flex items-baseline justify-between w-full">
    <span className="font-condensed text-base font-bold text-felt-100 uppercase
                     tracking-[3.5px] text-letterpress">
      {bean.name}
    </span>
    <span className="font-condensed text-base font-bold text-felt-100 uppercase
                     tracking-[3.5px] text-letterpress flex-shrink-0 ml-3">
      {count} BREW{count !== 1 ? 'S' : ''}
    </span>
  </div>
  {/* Meta line */}
  <div className="font-condensed text-[11px] font-semibold text-felt-500 uppercase
                  tracking-[3px] text-letterpress-dim">
    {meta || 'NEW'}
  </div>
</button>
```

### 5. Reskin expanded content

When a bean is selected, show actions + content below the row with `animate-board-slide`:

- **"Brew this bean"** button → copper accent text (`text-felt-200`) with letterpress shadow, uppercase, `BREW ›` style
- **Edit/Delete** → dim text buttons (`text-felt-500`)
- **Recipe section** → dark-themed cards (`bg-felt-800/50 border border-felt-700`)
- **Brew list items** → dark row style instead of `bg-brew-50/50`
- **Delete confirmation** → dark variant (`bg-red-900/20 border-red-800/30`)

### 6. Reskin header + add button

**"Your Beans"** title → centered, uppercase, letterpress font
**"+ Add Bean"** button → copper accent or dim text style (not the current `bg-brew-600`)

### 7. Dark empty state (inline override)

Rather than modifying the shared `EmptyState` component, render a custom dark empty state inline when `beans.length === 0`:

```jsx
<div className="text-center py-16">
  <div className="text-4xl mb-4">...</div>
  <p className="font-condensed text-lg font-bold text-felt-100 uppercase
                tracking-[3.5px] text-letterpress">Your Bean Library</p>
  <p className="text-sm mt-2 text-felt-500 max-w-xs mx-auto">...</p>
</div>
```

### 8. Modal — keep light

The `BeanFormModal` uses the shared `Modal` component. Since it renders as an overlay on top of everything, it can remain in the existing light parchment style. No changes needed.

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add Barlow Condensed to font import |
| `tailwind.config.js` | Add `felt` colors, `condensed` font, `board-slide` animation |
| `src/index.css` | Add `.text-letterpress` and `.text-letterpress-dim` utilities |
| `src/components/BeanLibrary.jsx` | Reskin card list, header, expanded content, empty state |

## Learnings to Apply

- **Touch targets**: Maintain `min-h-[44px]` + flex centering on all interactive elements (documented in `docs/solutions/ui-bugs/touch-target-min-h-must-use-flex-centering.md`)
- **Typography scale**: Use `text-base` on inputs for iOS zoom prevention (documented in `docs/solutions/ui-bugs/typography-drift-requires-canonical-scale-table.md`)
- **Motion accessibility**: Pair all new animations with `motion-reduce:animate-none`
- **No layout wrapper baking**: The FeltBoard wrapper is BeanLibrary-specific, not extracted as a shared component

## Out of Scope

- No changes to Modal, EmptyState, or Collapsible shared components
- No changes to bean CRUD logic or storage layer
- No dark mode for other pages
- No changes to Header or MobileNav
