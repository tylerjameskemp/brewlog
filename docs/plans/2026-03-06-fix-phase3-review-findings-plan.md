---
title: "Fix Phase 3 Review Findings"
type: fix
date: 2026-03-06
---

# Fix Phase 3 Review Findings (091-097)

## Overview

Address all 7 findings from the Phase 3 code review: 1 P2 (touch targets) and 6 P3 (consistency polish). All changes are CSS class modifications or comment additions — no logic, no data model changes.

## Changes

### 4.1 — EquipmentSetup touch targets (P2, todo 091)

**File:** `src/components/EquipmentSetup.jsx`

Add `min-h-[44px] flex items-center justify-center` to V60 Material buttons (~line 153) and Filter Type buttons (~line 198). These are pill/tag buttons with `py-2.5` — per the documented touch target pattern, they need flex centering to prevent content drift.

**Before:**
```jsx
className={`px-4 py-2.5 rounded-lg border text-sm capitalize
  ${form.dripper === mat ? '...' : '...'}`}
```

**After:**
```jsx
className={`px-4 py-2.5 rounded-lg border text-sm capitalize
  min-h-[44px] flex items-center justify-center
  ${form.dripper === mat ? '...' : '...'}`}
```

Same pattern for both button groups. The `min-h-[44px]` applies to each `<button>`, not the container — each button individually meets the target.

- [x] V60 Material buttons have `min-h-[44px] flex items-center justify-center`
- [x] Filter Type buttons have `min-h-[44px] flex items-center justify-center`

### 4.2 — tracking-widest → tracking-wider (P3, todo 092)

**File:** `src/components/BrewScreen.jsx`

Four `tracking-widest` instances need to become `tracking-wider` to match the majority pattern (14 other labels already use `tracking-wider`).

| Line | Label context |
|------|--------------|
| ~228 | "Recipe" back-button label |
| ~518 | "Pour Steps" section header |
| ~545 | "Equipment" section header |
| ~1135 | "Brew Complete" / "Log Brew" eyebrow |

Use `replace_all` on the string `tracking-widest` within BrewScreen.jsx — all 4 are the same change.

- [x] No `tracking-widest` remains in BrewScreen.jsx

### 4.3 — Rating label text-[10px] → text-xs (P3, todo 093)

**File:** `src/components/BrewScreen.jsx`

Line ~1326: `text-[10px]` → `text-xs` on rating number labels. Per the typography scale, `text-[10px]` is for badges/diff tags only; rating labels are readable text and should be `text-xs` (matching BrewForm).

```jsx
// Before
<div className="text-[10px] mt-0.5">{r.label}</div>
// After
<div className="text-xs mt-0.5">{r.label}</div>
```

No wrapping risk: buttons are `flex-1` (~64px each on 320px), label text is short (e.g., "Great", "OK").

- [x] Rating labels use `text-xs` (matches BrewForm)

### 4.4 — Compare toggle touch target (P3, todo 094)

**File:** `src/components/BrewHistory.jsx`

Line ~302: Add `min-h-[44px]` to Compare toggle button. Text-only button — no `flex items-center` needed (block layout centers text naturally with `py-2.5`).

- [x] Compare toggle has `min-h-[44px]`

### 4.5 — Focus ring outliers (P3, todo 095)

**File 1:** `src/components/StepEditor.jsx` — line ~240
- Change: `focus:ring-1 focus:ring-brew-300` → `focus:ring-2 focus:ring-brew-400`
- This is the technique note input. Other inputs in StepEditor already use the standard pattern.

**File 2:** `src/components/BrewTrends.jsx` — lines ~86 and ~135
- Change: `focus:ring-brew-300` → `focus:ring-brew-400` (ring-2 already correct)
- Both are the bean filter `<select>`, rendered in two conditional branches (empty state and normal).

Scope is limited to these 3 confirmed outliers — other inputs already use `focus:ring-2 focus:ring-brew-400`.

- [x] StepEditor technique note uses `focus:ring-2 focus:ring-brew-400`
- [x] BrewTrends select (both branches) uses `focus:ring-brew-400`

### 4.6 — RateThisBrew space-y-4 (P3, todo 096)

**File:** `src/components/BrewScreen.jsx`

Replace per-card `mb-4` with `space-y-4` on a wrapping div around the 3 cards only. The summary header keeps its `mb-6` and stays outside the wrapper.

**Structure:**
```jsx
<div className="px-4 pt-4 pb-28">
  {/* Summary header — keeps mb-6, stays outside wrapper */}
  <div className="text-center mb-6">...</div>

  {/* Cards wrapper */}
  <div className="space-y-4">
    {/* Step Results (conditional) — remove mb-4 */}
    {!isManual && steps.length > 0 && (
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">...</div>
    )}
    {/* Brew Details — remove mb-4 */}
    <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">...</div>
    {/* Tasting — remove mb-4 */}
    <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">...</div>
  </div>

  {/* Done button — fixed, outside flow */}
  ...
</div>
```

`space-y-4` handles the conditional Step Results card cleanly — no dangling margin when absent. The "Done" button is fixed-position, unaffected by card spacing.

- [x] Cards wrapped in `space-y-4` div
- [x] No `mb-4` on individual cards
- [x] Summary header retains `mb-6` outside wrapper

### 4.7 — Timer gray-900 comment (P3, todo 097)

**File:** `src/components/BrewScreen.jsx`

Add inline comment at ~line 775 explaining the intentional `text-gray-900`:

```jsx
: 'text-gray-900'  // Intentional — neutral near-black for idle timer; status colors (red/amber/green) are semantic, not brand
```

- [x] Timer `text-gray-900` has explanatory comment

## Implementation Order

All changes are independent — no dependencies between items. Execute in order 4.1–4.7 for clean diffs, then build + test once at the end.

## Verification

- [x] `npx vite build` passes
- [x] `npm test` passes (87 tests)
- [x] Grep confirms: no `tracking-widest` in BrewScreen, no `focus:ring-brew-300` in StepEditor/BrewTrends
- [x] Mark todos 091-097 as complete

## References

- Todos: `todos/091-*` through `todos/097-*`
- Touch target pattern: `docs/solutions/ui-bugs/touch-target-min-h-must-use-flex-centering.md`
- Typography scale: `docs/solutions/ui-bugs/typography-drift-requires-canonical-scale-table.md`
- Phase 3 plan: `docs/plans/2026-03-06-refactor-phase3-polish-plan.md`
