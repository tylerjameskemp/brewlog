---
title: "Phase 3: Polish (Beta-Ready)"
type: refactor
date: 2026-03-06
---

# Phase 3: Polish (Beta-Ready)

## Overview

Final pass to bring BrewLog from "functional" to "beta-ready." Phases 1 (prune) and 2 (fix friction) removed clutter and fixed interactions. Phase 3 establishes visual consistency: unified typography, standardized spacing, guaranteed touch targets, palette cohesion, polished empty states, and a streamlined Rate screen.

## Design System Rules (Established by This Phase)

### Typography Scale

| Role | Classes | Used Where |
|------|---------|------------|
| **Page heading** | `text-2xl font-semibold text-brew-800` | BeanPicker, RecipeAssembly, RateThisBrew, BrewSuccess |
| **List-view heading** | `text-lg font-semibold text-brew-800` | BrewHistory, BeanLibrary, BrewTrends |
| **Card heading** | `text-lg font-semibold text-brew-800` | Section cards (Step Timing, Tasting, etc.) |
| **Section label** | `text-xs text-brew-400 uppercase tracking-wider` | Body, Rating, Issues labels; comparison headers |
| **Field label** | `text-xs text-brew-400` | Form input labels (Grind, Temp, Coffee, Water) |
| **Input text** | `text-base text-brew-800` | All `<input>`, `<select>`, `<textarea>` (iOS zoom prevention) |
| **Body text** | `text-sm text-brew-700` | Descriptions, helper text |
| **Muted text** | `text-xs text-brew-400` | Dates, metadata, hints |
| **Monospace data** | `font-mono text-brew-700` | Numeric values in history, comparisons |
| **Diff/badge text** | `text-[10px] font-medium` | Diff tags, step annotations (minimum readable size) |

**Rules:**
- Eliminate all `text-[9px]` — upgrade to `text-[10px]`
- Eliminate `text-[11px]` — round to `text-xs` (12px)
- `text-[10px]` only for badges, diff tags, and uppercase section micro-labels in dense views
- All inputs must have `text-base` (16px minimum) for iOS auto-zoom prevention
- RecipeAssembly page heading: `text-xl` → `text-2xl` to match BeanPicker/RateThisBrew

### CTA Button Tiers

| Tier | Classes | Used Where |
|------|---------|------------|
| **Primary (flow-advancing)** | `bg-brew-800 text-white hover:bg-brew-700` | Brew This, Done, Start New Brew, Finish Brew |
| **Secondary (utility)** | `bg-brew-600 text-white hover:bg-brew-700` | Add Bean, Set Up Gear, Export, Import |
| **Text action** | `text-brew-500 hover:text-brew-700` | Cancel, Back, secondary links |

**Rule:** Finish Brew currently uses `bg-brew-500` — normalize to `bg-brew-800` (it's a flow-advancing action).

### Spacing Rules

| Context | Value | Rationale |
|---------|-------|-----------|
| **Page container** | `max-w-2xl mx-auto px-4` | Unchanged |
| **Card inner padding** | `p-5` | Standardize (some use `p-6`) |
| **Card gap (list views)** | `space-y-3` on parent | BrewHistory, BeanLibrary — not `mb-*` on children |
| **Card gap (form sections)** | `space-y-4` on parent | BrewForm, RateThisBrew — not `mb-4` on children |
| **Grid gap (form fields)** | `gap-3` | Standardize (RecipeAssembly uses `gap-2`, BrewForm `gap-3`) |
| **Bottom padding** | Computed per screen | See below |

**Bottom padding formula:** `fixed element height + 16px breathing room`
- Screens with fixed CTA only: `pb-24` (CTA ~56px + 16px + safe-area)
- Screens with MobileNav: `pb-32` (nav ~64px + 16px + safe-area)
- ActiveBrew step list: `pb-36` (CTA + extra scroll room for last step)

---

## Implementation Items

### 3.1 Typography Hierarchy Audit

**Goal:** Apply the typography scale defined above across all components.

**Files to change:**
- `src/components/BrewScreen.jsx` — Fix RecipeAssembly heading (`text-xl` → `text-2xl`), normalize all `text-[11px]` to `text-xs`, fix "Changes for Next Brew" heading color (`text-brew-500` → `text-brew-800`), add "Flavors" label to Tasting card, resolve conflicting `text-sm text-base` on RateThisBrew inputs (remove `text-sm`), normalize field labels to `text-xs text-brew-400`
- `src/components/BrewForm.jsx` — Normalize label patterns to match scale, fix any `text-[10px]` rating labels → `text-xs`
- `src/components/BrewHistory.jsx` — Normalize comparison section labels to `text-xs text-brew-400 uppercase tracking-wider`
- `src/components/StepEditor.jsx` — Upgrade `text-[9px]` diff badges to `text-[10px]`, normalize micro-labels
- `src/components/FlavorPicker.jsx` — Verify category/flavor text sizing
- `src/components/EquipmentSetup.jsx` — Normalize label pattern to `text-xs text-brew-400`
- `src/components/BeanLibrary.jsx` — Normalize modal labels, RecipeSection labels
- `src/components/MobileNav.jsx` — `text-[10px]` labels are acceptable (icon-primary nav)

**Acceptance criteria:**
- [x] No `text-[9px]` anywhere in codebase
- [x] No `text-[11px]` anywhere (replaced with `text-xs`)
- [x] All page headings follow the heading scale
- [x] All form labels use `text-xs text-brew-400` consistently
- [x] All inputs use `text-base` (no conflicting size classes)
- [x] All card headings use `text-lg font-semibold text-brew-800`

### 3.2 Spacing & Density

**Goal:** Consistent card gaps, grid gaps, and bottom padding across all screens.

**Files to change:**
- `src/components/BrewScreen.jsx` — RateThisBrew: replace per-card `mb-4` with `space-y-4` on parent wrapper. RecipeAssembly: normalize grid `gap-2` → `gap-3`. Standardize bottom padding per formula.
- `src/components/BrewForm.jsx` — Verify `space-y-4` between sections, `gap-3` in grids
- `src/components/BrewHistory.jsx` — Already uses `space-y-3` (good)
- `src/components/BeanLibrary.jsx` — Already uses `space-y-3` (good)
- `src/components/BrewTrends.jsx` — Verify `space-y-4` between charts

**Acceptance criteria:**
- [x] List views (History, Beans) use `space-y-3` on parent
- [x] Form views (BrewForm, RateThisBrew) use `space-y-4` on parent
- [x] All form grids use `gap-3`
- [x] Bottom padding follows formula (no arbitrary values)
- [x] Card inner padding consistently `p-5`

### 3.3 Touch Target Audit

**Goal:** Every interactive element ≥ 44px on mobile.

**Elements to fix:**

| Element | File | Current | Fix |
|---------|------|---------|-----|
| FlavorPicker category buttons | `FlavorPicker.jsx` | `py-2.5` (~38px) | Add `min-h-[44px] flex items-center justify-center` |
| FlavorPicker flavor tag buttons | `FlavorPicker.jsx` | `py-2.5` (~38px) | Add `min-h-[44px] flex items-center justify-center` |
| FlavorPicker custom "Add" button | `FlavorPicker.jsx` | `py-3` (~42px) | Add `min-h-[44px]` |
| StepEditor remove button | `StepEditor.jsx` | `p-1` (~24px) | Add `min-w-[44px] min-h-[44px] flex items-center justify-center` |
| StepEditor "Add Step" button | `StepEditor.jsx` | `py-2.5` (~38px) | Add `min-h-[44px]` |
| StepEditor "Split step" button | `StepEditor.jsx` | `py-1` (~20px) | Add `min-h-[44px]` |
| SettingsMenu dropdown items | `SettingsMenu.jsx` | `py-3` (~42px) | Add `min-h-[44px]` |
| BeanLibrary RecipeSection rename icon | `BeanLibrary.jsx` | `p-1` (~24px) | Add `min-w-[44px] min-h-[44px]` |
| BeanLibrary RecipeSection delete icon | `BeanLibrary.jsx` | `p-1` (~24px) | Add `min-w-[44px] min-h-[44px]` |
| BeanFormModal tag-select buttons | `BeanLibrary.jsx` | `py-2.5` (~38px) | Add `min-h-[44px]` |
| BrewForm body/issues tag buttons | `BrewForm.jsx` | `py-2.5` (~38px) | Add `min-h-[44px]` |
| RecipeAssembly recipe indicator pill | `BrewScreen.jsx` | `min-h-[32px]` | Update to `min-h-[44px]` |

**Not fixing (desktop-only or non-interactive):**
- Header desktop nav tabs (hidden below `md:`)
- BrewHistory comparison panel display-only tags

**Acceptance criteria:**
- [x] Every button, link, and clickable element has `min-h-[44px]` (or equivalent)
- [x] Touch area expansion uses `flex items-center justify-center` (visually compact, larger tap area)
- [x] No visual layout regressions from increased touch targets

### 3.4 Color & Branding Pass

**Goal:** Consistent use of brew-* palette, documented CTA tiers, WCAG AA contrast.

**Changes:**
1. **ActiveBrew palette alignment:**
   - `gray-200` progress bar track → `brew-200`
   - `gray-300` skipped step markers → `brew-300`
   - `gray-400` past step text → `brew-400`
   - Keep `gray-900` timer default as-is (highest contrast for glanceability during brewing)
2. **CTA normalization:**
   - Finish Brew `bg-brew-500` → `bg-brew-800` (flow-advancing action)
3. **Heading color fix:**
   - RateThisBrew "Changes for Next Brew" `text-brew-500` → `text-brew-800`
4. **Focus state standardization:**
   - All inputs: `focus:outline-none focus:ring-2 focus:ring-brew-400`
   - All buttons: inherit focus-visible ring from Tailwind defaults
5. **Contrast audit** — spot-check `text-brew-400` on `bg-brew-50` and `bg-white`, `text-brew-300` placeholder text

**Files to change:**
- `src/components/BrewScreen.jsx` — ActiveBrew gray→brew, Finish Brew CTA color, Changes heading color
- All files with `focus:outline-none focus:border-brew-500` — normalize to `focus:ring-2 focus:ring-brew-400`

**Acceptance criteria:**
- [x] No `gray-*` colors in ActiveBrew except timer digits
- [x] All CTAs follow the 3-tier rule (brew-800/600/text)
- [x] Focus states are consistent across all inputs
- [x] All card headings use `text-brew-800`

### 3.5 Empty States

**Goal:** Consistent empty state treatment using the shared `EmptyState` component.

**Changes:**
1. **BeanPicker "no beans"** — Replace inline text with `<EmptyState emoji="🫘" title="No Beans Yet" description="Add beans from the Beans tab to start brewing." action={<button>Go to Beans</button>} />`
2. **BeanPicker "no search results"** — Replace inline text with `<EmptyState emoji="🔍" title="No Matches" description="No beans match your search." />`
3. **BeanLibrary expanded "no brews"** — Small inline empty state is acceptable here (inside a card, not a full page). Normalize styling to match other inline states.
4. **StepEditor "no steps"** — Same: small inline empty state is appropriate. Leave as-is.
5. **App.jsx welcome prompt** — Keep as distinct onboarding card (not an empty state). It's contextual setup, not "no data."

**Files to change:**
- `src/components/BrewScreen.jsx` — BeanPicker empty states → use EmptyState component
- `src/components/EmptyState.jsx` — May need to accept an `onAction` callback for BeanPicker's "Go to Beans" CTA

**Acceptance criteria:**
- [x] All full-page "no data" states use the shared EmptyState component
- [x] BeanPicker "no beans" has a CTA to navigate to Beans tab
- [x] BeanPicker "no search results" uses EmptyState
- [x] Inline empty states (inside cards) are styled consistently

### 3.6 Rate/Tasting Screen Refinement

**Goal:** Reduce scroll burden, improve visual consistency, maintain all functionality.

**Proposed approach:** Merge cards, add visual anchors, do NOT change interaction model.

**Current structure (5 cards):**
1. Step Timing
2. Correct Actuals (Grind + Total Time)
3. Brew Notes
4. Changes for Next Brew
5. Tasting (Flavors + Body + Rating + Issues)

**Proposed structure (3 cards):**
1. **Step Timing** — Keep as-is (hidden for manual brews)
2. **Brew Details** — Merge "Correct Actuals" + "Brew Notes" + "Changes for Next Brew" into one card with clear section dividers
3. **Tasting** — Keep as-is, but add "Flavors" label for consistency

**Why this approach:**
- Reduces from 5 cards to 3 (2 for manual brews)
- "Correct Actuals" has only 2 fields — doesn't justify its own card
- "Brew Notes" and "Changes for Next Brew" are both text areas about the brew — natural grouping
- Tasting is already a cohesive card with multiple sub-sections
- No interaction model changes means lower risk

**Detailed layout for merged "Brew Details" card:**
```
┌─ Brew Details ──────────────────────┐
│ [Grind Setting]    [Total Time]     │  ← 2-col grid (from Correct Actuals)
│                                     │
│ ── Notes ───────────────────────── │
│ [textarea: notes about this brew]   │
│                                     │
│ ── Try Next Time ───────────────── │  ← amber bg-amber-50 inset
│ [textarea: what to change]          │
└─────────────────────────────────────┘
```

**Files to change:**
- `src/components/BrewScreen.jsx` — Restructure RateThisBrew section

**Acceptance criteria:**
- [x] RateThisBrew has 3 cards (or 2 for manual brews) instead of 5
- [x] All fields from original 5 cards are present in merged layout
- [x] "Flavors" has a label matching Body/Rating/Issues pattern
- [x] Input styling normalized to `text-base text-brew-800 rounded-xl border border-brew-200 bg-brew-50`
- [x] Manual vs timed brew distinction preserved
- [x] No functionality removed

---

## Implementation Order

1. **3.1 Typography** — First, because it establishes the rules everything else follows
2. **3.4 Color/branding** — Closely related to typography (label colors, heading colors)
3. **3.2 Spacing** — Apply after typography settles the content sizes
4. **3.3 Touch targets** — Mechanical pass, apply after spacing (targets affect layout)
5. **3.5 Empty states** — Independent, small scope
6. **3.6 Rate screen** — Last, because it benefits from all prior changes being in place

Items 3.1–3.4 can be done in a single pass per file. Items 3.5 and 3.6 are independent from each other.

---

## Out of Scope

- BrewTrends chart redesign
- New features or interactions
- Data model changes
- Backend/PWA work
- Accessibility beyond touch targets, focus states, and motion-reduce (full WCAG audit is future work)

## Gotchas (from documented learnings)

- **iOS auto-zoom:** All inputs MUST have `text-base` (≥16px). Removing or shrinking input text will trigger Safari zoom.
- **Paired input blur:** Don't add cross-field validation to blur handlers during spacing/typography changes.
- **Collapsible max-height:** If content grows from typography changes, `max-h-[1000px]` in Collapsible.jsx may need bumping.
- **motion-reduce:** Any new animations must pair with `motion-reduce:animate-none`.
- **`text-[10px]` on MobileNav:** Keep as-is. MobileNav labels are icon-primary and `text-[10px]` is the standard for bottom tab bars.

## References

- Audit plan: `docs/plans/2026-03-06-ui-audit.md`
- Phase 1 plan: `docs/plans/2026-03-06-refactor-prune-recipe-assembly-plan.md`
- Phase 2 plan: `docs/plans/2026-03-06-refactor-phase2-fix-friction-plan.md`
- Documented solutions: `docs/solutions/` (40 entries across 6 categories)
