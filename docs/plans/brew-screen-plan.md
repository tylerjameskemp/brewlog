# Brew Screen Feature — Implementation Plan

## Context for Conductor Agent

This plan implements the Brew Screen feature described in `brew-screen-spec.md`. The app is a Vite + React project using browser localStorage for persistence, deployed to Vercel. The interactive prototype (`brewscreen.jsx`) is a UX reference — adapt its patterns to the existing codebase's component structure, styling approach, and state management.

**Before starting**: Read the existing codebase to understand routing, component patterns, localStorage usage, and the current bean/brew data models. The implementation should feel native to the existing app, not bolted on.

---

## Phase 1: Data Layer & Storage

### Task 1.1: Extend Data Models
- [ ] Add `Recipe` model (see spec: coffeeAmount, waterAmount, grindSetting, waterTemp, targetTimeRange, steps[], pourTemplateId)
- [ ] Add `BrewStep` model (id, name, waterTo, time, duration, note)
- [ ] Add `PourTemplate` model (id, name, steps[])
- [ ] Add `BrewSession` model (id, recipeId, beanId, totalTime, stepResults, brewNotes, nextBrewChanges, committed, timestamps)
- [ ] Extend existing Bean model with `lastBrewChanges: string[]` field

### Task 1.2: localStorage Service
- [ ] Create storage helpers for Recipe, PourTemplate, and BrewSession CRUD
- [ ] Implement `getLastBrewForBean(beanId)` — returns most recent BrewSession for a given bean
- [ ] Implement `getLastRecipeForBean(beanId)` — returns most recent Recipe for a given bean (for auto-fill)
- [ ] Implement `getChangesForBean(beanId)` — returns `nextBrewChanges` from most recent BrewSession
- [ ] Add defensive writes: save brew state on every significant action (step tap, skip, pause) so data survives page refresh

### Task 1.3: Seed Default Pour Templates
- [ ] Create 3 default pour templates stored in localStorage on first app load:
  - "Standard 3-Pour V60" — Bloom 42g @0s/40s, Pour to 160g @40s/50s, Pour to 240g @90s/30s, Drawdown @120s/90s
  - "Tetsu 4:6 Method" — 5 equal pours
  - "Single Pour Bloom-and-Go" — Bloom then one continuous pour
- [ ] Templates should be editable/deletable by user in future, but for POC just make them available

---

## Phase 2: Recipe Assembly Screen (Phase 1 of Brew Flow)

### Task 2.1: Route Setup
- [ ] Add route for `/brew/:beanId` (or integrate with existing routing pattern)
- [ ] Route should load bean data and auto-fill recipe from last brew of same bean
- [ ] If no previous brew exists for this bean, start with empty/default recipe fields

### Task 2.2: Swipeable Card Component
- [ ] Build a reusable `SwipeCards` component with:
  - Touch/mouse drag to navigate between cards
  - Snap-to-card behavior with smooth CSS transitions
  - Dot indicator showing current position
- [ ] Three cards: Essentials, Brew Steps, Origin Details (see spec for field layout)

### Task 2.3: Recipe Essentials Card
- [ ] Bean name, roaster, roast date header
- [ ] Tasting notes as horizontal tag chips
- [ ] 3-column grid: Coffee (g), Water (g), Ratio (calculated)
- [ ] 2-column grid: Grind setting, Water temp
- [ ] Target time range display
- [ ] If edit mode: fields become editable inputs

### Task 2.4: Brew Steps Card
- [ ] Numbered step list from recipe
- [ ] Each step shows: name, time window (start → end), water target badge, instruction note
- [ ] Steps update when pour template selection changes

### Task 2.5: Origin Details Card
- [ ] Key-value list: Origin, Grower, Process, Variety, Elevation
- [ ] Pull from bean data

### Task 2.6: "Changes for Next Brew" Prompt
- [ ] Query `getChangesForBean(beanId)` on mount
- [ ] If changes exist, render prompt card above swipeable cards
- [ ] Each change note has Apply and Skip buttons
- [ ] Apply = visual checkmark, note stays visible
- [ ] Skip = note dims to 40% opacity
- [ ] Prompt card has a distinct warm background to differentiate from recipe cards

### Task 2.7: Pour Template Selector
- [ ] Horizontal scrollable row of template buttons below the cards
- [ ] Active template has accent border/background
- [ ] Selecting a template replaces the steps array in the working recipe
- [ ] Current/active template highlighted on load (match by pourTemplateId or default to first)

### Task 2.8: Edit Mode
- [ ] Toggle button in header to enter/exit edit mode
- [ ] In edit mode, recipe fields on Essentials card become editable
- [ ] Steps can be reordered or modified (stretch — basic text editing is sufficient for POC)

### Task 2.9: "Brew This" CTA
- [ ] Fixed position button at bottom of screen
- [ ] Saves the current recipe to localStorage
- [ ] Transitions to Active Brew phase

---

## Phase 3: Active Brew Screen (Phase 2 of Brew Flow)

### Task 3.1: Timer Engine
- [ ] `useEffect` with `setInterval` at 1-second ticks
- [ ] State: elapsed seconds, running (boolean)
- [ ] Display as `M:SS` format, large centered text (~72px for mobile readability)
- [ ] Target time range displayed below timer
- [ ] Linear progress bar: elapsed / total expected duration
- [ ] Progress bar turns red/danger if elapsed exceeds target time range upper bound

### Task 3.2: Screen Wake Lock
- [ ] Implement Wake Lock API as a custom hook (`useWakeLock`)
- [ ] Acquire lock when timer starts, release on finish/unmount
- [ ] Progressive enhancement — no error state if unsupported

### Task 3.3: Navigation Guard
- [ ] Add `beforeunload` event listener during active brew to warn on accidental tab close
- [ ] If using React Router, add a route guard / blocker to prevent back navigation
- [ ] Show confirmation dialog: "Brew in progress. Leave and lose timer data?"

### Task 3.4: Step Teleprompter
- [ ] Render step cards vertically below timer
- [ ] Determine current step based on elapsed time vs step.time thresholds
- [ ] Apply visual states per spec: current (dark bg), future (dimmed), completed (gray), skipped (struck-through)
- [ ] Auto-scroll: when currentStepIdx changes, scroll that step's ref into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`)

### Task 3.5: Step Interaction — Tap to Confirm
- [ ] Tapping a step records `tappedSteps[step.id] = elapsed`
- [ ] Show "Tapped at M:SS (+Ns)" variance indicator on tapped steps
- [ ] If not tapped when step auto-advances, it records as "as planned" (null in tappedSteps)
- [ ] Visual prompt on current step: "Tap when you start this step"

### Task 3.6: Step Interaction — Skip
- [ ] ✕ button on each non-completed step
- [ ] Tapping ✕ marks step as skipped: `skippedSteps[step.id] = true`
- [ ] Skipped steps get struck-through text, 40% opacity
- [ ] Skipped steps are excluded from "current step" calculation

### Task 3.7: Controls
- [ ] Play button (before timer starts): large centered circle, starts timer
- [ ] Pause button (while running): smaller, stops interval
- [ ] Resume button (while paused): restarts interval from current elapsed
- [ ] "Finish Brew" button: always visible at bottom once brew started, stops timer, collects brewData, transitions to Phase 3

### Task 3.8: Persist State on Every Action
- [ ] Write current brew state (elapsed, tappedSteps, skippedSteps) to localStorage on: play, pause, step tap, step skip, every 10 seconds while running
- [ ] On mount, check for an in-progress brew session in localStorage and offer to resume

---

## Phase 4: Post-Brew Commit Screen (Phase 3 of Brew Flow)

### Task 4.1: Brew Report Summary
- [ ] Large total brew time display with accent color
- [ ] Target time range comparison below
- [ ] Step-by-step timing table:
  - Step name
  - Planned time vs actual time (or "as planned")
  - Variance in seconds with color coding (green if ≤3s, amber if >3s)
  - Skipped steps marked and struck-through

### Task 4.2: Brew Notes Textarea
- [ ] Label: "Brew Notes"
- [ ] Subtitle: "What happened during this brew?"
- [ ] Placeholder: "Bed looked uneven after bloom, water temp dropped fast..."
- [ ] Standard textarea with app styling

### Task 4.3: Changes for Next Brew Textarea
- [ ] Visually distinct from brew notes — warm background (#FEF9F3), accent border
- [ ] Label: "Changes for Next Brew"
- [ ] Subtitle: "These notes will appear as suggestions next time you brew this bean"
- [ ] Placeholder: "Try coarser grind, extend bloom to 45s..."

### Task 4.4: Tasting Notes Placeholder
- [ ] Dashed border card with placeholder text: "Tasting Notes — Coming soon"
- [ ] Non-interactive in POC

### Task 4.5: Commit Brew Action
- [ ] "Commit Brew" button at bottom
- [ ] On tap: save complete BrewSession to localStorage, update bean's `lastBrewChanges`, set committed=true
- [ ] Show success confirmation state with checkmark
- [ ] "Back to Start" or "View in History" button from success state
- [ ] Brew session remains editable from history even after commit

---

## Phase 5: Integration & Polish

### Task 5.1: Entry Point
- [ ] Add "Brew" action button to the bean detail view or brew history
- [ ] This button navigates to `/brew/:beanId` starting the flow

### Task 5.2: Brew History Integration
- [ ] Completed brew sessions should appear in existing brew history
- [ ] Each history entry links to the brew report (Phase 3 view in read-only mode)

### Task 5.3: Mobile Polish
- [ ] Verify all touch targets are ≥44x44px
- [ ] Test swipe cards on actual mobile device
- [ ] Ensure timer text is readable at arm's length
- [ ] Test screen wake lock on iOS Safari and Android Chrome
- [ ] Verify localStorage persistence across app refresh during active brew

### Task 5.4: Edge Cases
- [ ] Handle bean with no previous brew (empty recipe, no "changes" prompt)
- [ ] Handle brew with all steps skipped
- [ ] Handle timer running past expected total duration (progress bar should cap or show overflow state)
- [ ] Handle browser tab becoming inactive and resuming (timer should use wall clock delta, not just interval ticks)
- [ ] Handle accidental double-tap on steps

---

## File Reference

| File | Purpose |
|------|---------|
| `brew-screen-spec.md` | Full feature specification with data models, UX details, and design tokens |
| `brewscreen.jsx` | Interactive React prototype — use as UX/behavior reference, not production code |

---

## Implementation Notes

- **Don't over-engineer**: This is a POC. localStorage is fine. Simple React state is fine. No need for Redux/Zustand/context providers unless the existing app already uses them
- **Match existing patterns**: Use whatever component structure, CSS approach, and naming conventions the current codebase uses
- **Timer accuracy**: Use `Date.now()` delta for elapsed time calculation, not just counting interval ticks (intervals drift and pause when tabs are backgrounded)
- **Test on mobile**: This feature lives or dies on mobile usability. The phone is propped at a brew station, hands are wet, user is pouring water. Every interaction should be one-tap, large target, no precision required
