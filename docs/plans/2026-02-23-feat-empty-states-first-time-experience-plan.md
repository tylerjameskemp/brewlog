---
title: "Improve Empty States and First-Time Experience"
type: feat
date: 2026-02-23
---

# Improve Empty States and First-Time Experience

## Overview

Polish the onboarding flow and empty states across BrewLog so that first-time users feel welcomed and guided rather than confronted with blank screens and form fields. This covers six areas: a friendlier equipment setup, a post-setup confirmation, actionable empty states for history and beans, subtle animations throughout, and a first-time explanation for diff badges.

## Problem Statement

The current first-time experience is functional but abrupt:
- Equipment setup opens as a form modal with all fields at once — feels like paperwork
- After saving equipment, the brew form appears instantly with no moment of confirmation
- Empty brew history and beans library have placeholder text but no actionable guidance
- All modals, sections, and view transitions are instant — no visual polish
- Diff badges in brew history are useful but unexplained on first encounter

## Proposed Solution

### Phase 1: Foundation — Animation Utilities & UI Prefs Storage

Establish the shared patterns that all subsequent phases depend on.

**1a. Add CSS animation keyframes to Tailwind config**

File: `tailwind.config.js`

Extend with custom animations:
```js
// Add to theme.extend:
keyframes: {
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'fade-in-up': {
    '0%': { opacity: '0', transform: 'translateY(8px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'scale-in': {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
},
animation: {
  'fade-in': 'fade-in 300ms ease-out',
  'fade-in-up': 'fade-in-up 300ms ease-out',
  'scale-in': 'scale-in 200ms ease-out',
},
```

All animation classes should be paired with `motion-reduce:animate-none` where used, respecting `prefers-reduced-motion`.

No animation library needed. Enter animations use Tailwind keyframe classes. Expand/collapse uses `max-height` + `overflow-hidden` + `transition-all duration-300` (CSS-only, no framer-motion). This avoids adding dependencies while covering all the needed transitions.

**1b. Add UI preferences storage pattern**

File: `src/data/storage.js`

Add a new storage key and helpers for tracking one-time UI hints:
```js
// Add to STORAGE_KEYS:
UI_PREFS: 'brewlog_ui_prefs'

// New helpers:
export function getUIPref(key) { ... }
export function setUIPref(key, value) { ... }
```

This stores a single JSON object like `{ seenDiffExplanation: true, seenSetupConfirmation: true }`. Individual boolean flags as properties. Not included in data export/import — these are device-local UI preferences.

---

### Phase 2: Empty State Improvements

Smallest scope changes, no new components needed.

**2a. Empty Brew History — actionable CTA**

File: `src/components/BrewHistory.jsx` (lines 164-172)

Current empty state says "Go brew some coffee and come back!" — passive and unhelpful.

Replace with an actionable empty state that navigates to the brew form:
- Add `onNavigate` prop (receives `setView` from App.jsx)
- Show: coffee cup emoji, "No brews yet", descriptive text about what the history tab does, and a "Log Your First Brew" button that calls `onNavigate('brew')`
- Style the button with `bg-brew-600 text-white` to match primary action pattern

Wire up in App.jsx by passing `onNavigate={setView}` to BrewHistory.

File: `src/App.jsx` (line ~97 where BrewHistory is rendered)

**2b. Empty Beans Library — better explanation**

File: `src/components/BeanLibrary.jsx` (lines 119-124)

Current text is already decent. Enhance with:
- Slightly more detailed explanation of the value proposition: tracking which beans you've brewed, seeing your tasting notes across brews of the same bean, and building your personal bean catalog
- Keep the existing `+ Add Bean` button in the header as the CTA (no additional button needed in the empty state)
- Add `animate-fade-in-up` class to the empty state container

**2c. Empty Trends — dynamic count**

File: `src/components/BrewTrends.jsx` (lines 11-18)

Minor improvement: change "You need at least 3 brews" to "Log N more brews to unlock trends" where N = `3 - brews.length`. More actionable.

---

### Phase 3: Equipment Setup — Welcoming Flow

The largest single change. Transform the equipment setup from a form modal into a friendly step-by-step wizard.

**3a. Convert EquipmentSetup to a multi-step wizard**

File: `src/components/EquipmentSetup.jsx`

Current: All 6+ fields shown at once in a scrollable modal.

Proposed: 3-step wizard within the same modal container.

| Step | Title | Fields | Why grouped |
|------|-------|--------|-------------|
| 1 | "What do you brew with?" | Brew method, Dripper material | Core identity of their setup |
| 2 | "Your grinding setup" | Grinder, Filter type | Grind-related choices |
| 3 | "The extras" | Kettle, Scale, Notes | Optional/secondary gear |

Each step shows:
- A friendly question as the heading (not a form label)
- A step indicator (e.g., "Step 1 of 3" or dots)
- Back / Next buttons (no Back on step 1, "Save & Start Brewing" on step 3)
- The same grid/selection UI currently used, just scoped to fewer fields per step

Implementation:
- Add `const [step, setStep] = useState(1)` inside EquipmentSetup
- Render step content conditionally based on `step`
- Form state stays as a single `form` object (same as now), just different fields shown per step
- When `existing` prop is provided (editing), show all fields on one page as before (skip wizard mode)
- Each step transition uses `animate-fade-in` on the incoming content

The close button (X) is available on all steps. Dismissing returns to the welcome card (same as current behavior).

**3b. "You're all set!" confirmation**

File: `src/components/EquipmentSetup.jsx` (or a new step 4 within the wizard)

After saving on step 3, instead of immediately closing the modal:
1. Show a confirmation screen inside the same modal: checkmark icon, "You're all set!" heading, "Your gear is saved. Let's brew!" subtext
2. Auto-dismiss after 2 seconds OR user clicks the "Start Brewing" button (whichever comes first)
3. Uses `animate-scale-in` for the checkmark entrance
4. On dismiss: calls `onSave(form)` which updates App state, closes modal, reveals BrewForm

Implementation: Add a `step === 'done'` state. When the user clicks "Save & Start Brewing", save to localStorage, advance to the confirmation step, start a 2-second `setTimeout` that calls `onSave`. The button provides immediate skip. Cleanup the timeout in a `useEffect` return.

Edge case: If user clicks a nav tab during the 2-second countdown, the modal is still open (fixed overlay). Navigation is blocked by the overlay. This is fine — the confirmation is brief enough.

---

### Phase 4: Animations & Transitions

Apply animations across the app. All animations use `motion-reduce:animate-none` or `motion-reduce:transition-none`.

**4a. Modal entrance/exit animations**

Files: `src/components/EquipmentSetup.jsx`, `src/components/BeanLibrary.jsx` (BeanFormModal)

Current: Modals appear/disappear instantly via conditional rendering.

Add entrance animation:
- Backdrop: fade in (`animate-fade-in`)
- Modal card: scale + fade in (`animate-scale-in`)
- Exit: For simplicity, exit remains instant (animating exit requires keeping the element in the DOM with additional state — not worth the complexity for this scope)

**4b. Section expand/collapse**

Files: `src/components/BrewForm.jsx` (Section component, lines 398-420), `src/components/BeanLibrary.jsx` (bean card expand), `src/components/BrewHistory.jsx` (brew card expand)

Current: Content appears/disappears instantly via `{open && ...}`.

Approach — CSS max-height transition:
- Always render the content div, but wrap it in a container with `overflow-hidden` and `transition-all duration-300 ease-in-out`
- When closed: `max-h-0 opacity-0`
- When open: `max-h-[1000px] opacity-100` (generous max-height to accommodate any content)
- The slight timing imprecision of max-height is acceptable for these content blocks

For the BrewForm `Section` component, refactor the toggle to control classes rather than conditionally rendering children.

**4c. Empty state entrance animations**

Files: All components with empty states (BrewHistory, BeanLibrary, BrewTrends)

Add `animate-fade-in-up` to empty state containers so they gently appear rather than popping in.

**4d. View transition polish**

File: `src/App.jsx`

When switching tabs, add `animate-fade-in` to the container wrapping each view's content. This creates a subtle fade when navigating between brew/beans/history/trends.

Keep this lightweight — just an opacity fade, no sliding or complex transitions.

---

### Phase 5: Diff Badge Explanation

**5a. First-time inline callout**

File: `src/components/BrewHistory.jsx`

When diff badges are present and the user hasn't dismissed the explanation:
- Show a small callout above the first brew card with diffs
- Amber-tinted (matching the badge colors): `bg-amber-50 border border-amber-200 rounded-xl`
- Text: "These badges show what you changed from your previous brew — like grind size, dose, or temperature."
- Dismissible with an X button
- On dismiss: call `setUIPref('seenDiffExplanation', true)`
- On render: check `getUIPref('seenDiffExplanation')` — if true, don't show

The callout uses `animate-fade-in-up` on entrance.

This is better than a tooltip because:
- Works on mobile (no hover needed)
- More visible and readable than a tiny tooltip
- One-time — doesn't clutter the UI after dismissal

---

## Acceptance Criteria

### Functional Requirements
- [x] Equipment setup renders as a 3-step wizard for new users (single page for editing existing)
- [x] Each wizard step shows a friendly question heading and only the relevant fields
- [x] Back/Next navigation works correctly across all 3 steps
- [x] "You're all set!" confirmation appears after saving equipment, auto-dismisses in ~2s or on button click
- [x] Empty brew history shows an actionable "Log Your First Brew" button that navigates to the brew tab
- [x] Empty beans library has enhanced explanatory copy
- [x] Empty trends shows dynamic "Log N more brews" count
- [x] Modals fade/scale in on open
- [x] Section expand/collapse animates smoothly (height + opacity)
- [x] Diff badge explanation callout appears once, is dismissible, and stays dismissed via localStorage
- [x] All animations respect `prefers-reduced-motion` via `motion-reduce:` Tailwind variants
- [x] UI preference flags persist in localStorage under `brewlog_ui_prefs`

### Non-Functional Requirements
- [x] No new dependencies added (CSS-only animations via Tailwind)
- [x] Animations use GPU-friendly properties (transform, opacity) — no layout-triggering animations except max-height for expand/collapse
- [x] All interactive elements remain accessible (focus management, keyboard navigation unaffected)

## Technical Considerations

**Expand/collapse max-height tradeoff:** Using `max-h-[1000px]` means the closing animation may appear slightly delayed for short content (the transition covers 1000px of range but content is only 200px tall). This is an acceptable tradeoff to avoid adding framer-motion or complex `scrollHeight` measurement logic. If it feels off during implementation, the max-height value can be tuned per component.

**No exit animations for modals:** Animating modal exit requires keeping the component mounted during the animation, which means converting conditional rendering to CSS visibility/opacity control with cleanup timers. This adds complexity for minimal UX gain. Enter animation provides 80% of the polish.

**Wizard state stays local to EquipmentSetup:** The step counter is internal state. App.jsx only knows `showSetup: boolean`. The confirmation timer is also internal. This keeps the App.jsx state model unchanged.

**UI prefs not in export/import:** These are device-local preferences (tooltip dismissals, onboarding completion). Users who import data will see the diff explanation again, which is harmless and arguably helpful.

## Implementation Sequence

| Order | Phase | Scope | Files Changed |
|-------|-------|-------|---------------|
| 1 | Foundation | Tailwind animations + UI prefs storage | `tailwind.config.js`, `src/data/storage.js` |
| 2 | Empty states | History CTA, Beans copy, Trends count | `src/components/BrewHistory.jsx`, `src/components/BeanLibrary.jsx`, `src/components/BrewTrends.jsx`, `src/App.jsx` |
| 3 | Equipment wizard | Multi-step wizard + confirmation | `src/components/EquipmentSetup.jsx` |
| 4 | Animations | Modals, expand/collapse, view transitions | `src/components/EquipmentSetup.jsx`, `src/components/BeanLibrary.jsx`, `src/components/BrewForm.jsx`, `src/components/BrewHistory.jsx`, `src/App.jsx` |
| 5 | Diff explanation | One-time callout | `src/components/BrewHistory.jsx` |

Each phase is independently shippable. Phase 1 is a prerequisite for phases 3-5.

## Design Decisions

- **3-step wizard over single page:** Groups related fields, reduces cognitive load, feels conversational rather than bureaucratic
- **Auto-dismiss confirmation (2s) with skip button:** Brief enough to not block eager users, long enough to register as a success moment
- **Inline callout over tooltip for diff badges:** Works on mobile, more discoverable, one-time only
- **CSS-only animations over framer-motion:** Zero bundle size impact, simpler mental model, sufficient for the transitions needed
- **Single `brewlog_ui_prefs` key over individual keys:** Scales cleanly as more onboarding hints are added

## References

### Internal References
- `src/App.jsx:28-33` — Current top-level state model
- `src/App.jsx:46-86` — Current welcome card and needsSetup gate
- `src/components/EquipmentSetup.jsx` — Current single-page setup form
- `src/components/BrewHistory.jsx:164-172` — Current empty history state
- `src/components/BrewHistory.jsx:175-201` — Diff computation logic
- `src/components/BrewHistory.jsx:489-503` — Diff badge rendering
- `src/components/BeanLibrary.jsx:119-124` — Current empty beans state
- `src/components/BrewTrends.jsx:11-18` — Current empty trends state
- `src/components/BrewForm.jsx:398-420` — Section expand/collapse component
- `src/data/storage.js` — Current storage keys and helpers
- `src/index.css:15-18` — Global transition styles
- `tailwind.config.js` — Current theme configuration
