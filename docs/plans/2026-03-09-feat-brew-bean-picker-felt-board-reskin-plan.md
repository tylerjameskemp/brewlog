---
title: "feat: Brew BeanPicker felt-board reskin"
type: feat
date: 2026-03-09
---

# Brew BeanPicker — Felt-Board Visual Reskin

Apply the same dark felt-board aesthetic from the BeanLibrary reskin to the BeanPicker phase of BrewScreen. Remove emojis. Cosmetic only — no functionality changes.

## Scope

The BeanPicker (phase 0 of BrewScreen, `src/components/BrewScreen.jsx:39-113`) is the bean selection list shown when starting a new brew. It currently uses white cards on the parchment background. Reskin it to match the felt-board look already applied to BeanLibrary.

**What changes:**
- BeanPicker bean list gets felt-board wrapper, letterpress text, dark styling
- Remove emojis from EmptyState calls in BeanPicker (lines 66, 82)
- Remove emoji from rating buttons in RateThisBrew (line 1329) — use text labels only
- Search input gets dark theme treatment

**What stays the same:**
- All BrewScreen phase logic, state machine, callbacks
- RecipeAssembly, ActiveBrew, RateThisBrew, BrewSuccess — no visual changes (except emoji removal in RateThisBrew)
- Search/filter functionality
- All navigation (back button, "Go to Beans" CTA)

## Acceptance Criteria

- [x] BeanPicker wraps in dark felt-board container (reuse FeltBoard pattern from BeanLibrary)
- [x] Bean rows use letterpress text + dim metadata (roaster, origin) instead of white cards
- [x] Search input styled for dark background
- [x] Empty states render inline (dark) without emoji — just text
- [x] Rating buttons in RateThisBrew show text label only, no emoji
- [x] All 44px touch targets maintained
- [x] `prefers-reduced-motion` respected
- [x] `npm run build` passes

## Implementation

### 1. Extract FeltBoard to shared component

Currently inline in BeanLibrary.jsx. Extract to `src/components/FeltBoard.jsx` so both BeanLibrary and BeanPicker can use it. Pure visual wrapper — no logic.

### 2. Reskin BeanPicker (BrewScreen.jsx lines 39-113)

**Header:** "Start a Brew" in letterpress style, centered. Subtitle in dim text.

**Search input:** Dark background (`bg-felt-900/50`), light text (`text-felt-100`), dim border (`border-felt-700`), felt-themed focus ring.

**Bean rows:** Replace white cards with flat rows matching BeanLibrary:
- Bean name: uppercase, condensed, letterpress
- Roaster + origin on dim metadata line
- Recipe preview on second dim line
- No card borders — flat list

**Empty states:** Inline dark text, no emoji:
- "No Beans Yet" — `font-condensed text-felt-100 uppercase text-letterpress`, description in `text-felt-500`
- "No Matches" — same treatment

### 3. Remove emoji from RateThisBrew rating buttons

`BrewScreen.jsx:1329` — Currently renders `{r.emoji}` from RATING_SCALE. Replace with just the text label (`{r.label}`), or use a larger text label without emoji. The RATING_SCALE data in defaults.js stays unchanged (other consumers may use the emoji field).

## Files Changed

| File | Change |
|------|--------|
| `src/components/FeltBoard.jsx` | New — extracted from BeanLibrary |
| `src/components/BeanLibrary.jsx` | Import FeltBoard from shared file, remove inline definition |
| `src/components/BrewScreen.jsx` | BeanPicker dark reskin, rating emoji removal |

## Learnings Applied

- Touch targets: `min-h-[44px]` + flex centering
- iOS zoom: `text-base` on inputs
- Motion: `motion-reduce:animate-none` on all animations
- No layout wrapper baking: FeltBoard is a thin visual wrapper only
