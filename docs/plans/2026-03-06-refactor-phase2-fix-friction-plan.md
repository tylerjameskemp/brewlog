---
title: "Phase 2 UI Audit — Fix Friction"
type: refactor
date: 2026-03-06
---

# Phase 2 UI Audit — Fix Friction

## Overview

Phase 1 pruned the app from ~14 sections to ~6 clean surfaces. Phase 2 makes what's left work smoothly — bigger text during the brew, smarter previews during selection, and recipe/template consolidation.

**Scope:** 8 items from the original audit (2.1–2.10). Item 2.6 was completed in Phase 1 remainder (PR #36). Item 2.9 is a non-issue — recipes already use `beanId` (UUID), so bean renames don't break recipe links.

## Items

### Group A: Teleprompter Improvements (2.1, 2.2, 2.3)

All three modify the ActiveBrew teleprompter in `src/components/BrewScreen.jsx`. Should be designed as a single layout pass since they interact visually.

---

#### 2.1 — Teleprompter Text Size

**Problem:** Current step name is `text-sm` (14px), water target is `text-xs` (12px). Unreadable at arm's length while pouring.

**Current code:** `BrewScreen.jsx:802-810`

**Fix:**
- [ ] Current step name: `text-sm` → `text-xl font-bold` (20px)
- [ ] Water target pill: `text-xs` → `text-base font-semibold` (16px)
- [ ] Time range: `text-xs` → `text-sm font-mono` (14px)
- [ ] Technique note: `text-sm` → `text-base` (16px)
- [ ] Tap prompt ("Tap when you start"): `text-[11px]` → `text-xs` (12px)
- [ ] Verify layout doesn't break with long step names (e.g. "Pour 1 (Sweet) — slow spiral") — the `pr-8` skip button area needs checking
- [ ] Past/future steps stay at `text-sm` — the size contrast naturally emphasizes the current step

**Edge cases:**
- Long step names may wrap at `text-xl`. Use `leading-snug` to keep multi-line compact.
- Large water targets (1000g+ for batch) — the pill should not overflow.

---

#### 2.2 — Teleprompter "Up Next" Visibility

**Problem:** Next step differs from other future steps only by `opacity-70` vs `opacity-40`. After tapping, users can't quickly see what comes next.

**Current code:** `BrewScreen.jsx:849-873`, `isNext` computed at line 720

**Fix:**
- [ ] Give the "up next" step a card treatment: `bg-brew-50/50 border border-brew-200/50 rounded-lg px-3 py-2`
- [ ] Add "UP NEXT" label: `<span className="text-[10px] uppercase tracking-wider text-brew-400 font-semibold">Up next</span>` above the step name
- [ ] Show technique note on the up-next step (currently only shown on current step). The note is most useful right before you start the step.
- [ ] Bump up-next text to `text-base` (vs `text-sm` for other future steps) for additional differentiation
- [ ] When current step is the last step, no "up next" renders — this is already handled by `isNext` being false
- [ ] **Fix skip-step bug:** `isNext` at line 720 uses `i === currentStepIdx + 1`. If the immediately-next step is skipped, `isNext` points to it but it renders in the skipped branch (lines 727-738), so no future step gets the "up next" treatment. Fix: `isNext` should target the first non-skipped future step.

**Suggested `isNext` fix:**
```jsx
// Before:
const isNext = isFuture && i === currentStepIdx + 1 && hasStarted

// After:
const isNext = isFuture && !isSkipped && hasStarted &&
  !steps.slice(currentStepIdx + 1, i).some(
    (s, j) => !skippedSteps[steps[currentStepIdx + 1 + j]?.id]
  ) // first non-skipped future step
```
Or simpler: compute `nextStepIdx` once outside the loop as the first index after `currentStepIdx` where the step is not skipped.

**Edge cases:**
- Single-step recipe: no "up next" — handled naturally.
- All remaining steps skipped: no "up next" — handled naturally.
- Viewport budget: on iPhone 13 Mini (~510px for steps after timer), current step card (~100px) + up-next card (~80px) leaves ~330px for past/future. Acceptable.

---

#### 2.3 — Target Time Range Indicator (Green/Amber/Red)

**Problem:** During the brew, the timer only turns red when over the max. No green "on target" or amber "approaching limit" feedback.

**Current code:**
- `computeTimeStatus()` in `storage.js:750-758` returns `{ status: 'under'|'over'|'on-target', delta }`
- Timer color at `BrewScreen.jsx:649-651`: binary gray/red
- Progress bar at `BrewScreen.jsx:662-663`: binary brew/red

**Fix — timer text + progress bar color:**
- [ ] Wire `computeTimeStatus()` into ActiveBrew, called on each render with current `timer.elapsed`
- [ ] Add `approaching` status: new state in `computeTimeStatus()` when within 15s of `targetMax` and still `on-target`. Returns `{ status: 'approaching', delta }`.
- [ ] Color mapping for timer text:
  - `under` → default `text-gray-900` (neutral — the normal state while brewing)
  - `on-target` → `text-green-600`
  - `approaching` → `text-amber-600`
  - `over` → `text-red-600`
- [ ] Color mapping for progress bar:
  - `under` → `bg-brew-500` (current default)
  - `on-target` → `bg-green-500`
  - `approaching` → `bg-amber-500`
  - `over` → `bg-red-500`
- [ ] When no target time is set (`computeTimeStatus` returns null), keep current default colors
- [ ] **Accessibility:** Add a small text label below the timer: "On target", "15s left", "12s over" — cannot rely on color alone (WCAG 1.4.1). Use `text-xs` to keep it subtle.
- [ ] Fallback `totalDuration` for `computeTimeStatus`: use `getTotalDuration(steps)` from the recipe, same as RateThisBrew does

**`computeTimeStatus` update in storage.js:**
```js
// Add after the 'on-target' check:
const APPROACHING_THRESHOLD_SECS = 15
if (status === 'on-target' && (tMax - totalTime) <= APPROACHING_THRESHOLD_SECS) {
  return { status: 'approaching', delta: tMax - totalTime }
}
```

**Edge cases:**
- No target time: indicator hidden, default colors. Already handled by null return.
- Single target with 10s tolerance: green window is narrow (20s). Amber triggers in the last 15s of that 20s window, leaving only 5s of pure green. Consider: amber threshold should be `min(15, (tMax - tMin) / 2)` so it doesn't consume most of the green zone.
- Progress bar past 100%: currently capped at `Math.min(..., 1)`. Keep this — the bar fills and turns red, the text label tells the story.

---

### Group B: Quick Wins (2.4, 2.5, 2.10)

Independent changes that can be done in any order.

---

#### 2.4 — Bean Picker Recipe Preview

**Problem:** BeanPicker shows only bean name, roaster, and origin. No indication of what recipe/params you'll get, so you can't tell which beans you've dialed in.

**Current code:** `BeanPicker` at `BrewScreen.jsx:38-93`, receives `{ beans, onSelect }`

**Fix:**
- [ ] In BrewScreen, pre-compute a `beanPreviewMap` (Map of `beanId → summaryString`) before rendering BeanPicker. For each bean: look up most recent recipe via `getRecipesForBean(bean.id)` sorted by `lastUsedAt` desc. If no recipe, fall back to `getLastBrewOfBean(bean.name)`. Format: `"15g / 250g · grind 6 · 3:30"` or `null` if no data.
- [ ] Pass `previews={beanPreviewMap}` to BeanPicker
- [ ] Render preview below roaster in each bean card: `<p className="text-xs text-brew-400 mt-0.5">{preview}</p>`
- [ ] For beans with no data: show nothing (no "First brew" text — keep it clean)
- [ ] Memoize `beanPreviewMap` with `useMemo` keyed on `[beans, recipes]` to avoid re-computing on every render

**Data source:** Recipe entity first (reflects the user's saved recipe), last brew fallback (for pre-migration beans). Recipe entity is the "intent," last brew is the "actuals" — recipe is more appropriate for a preview of what you'll get.

**Edge cases:**
- Bean with archived recipe only: no preview (archived recipes are filtered out by `getRecipes()`).
- Performance: pre-computing the map once is O(beans * recipes), acceptable for <100 beans.

---

#### 2.5 — History: Stop Truncating Bean Names

**Problem:** `truncate` class clips long bean names like "Kemera..." in the history list. The right-aligned params block forces the name into a narrow space.

**Current code:** `BrewHistory.jsx:536-557`

**Fix — stack layout on mobile:**
- [ ] Change the collapsed card from horizontal (name left, params right) to stacked below `sm:` breakpoint:
  ```jsx
  {/* Mobile: stacked */}
  <div className="sm:hidden">
    <div className="font-semibold text-sm text-brew-800">{brew.beanName || 'Unknown beans'}</div>
    <div className="text-xs font-mono text-brew-600 mt-0.5">
      {brew.coffeeGrams}g / {brew.waterGrams}g · grind {brew.grindSetting} · {formatTime(brew.totalTime)}
    </div>
  </div>
  {/* Desktop: side-by-side (existing layout, keep truncate) */}
  <div className="hidden sm:flex items-baseline gap-2 min-w-0">
    ...existing layout...
  </div>
  ```
- [ ] Remove `truncate` from the mobile layout — names wrap naturally
- [ ] Keep `truncate` on desktop where horizontal space is abundant
- [ ] Compare mode headers (`BrewHistory.jsx:361`): leave as-is for now — comparison columns are half-width, truncation is reasonable there

**Edge cases:**
- Very long names (40+ chars) will wrap to 2 lines on iPhone 13 Mini. Cards get slightly taller. Acceptable tradeoff for readability.
- Roaster text below the name also has `truncate` — remove it on mobile too.

---

#### 2.10 — "Notes from Last Brew" Placement

**Problem:** "Notes from Last Brew" (amber card with "what to try next" from previous brew) sits at position 4 of 8 in RecipeAssembly, below the recipe picker and recipe notes. It should be the first thing you see because it's your own instructions to yourself.

**Current code:** `BrewScreen.jsx:289-303`

**Fix:**
- [ ] Move the changes/notes block from position 4 to position 2 — immediately after the header/back button, before the recipe indicator dropdown
- [ ] Keep the current amber card styling (`bg-amber-50 border border-amber-200`) — it's already visually distinct
- [ ] No collapsibility needed — these notes are short (max 500 chars, typically 1-2 lines) and the whole point is visibility

**Section order after move:**
1. Header ("Prepare Your Brew" + back button)
2. **Notes from Last Brew** (amber card) ← moved up
3. Recipe Indicator (dropdown)
4. Recipe notes (italic text)
5. Bean + Brew Params card
6. Pour Steps (collapsed)
7. Equipment (collapsed)
8. CTAs

**Edge cases:**
- No notes: section is hidden, no impact on layout.
- Both recipe notes and last-brew notes exist: recipe notes stay at position 4 (they describe the recipe's intent), last-brew notes at position 2 (they describe what to change this time). Different purposes, both visible.

---

### Group C: Recipe System Changes (2.7, 2.8)

These interact — water scaling (2.7) matters most when applying a template/starter recipe (2.8) with non-matching water amounts. Design together.

---

#### 2.7 — Pour Step Water Scaling

**Problem:** When the user changes `waterGrams`, step `waterTo` targets stay fixed. If you go from 240g to 300g, your last step still says "pour to 240g" — the steps and the total don't match.

**Current code:** `updateField` at `BrewScreen.jsx:146` sets the field value with no side effects on steps.

**Fix — inline banner prompt on blur:**
- [ ] Track previous `waterGrams` in a ref: `const prevWaterRef = useRef(recipe.waterGrams)`
- [ ] On `waterGrams` blur (not onChange — per codebase pattern), compare new vs previous. If different and steps exist with `waterTo` values:
  - Show an inline banner below the water input: `"Water changed from 240g → 300g. Scale pour steps to match?"` with `[Scale] [Keep]` buttons
  - Banner styled: `bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm`
- [ ] On "Scale": compute `ratio = newWater / oldWater`, apply `Math.round(step.waterTo * ratio)` to all steps with non-null `waterTo`. Snap last step's `waterTo` to exactly `newWaterGrams`.
- [ ] On "Keep": dismiss banner, leave steps unchanged.
- [ ] Update `prevWaterRef.current` after either action.
- [ ] Auto-expand the steps section when the banner shows, so users can see the proposed changes

**Edge cases:**
- Steps with `waterTo: null` (drawdown): skip, don't scale.
- Zero waterGrams: don't show banner (guard `newWater > 0`).
- Rounding: last step snapped to exact `waterGrams` to avoid 1g rounding drift.
- User types incrementally (250 → backspace → 260): banner only fires on blur, so only the final value matters.
- Decimal results: `Math.round()` always produces integers.

---

#### 2.8 — Recipe + Template Consolidation

**Problem:** Pour templates are a separate concept from recipes, but they serve the same purpose — defining step patterns. Templates are dead metadata after Phase 1 removed the template picker UI. They should become "starter recipes" — global recipes available when creating a new recipe for any bean.

**Current code:**
- Templates in `defaults.js:194-225` (3 built-in)
- Seeded to `brewlog_pour_templates` by `seedDefaultPourTemplates()`
- Used as fallback at `BrewScreen.jsx:1355-1361` when a bean has no recipe

**Fix — templates become starter recipes in the UI:**

This is a **UI-level change**, not a data model migration. Templates stay in `brewlog_pour_templates` as the source of truth for step patterns. The change is how they're presented:

- [ ] In the recipe picker dropdown (RecipeAssembly), when a bean has no custom recipes, show the templates as selectable options labeled "Starter: Standard 3-Pour V60", "Starter: Tetsu 4:6", etc.
- [ ] When a starter recipe is selected, pre-fill the form with the template's steps + current equipment defaults (dose/water/grind from equipment or global defaults). Don't create a recipe entity yet — that happens automatically via `linkRecipeToBrew()` when the brew is saved.
- [ ] For beans that already have recipes, show starters at the bottom of the dropdown separated by a divider, so users can always start fresh with a known pattern.
- [ ] When a starter is applied and `waterGrams` doesn't match the template's last step `waterTo`, auto-trigger the scaling prompt from 2.7. This connects the two features naturally.
- [ ] Remove `pourTemplateId` from recipe creation going forward (stop writing it). Don't migrate existing data — it's harmless dead metadata.
- [ ] Keep `brewlog_pour_templates` localStorage key as-is. No migration needed.

**Recipe picker dropdown structure:**
```
▼ Select Recipe
  ├─ My V60 Recipe (last used 2 days ago)    ← existing recipes
  ├─ My Chemex Recipe (last used 1 week ago)
  ├─ ──────────── or start fresh ────────────
  ├─ Standard 3-Pour V60                      ← starter recipes (templates)
  ├─ Tetsu 4:6 Method
  └─ Single Pour Bloom-and-Go
```

**Edge cases:**
- Bean with no recipes: only starters shown (no divider needed).
- User selects starter, modifies steps, brews, and `linkRecipeToBrew` creates a new recipe entity for that bean. On next brew, the custom recipe shows up in the dropdown above the starters.
- Template step water targets assume 240g. If user's water is 300g, 2.7's scaling banner fires. Good.

---

## Dropped / Deferred

| # | Item | Reason |
|---|------|--------|
| 2.6 | History — simplify expanded view | Done in Phase 1 remainder (PR #36) |
| 2.9 | Bean rename → recipe linking | Non-issue — recipes use `beanId` (UUID), not `beanName` |

---

## Implementation Order

Suggested PR grouping (can adjust):

**PR 1: Teleprompter (2.1 + 2.2 + 2.3)**
- All in `BrewScreen.jsx` (ActiveBrew section) + `storage.js` (computeTimeStatus update)
- Design as single layout pass
- Files: `BrewScreen.jsx`, `storage.js`

**PR 2: Quick wins (2.4 + 2.5 + 2.10)**
- Independent changes, low risk
- Files: `BrewScreen.jsx` (BeanPicker + RecipeAssembly), `BrewHistory.jsx`

**PR 3: Recipe system (2.7 + 2.8)**
- Most complex, interconnected
- Files: `BrewScreen.jsx` (RecipeAssembly), possibly `storage.js`

## Acceptance Criteria

- [x] **2.1:** Current step text readable at arm's length (~60cm) on iPhone 13 Mini. Step name 20px+, water target 16px+.
- [x] **2.2:** After tapping a step, the next step is visually distinct with "UP NEXT" label and card treatment. Skipped steps are correctly bypassed.
- [x] **2.3:** Timer shows green when on-target, amber when approaching max (within 15s), red when over. Text label accompanies color for accessibility. Progress bar color matches.
- [x] **2.4:** Bean picker cards show 1-line recipe/brew summary below roaster. Beans with no data show nothing.
- [x] **2.5:** Bean names in history list wrap on mobile instead of truncating. Desktop keeps side-by-side layout.
- [x] **2.7:** Changing waterGrams shows a scale-steps prompt on blur. Scaling applies proportionally with last step snapped to total. User can decline.
- [x] **2.8:** Recipe picker shows starter recipes (templates) below custom recipes. Selecting a starter pre-fills steps + defaults. No new data model or migration.
- [x] **2.10:** "Notes from Last Brew" appears immediately after the header in RecipeAssembly, before the recipe picker.
- [x] All items pass `npm run build` with no errors
- [x] Animations respect `prefers-reduced-motion`
- [x] Touch targets remain >=44px

## References

- Original audit: `docs/plans/2026-03-06-ui-audit.md`
- Phase 1 PR: #35 (prune RecipeAssembly + cleanup)
- Phase 1 remainder PR: #36 (progressive disclosure + review cleanup)
- Relevant learnings:
  - `docs/solutions/react-patterns/content-indicators-on-collapsed-sections.md`
  - `docs/solutions/react-patterns/progressive-disclosure-summary-vs-details-split.md`
  - `docs/solutions/react-patterns/primary-action-must-flush-pending-edits.md`
  - `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`
  - `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md`
