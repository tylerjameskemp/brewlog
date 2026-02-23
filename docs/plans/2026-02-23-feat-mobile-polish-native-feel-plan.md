---
title: "feat: Mobile Polish — Native-Feel Mobile Experience"
type: feat
date: 2026-02-23
---

# feat: Mobile Polish — Native-Feel Mobile Experience

## Overview

Transform BrewLog from a desktop-first layout squeezed into a phone into an app that **feels native on mobile**. The app currently uses zero responsive breakpoints, has 20+ touch targets under the 44px minimum, and crams a 5-element header into 375px that overflows. This plan addresses all of these issues systematically.

## Problem Statement

The app has **no mobile-specific code whatsoever** — no responsive Tailwind prefixes (`sm:`, `md:`, `lg:`), no media queries, no touch-specific handling. Key issues:

1. **Header nav overflows** — Logo + 4 tabs + gear = ~436px, exceeding 375px iPhone SE viewport
2. **20+ interactive elements under 44px** — Body tags, flavor tags, issue tags, delete/edit links, modal close buttons, comparison circles all fail Apple HIG minimum
3. **No bottom navigation** — Primary nav at top of screen requires thumb stretching on modern tall phones
4. **iOS auto-zoom** — `text-sm` (14px) inputs trigger Safari's auto-zoom on focus
5. **No safe area insets** — Bottom nav will overlap iPhone home indicator
6. **Save button occlusion** — Insufficient padding after adding fixed bottom nav

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Breakpoint strategy | Mobile-first; `md:` (768px) threshold | Below 768px = bottom nav + minimal header. Above = current top-tab layout |
| Bottom nav height | 64px + safe area inset | Standard mobile nav height; safe area adds ~34px on notched iPhones |
| Top header (mobile) | Logo + gear icon only, `h-12` | Tabs move to bottom nav; header stays for branding + settings access |
| Top header (desktop) | Keep current layout unchanged | No regressions on desktop |
| Bottom nav icons | SVG icons + text labels | Coffee cup (New Brew), bean (Beans), clock (History), chart (Trends) |
| Input font size | `text-base` universally | Prevents iOS auto-zoom; 14px vs 16px difference is negligible |
| Touch target approach | Increase padding on tags/buttons | Simpler than invisible hit areas; visual density acceptable at 44px |
| FlavorPicker scroll | Category buttons: `flex-wrap` (stay as-is); Selected flavors at top: `overflow-x-auto` horizontal scroll | Categories need 2 rows at most; selected flavors benefit from horizontal scroll to save vertical space |
| Comparison layout | Keep 3-column, tighten padding | Layout works at 375px per team's existing validation |
| Minimum viewport | 375px (iPhone SE) | No support below 375px |
| Modal backdrop dismiss | Yes, tap backdrop to close | Standard mobile convention |
| Unsaved changes warning | No (MVP) | Pre-fill behavior makes re-entry fast |

## Proposed Solution

### Phase 1: Foundation (Global Fixes)

Update `index.html` and global CSS for mobile fundamentals.

#### 1.1 Viewport Meta Tag

**File:** `index.html`

```html
<!-- Before -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

#### 1.2 Global Touch & Safe Area CSS

**File:** `src/index.css`

Add these utilities:

```css
/* Prevent 300ms tap delay and accidental double-tap zoom */
html {
  touch-action: manipulation;
}

/* Safe area padding utilities */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.pt-safe {
  padding-top: env(safe-area-inset-top, 0px);
}
```

#### 1.3 Input Font Size Fix

**Files:** `BrewForm.jsx`, `BeanLibrary.jsx` (BeanFormModal), `EquipmentSetup.jsx`, `FlavorPicker.jsx`

Change all `<input>`, `<select>`, and `<textarea>` elements from `text-sm` to `text-base`:

```jsx
// Before (triggers iOS auto-zoom)
className="w-full p-3 rounded-xl border border-brew-200 text-sm ..."

// After (prevents iOS auto-zoom)
className="w-full p-3 rounded-xl border border-brew-200 text-base ..."
```

This applies to approximately 15-20 form inputs across the app.

---

### Phase 2: Bottom Navigation Bar

Create a new `MobileNav.jsx` component and restructure the header.

#### 2.1 New Component: `MobileNav.jsx`

**File:** `src/components/MobileNav.jsx` (new)

A fixed bottom nav bar shown only below `md:` breakpoint.

```jsx
// Fixed bottom, full width, 4 tabs with icons + labels
// bg-white border-t border-brew-100
// Uses safe-area-inset-bottom for notched iPhones
// z-10 to match header z-index
// Height: h-16 (64px) + pb-safe

const tabs = [
  { id: 'brew',    label: 'New Brew', icon: <CoffeeIcon /> },
  { id: 'beans',   label: 'Beans',    icon: <BeanIcon /> },
  { id: 'history', label: 'History',  icon: <ClockIcon /> },
  { id: 'trends',  label: 'Trends',   icon: <ChartIcon /> },
]
```

Active tab: `text-brew-600 font-medium`; inactive: `text-brew-400`. Each tab button is a full flex column with min-height 44px tap target.

Icons should be simple inline SVGs (no icon library dependency), approximately 20x20px.

#### 2.2 Update Header for Mobile

**File:** `src/components/Header.jsx`

- Hide nav tabs below `md:` breakpoint: add `hidden md:flex` to the `<nav>` element
- Keep logo and gear icon visible at all sizes
- Reduce mobile header height: `h-12 md:h-14`

```jsx
// Nav tabs: hidden on mobile, shown on desktop
<nav className="hidden md:flex gap-1">
  {tabs.map(tab => (...))}
</nav>
```

#### 2.3 Update App.jsx Layout

**File:** `src/App.jsx`

- Import and render `MobileNav` below `<main>`, visible only below `md:`
- Update main padding: `pb-32 md:pb-24` (128px on mobile for bottom nav + safe area; 96px on desktop)
- Pass `activeView` and `setActiveView` to `MobileNav`

```jsx
<div className="min-h-screen bg-brew-50">
  <Header ... />
  <main className="max-w-2xl mx-auto px-4 pb-32 md:pb-24">
    {/* Active view */}
  </main>
  <MobileNav
    activeView={activeView}
    onChangeView={setActiveView}
    className="md:hidden"
  />
</div>
```

---

### Phase 3: Touch Target Fixes

Systematically fix all elements under 44px. Grouped by component.

#### 3.1 FlavorPicker.jsx

| Element | Current | Fix |
|---------|---------|-----|
| Category buttons | `px-3 py-1.5` (~28px) | `px-4 py-2.5` (~44px) |
| Flavor tags | `px-3 py-1.5` (~28px) | `px-4 py-2.5` (~44px) |
| Selected flavor remove buttons | `px-3 py-1` (~24px) | `px-3 py-2` (~40px) + ensure min-h of 44px via `min-h-[44px]` |
| Custom flavor input | `px-3 py-2` (~36px) | `p-3` (~44px) to match other form inputs |
| Custom "Add" button | `px-4 py-2` (~36px) | `px-4 py-3` (~48px) |

Also: make selected flavors row horizontally scrollable:
```jsx
// Selected flavors container
<div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
  {selected.map(flavor => (...))}
</div>
```

#### 3.2 BrewForm.jsx

| Element | Current | Fix |
|---------|---------|-----|
| Body option tags | `px-3 py-1.5` (~28px) | `px-4 py-2.5` (~44px) |
| Issue tags | `px-3 py-1.5` (~28px) | `px-4 py-2.5` (~44px) |

Also: style the range input (grind slider) with custom thumb:

```css
/* In src/index.css */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #a0673c; /* brew-500 */
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #a0673c;
  border: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: #f5e6d0; /* brew-100 */
}

input[type="range"]::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: #f5e6d0;
}
```

#### 3.3 BeanLibrary.jsx

| Element | Current | Fix |
|---------|---------|-----|
| "Edit bean" link | `text-xs`, no padding (~20px) | `text-sm px-3 py-2` button-style (~40px) + `min-h-[44px]` |
| "Delete bean" link | `text-xs`, no padding (~20px) | `text-sm px-3 py-2` button-style (~40px) + `min-h-[44px]` |
| Delete confirmation buttons | `text-xs`, no padding (~20px) | `text-sm px-4 py-2.5` proper button styling |
| TagSelectWithOther tags (origins, processes) | `px-3 py-1.5` (~28px) | `px-4 py-2.5` (~44px) |
| Modal close "X" button | `text-xl`, no padding (~28px) | `p-2 min-w-[44px] min-h-[44px] flex items-center justify-center` |

#### 3.4 BrewHistory.jsx

| Element | Current | Fix |
|---------|---------|-----|
| "Delete this brew" link | `text-xs`, no padding (~20px) | `text-sm px-3 py-2 min-h-[44px]` button-style |
| Compare toggle button | `px-4 py-2` (~36px) | `px-4 py-2.5` (~44px) |
| Comparison selection circles | `w-6 h-6` (24px) | `w-8 h-8` (32px) with outer tap area via parent padding |

#### 3.5 EquipmentSetup.jsx

| Element | Current | Fix |
|---------|---------|-----|
| Dripper material buttons | `px-4 py-2` (~36px) | `px-4 py-2.5` (~44px) |
| Filter type buttons | `px-4 py-2` (~36px) | `px-4 py-2.5` (~44px) |
| Modal close "X" button | No padding (~28px) | `p-2 min-w-[44px] min-h-[44px]` |

#### 3.6 Header.jsx

| Element | Current | Fix |
|---------|---------|-----|
| Settings gear button | `p-2` (~32px) | `p-3` (~44px) |
| Desktop nav tabs (unchanged for mobile since hidden) | `px-4 py-2` | No change needed — hidden on mobile |

#### 3.7 SettingsMenu.jsx

| Element | Current | Fix |
|---------|---------|-----|
| Modal close buttons (Import Confirmation) | No explicit padding | `p-2 min-w-[44px] min-h-[44px]` |

---

### Phase 4: Layout & Overflow Fixes

#### 4.1 Settings Dropdown Positioning

**File:** `SettingsMenu.jsx`

Ensure dropdown doesn't clip on narrow screens:

```jsx
// Add max-width constraint and ensure left edge stays in viewport
className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] ..."
```

#### 4.2 Modal Backdrop Dismiss

**Files:** `EquipmentSetup.jsx`, `BeanLibrary.jsx` (BeanFormModal), `SettingsMenu.jsx` (ImportConfirm)

Add `onClick` handler to the backdrop overlay that calls the close/dismiss function. Ensure the modal content `div` has `onClick={e => e.stopPropagation()}` to prevent backdrop dismiss when tapping inside the modal.

```jsx
{/* Backdrop */}
<div
  className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
  onClick={onClose}
>
  {/* Modal content — stop propagation */}
  <div
    className="bg-white rounded-2xl ..."
    onClick={e => e.stopPropagation()}
  >
    {/* ... */}
  </div>
</div>
```

#### 4.3 BrewHistory Truncation

**File:** `BrewHistory.jsx`

Ensure bean name and roaster text handle narrow widths:

- Bean name: already has `truncate` — verify `max-w` is set or parent constrains it
- Roaster: add `truncate` class if missing
- Summary row: ensure the flex layout gives enough room to the name by using `min-w-0` on the flex child containing the name (required for `truncate` to work inside flex)

```jsx
// Fix truncate in flex container
<div className="flex-1 min-w-0">
  <span className="truncate block">{brew.beanName}</span>
  <span className="truncate block text-xs text-brew-400">{brew.roaster}</span>
</div>
```

---

### Phase 5: Form Stacking & Spacing

#### 5.1 BrewForm Grid Responsiveness

**File:** `BrewForm.jsx`

The Timing section's 3-column grid is tight at 375px. Make it responsive:

```jsx
// Timing section: 2 columns on mobile, 3 on desktop
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  <div>Bloom Time</div>
  <div>Bloom Water</div>
  <div className="col-span-2 md:col-span-1">Total Time</div>
</div>
```

Total Time takes a full row on mobile (spans 2 columns), which gives it more room and visual weight as the "result" measurement.

#### 5.2 Consistent Section Spacing

Verify all sections in BrewForm use consistent `space-y-4` and that collapsed sections have no visual gaps. No changes expected here — the current `Section` component handles this well.

---

## Acceptance Criteria

### Must Have
- [x] App renders without horizontal overflow at 375px width on all 4 views
- [x] Fixed bottom nav bar visible on screens below 768px with 4 labeled icon tabs
- [x] Top header shows only logo + gear icon on mobile; full tab bar on desktop
- [x] All interactive elements (buttons, tags, links, inputs) have minimum 44px touch target
- [x] Form inputs use `text-base` (16px) to prevent iOS auto-zoom
- [x] `viewport-fit=cover` set in `index.html`
- [x] Safe area insets applied to bottom nav for notched iPhones
- [x] Save Brew button fully visible and tappable above bottom nav
- [x] Selected flavors row scrolls horizontally when overflow occurs
- [x] Modal backdrops dismissable by tap
- [x] Grind slider has custom-styled 28px thumb
- [x] No regressions on desktop (md: and above) layout

### Should Have
- [x] `touch-action: manipulation` applied globally
- [x] Timing grid responsive: 2-col on mobile, 3-col on desktop
- [x] Bean name / roaster text truncates cleanly in flex layouts with `min-w-0`
- [x] Settings dropdown constrained to viewport width
- [x] Delete/edit actions styled as proper buttons, not bare text links

### Nice to Have
- [x] Comparison selection circles enlarged for better tap accuracy
- [ ] Smooth transitions when switching between bottom nav tabs

## File Change Summary

| File | Type | Changes |
|------|------|---------|
| `index.html` | Edit | Add `viewport-fit=cover` to viewport meta |
| `src/index.css` | Edit | Add `touch-action`, safe area utilities, range input thumb styles |
| `src/components/MobileNav.jsx` | **New** | Fixed bottom nav bar component with 4 icon+label tabs |
| `src/App.jsx` | Edit | Import MobileNav, update `pb-*` responsive padding |
| `src/components/Header.jsx` | Edit | Hide nav tabs on mobile (`hidden md:flex`), reduce mobile height |
| `src/components/BrewForm.jsx` | Edit | Input font sizes, body/issue tag padding, timing grid responsive |
| `src/components/FlavorPicker.jsx` | Edit | Category/tag padding, selected flavors horizontal scroll, input sizing |
| `src/components/BrewHistory.jsx` | Edit | Delete link sizing, compare button padding, truncation fixes |
| `src/components/BeanLibrary.jsx` | Edit | Edit/delete button sizing, tag padding, modal close button, backdrop dismiss |
| `src/components/EquipmentSetup.jsx` | Edit | Button padding, modal close button, backdrop dismiss |
| `src/components/SettingsMenu.jsx` | Edit | Dropdown positioning, modal close button, backdrop dismiss |

## References

### Internal
- Touch target standard (44px): established in `docs/plans/2026-02-23-feat-bean-library-tab-plan.md:257`
- Modal scroll pattern (`max-h-[90vh]`): `docs/plans/2026-02-23-feat-bean-library-tab-plan.md:178`
- Comparison layout validation at 320px+: `docs/plans/2026-02-23-feat-brew-comparison-mode-plan.md:218`
- Brew color palette: `tailwind.config.js`
- Current tab structure: `src/components/Header.jsx`

### External
- [Apple HIG: Touch Targets](https://developer.apple.com/design/human-interface-guidelines/accessibility#Touch-targets) — 44pt minimum
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) — mobile-first breakpoints
- [Safari iOS viewport-fit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) — `viewport-fit=cover` + `env(safe-area-inset-*)`
