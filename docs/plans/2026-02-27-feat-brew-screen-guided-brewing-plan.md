---
title: "feat: Add Brew Screen — Guided Brewing Experience"
type: feat
date: 2026-02-27
---

# feat: Add Brew Screen — Guided Brewing Experience

## Overview

Replace the existing BrewForm with a three-phase guided brewing flow: **Recipe Assembly** (review and adjust recipe) **Active Brew** (real-time timer with step teleprompter) **Post-Brew Commit** (capture timing variance, notes, and next-brew changes). Designed for mobile-first use at a physical brew station.

The interactive prototype at `src/reference/brewscreen-prototype.jsx` demonstrates all three phases. The full spec is at `docs/plans/brew-screen-spec.md`. This plan adapts both to the existing codebase's patterns.

## Key Architecture Decisions

### 1. Data Strategy: Extend Existing Brew, Don't Create New Entities

The spec proposes separate Recipe, BrewSession, and PourTemplate entities with their own storage keys. This would break History, Trends, export/import, and all existing comparisons.

**Decision**: Extend the existing Brew model with new fields. At commit time, write a single Brew record to `brewlog_brews`. Only PourTemplates get a new storage key (`brewlog_pour_templates`). An in-progress brew lives in `brewlog_active_brew` during Phase 2 and is cleared on commit/cancel.

This means:
- BrewHistory renders new brews identically to old ones (zero changes needed)
- BrewTrends continues to work (rating, grindSetting, totalTime all present)
- Export/import only needs one new key added (`brewlog_pour_templates`)
- No migration needed for existing brews

### 2. BrewScreen Replaces BrewForm for New Brews

- `view === 'brew'` + `editingBrew === null` → **BrewScreen** (new brew flow)
- `view === 'brew'` + `editingBrew !== null` → **BrewForm** (edit legacy brews from History)

BrewForm stays for now — it handles edit mode from History. Over time it can be deprecated once BrewScreen supports editing committed brews.

### 3. Entry Point: Bean Picker Phase

When the user taps "New Brew" with no bean pre-selected, BrewScreen shows a **bean picker** (Phase 0) — a searchable list of beans from the library with a "Brew this bean" button. BeanLibrary also gains a "Brew" action on each card that navigates directly to Phase 1 with the bean pre-selected.

### 4. Step Schema

The existing step schema is `{ label, startTime, targetWater, note }`. The spec uses `{ id, name, waterTo, time, duration, note }`. BrewScreen uses the new schema internally and writes an adapter to read legacy steps for auto-fill.

### 5. Feature Parity

Flavors, body, rating, and issues are added to Phase 3 (Post-Brew Commit). These are core tracking features — dropping them would be a regression. The "Tasting Notes — Coming soon" placeholder in the spec refers to a richer future experience, not these existing fields.

### 6. nextBrewChanges: String Stored, Newline-Split for Display

Phase 3 captures changes as free-text in a textarea. Phase 1 splits on `\n` to render per-note Apply/Skip cards. Stored as a single string on the Brew record.

---

## Extended Brew Model

New fields added to the existing Brew record (all optional — legacy brews won't have them):

```js
{
  // ... all existing Brew fields (beanName, coffeeGrams, waterGrams, etc.) ...

  // BrewScreen additions:
  brewScreenVersion: 1,           // marks this as a BrewScreen-originated brew
  stepResults: {                  // variance tracking from Phase 2
    [stepId]: {
      tappedAt: number | null,    // seconds from start, null = "as planned"
      skipped: boolean,
      variance: number | null     // tappedAt - step.time
    }
  },
  brewNotes: string,              // Phase 3: "what happened during this brew?"
  nextBrewChanges: string,        // Phase 3: "changes for next brew" (newline-separated)
  pourTemplateId: string | null,  // which template was used
  targetTimeRange: string,        // e.g., "3:00-3:30" (display format)
}
```

The existing fields are reused directly:
- `coffeeGrams`, `waterGrams`, `grindSetting`, `waterTemp` → from Recipe Assembly
- `totalTime` → actual elapsed from timer
- `recipeSteps` → the planned steps (from template or edited)
- `steps` → the actual steps (copy-on-write, same as today)
- `flavors`, `body`, `rating`, `issues`, `notes` → from Phase 3
- `method`, `grinder`, `dripper` → from equipment profile at commit time
- `beanName`, `roaster`, `roastDate` → from selected bean
- `brewedAt` → timestamp of commit

### PourTemplate (new storage key)

```js
// stored in brewlog_pour_templates
{
  id: string,
  name: string,
  steps: [
    {
      id: number,
      name: string,
      waterTo: number | null,
      time: number,            // seconds from start
      duration: number,        // expected seconds
      note: string
    }
  ]
}
```

Three defaults seeded on first app load (see spec for details): "Standard 3-Pour V60", "Tetsu 4:6 Method", "Single Pour Bloom-and-Go".

### Bean Model Extension

Optional new fields (existing beans have `undefined`, render as "—"):

```js
{
  // ... existing Bean fields ...
  grower: string,              // optional
  variety: string,             // optional
  elevation: string,           // optional
  tastingNotes: string[],      // roaster's tasting notes (tags)
  lastBrewChanges: string,     // from most recent brew's nextBrewChanges
}
```

---

## Implementation Phases

### Phase 1: Storage Layer & Pour Templates

**Files**: `src/data/storage.js`, `src/data/defaults.js`

- [x] Add `POUR_TEMPLATES: 'brewlog_pour_templates'` and `ACTIVE_BREW: 'brewlog_active_brew'` to STORAGE_KEYS
- [x] Add CRUD for pour templates: `getPourTemplates()`, `savePourTemplate()`, `seedDefaultPourTemplates()` (idempotent — only seeds if key is empty)
- [x] Add active brew persistence: `getActiveBrew()`, `saveActiveBrew(state)`, `clearActiveBrew()`
- [x] Add `getChangesForBean(beanName)` — returns `nextBrewChanges` string from most recent brew of that bean (split on `\n` at display time, not here)
- [x] Add step schema adapter: `normalizeSteps(steps)` — converts legacy `{ label, startTime, targetWater, note }` to `{ id, name, waterTo, time, duration, note }` format. Returns new-format steps unchanged.
- [x] Update `exportData()` to include `brewlog_pour_templates`
- [x] Update `importData()` and `mergeData()` to handle `brewlog_pour_templates`
- [x] Define default pour template data in `defaults.js`:

```js
export const DEFAULT_POUR_TEMPLATES = [
  {
    id: 'standard-3pour-v60',
    name: 'Standard 3-Pour V60',
    steps: [
      { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: 'Gentle spiral pour, let degas' },
      { id: 2, name: 'First Pour', waterTo: 160, time: 40, duration: 50, note: 'Steady spiral to edges' },
      { id: 3, name: 'Final Pour', waterTo: 240, time: 90, duration: 30, note: 'Center pour, gentle' },
      { id: 4, name: 'Drawdown', waterTo: null, time: 120, duration: 90, note: 'Wait for complete drain' },
    ],
  },
  {
    id: 'tetsu-46',
    name: 'Tetsu 4:6 Method',
    steps: [
      { id: 1, name: 'Pour 1 (Sweet)', waterTo: 50, time: 0, duration: 45, note: 'First 40% — sweetness' },
      { id: 2, name: 'Pour 2 (Acidity)', waterTo: 100, time: 45, duration: 45, note: 'Second 40% — acidity' },
      { id: 3, name: 'Pour 3', waterTo: 150, time: 90, duration: 45, note: 'First 60% pour' },
      { id: 4, name: 'Pour 4', waterTo: 200, time: 135, duration: 45, note: 'Second 60% pour' },
      { id: 5, name: 'Pour 5', waterTo: 250, time: 180, duration: 45, note: 'Final 60% pour' },
    ],
  },
  {
    id: 'single-pour',
    name: 'Single Pour Bloom-and-Go',
    steps: [
      { id: 1, name: 'Bloom', waterTo: 42, time: 0, duration: 40, note: 'Wet all grounds, let degas' },
      { id: 2, name: 'Main Pour', waterTo: 240, time: 40, duration: 80, note: 'Continuous slow spiral pour' },
      { id: 3, name: 'Drawdown', waterTo: null, time: 120, duration: 90, note: 'Wait for complete drain' },
    ],
  },
]
```

### Phase 2: App.jsx Wiring & Navigation Guard

**Files**: `src/App.jsx`, `src/components/Header.jsx`, `src/components/MobileNav.jsx`

- [x] Add `brewingBean` state to App.jsx (`useState(null)`) — holds the bean object when entering BrewScreen from BeanLibrary
- [x] Add `isBrewActive` state to App.jsx (`useState(false)`) — tracks whether Phase 2 timer is running
- [x] Wrap `setView` in a guard function: when `isBrewActive` is true, show `window.confirm("Brew in progress. Leave and lose timer data?")` before allowing navigation
- [x] Render BrewScreen when `view === 'brew' && !needsSetup && !editingBrew`:

```jsx
{view === 'brew' && !needsSetup && !editingBrew && (
  <BrewScreen
    equipment={equipment}
    beans={beans}
    setBeans={setBeans}
    initialBean={brewingBean}
    onBrewSaved={(updatedBrews) => {
      setBrews(updatedBrews)
      setBrewingBean(null)
    }}
    onBrewActiveChange={setIsBrewActive}
    onNavigate={setView}
  />
)}
{view === 'brew' && !needsSetup && editingBrew && (
  <BrewForm ... />  {/* unchanged */}
)}
```

- [x] Clear `brewingBean` when navigating away from brew view (alongside the existing `editingBrew` clear)
- [x] Add `beforeunload` listener in BrewScreen when Phase 2 is active
- [x] Seed pour templates on app load: call `seedDefaultPourTemplates()` in App.jsx init alongside existing migrations

### Phase 3: BrewScreen Component — Bean Picker (Phase 0)

**Files**: `src/components/BrewScreen.jsx` (new)

- [x] Create BrewScreen component that manages internal `phase` state: `'pick'`, `'recipe'`, `'brew'`, `'commit'`
- [x] If `initialBean` prop is provided, skip to `'recipe'` phase
- [x] If no `initialBean`, start at `'pick'` phase
- [x] Bean picker UI: searchable list of beans from `beans` prop, each with a "Brew" button
- [x] Search filters by bean name or roaster (case-insensitive)
- [x] Selecting a bean sets local `selectedBean` state and transitions to `'recipe'`
- [x] Phase indicator bar at top (3 dots for recipe/brew/commit phases, hidden during picker)
- [x] Style: match existing card pattern (`bg-white rounded-2xl border border-brew-100 shadow-sm`)

### Phase 4: Recipe Assembly (Phase 1 of Flow)

**Files**: `src/components/BrewScreen.jsx`

- [x] On entering recipe phase, auto-fill from last brew of same bean via `getLastBrewOfBean(beanName)`:
  - `coffeeGrams`, `waterGrams`, `grindSetting`, `waterTemp`, `targetTime` → from last brew
  - `recipeSteps` → from last brew, run through `normalizeSteps()` adapter
  - Falls back to equipment defaults for new beans
- [x] Query `getChangesForBean(beanName)` — if result exists, split on `\n` and render Changes prompt card:
  - Warm background (#FEF9F3 or `bg-amber-50`), accent border
  - Each non-empty line is a note with Apply/Skip buttons
  - Apply: green checkmark, note stays visible
  - Skip: note dims to 40% opacity
  - State tracked in local `changesAccepted` object
- [x] Build `SwipeCards` component (adapt from prototype):
  - Touch/mouse drag to navigate between 3 cards
  - Snap-to-card with CSS transitions
  - Dot indicator (active dot wider, accent color)
  - **Card 1 — Essentials**: bean name/roaster/roast date header, tasting notes as tags, 3-col grid (coffee/water/ratio), 2-col grid (grind/temp), target time range
  - **Card 2 — Brew Steps**: numbered step list from recipe, each showing name, time window, water target badge, instruction note
  - **Card 3 — Origin Details**: key-value pairs (origin, grower, process, variety, elevation) — show "—" for missing fields
- [x] Pour template selector: horizontal scrollable row below cards, active template highlighted, selecting swaps `recipeSteps`
- [x] Edit mode toggle in header: when active, recipe fields become editable inputs. Disable card swiping during edit (show all content in scrollable view)
- [x] Grind setting control: reuse grinder-aware logic from BrewForm (Fellow Ode select vs. text input based on equipment)
- [x] "Brew This" CTA: fixed at bottom, saves working recipe to state, transitions to `'brew'` phase

### Phase 5: Active Brew (Phase 2 of Flow)

**Files**: `src/components/BrewScreen.jsx`, `src/hooks/useWakeLock.js` (new), `src/hooks/useTimer.js` (new)

- [x] **Timer engine** (`useTimer` hook):
  - Use `Date.now()` delta for accuracy (NOT interval tick counting — intervals drift when tabs are backgrounded)
  - Store `startedAt` timestamp and `pausedDuration` accumulator
  - `elapsed = Math.floor((Date.now() - startedAt - pausedDuration) / 1000)`
  - 1-second `setInterval` drives re-renders but elapsed is always computed from wall clock
  - Display as `M:SS` format, large centered text (~72px, `font-mono tabular-nums`)
  - Target time range displayed below
  - Linear progress bar: `Math.min(elapsed / totalDuration, 1)`, turns `text-red-500` if elapsed exceeds target upper bound

- [x] **Wake Lock** (`useWakeLock` hook):
  - Acquire `navigator.wakeLock.request('screen')` when timer is running
  - Release on pause, finish, or unmount
  - Progressive enhancement — no error state if unsupported

- [x] **Step teleprompter**:
  - Determine current step: iterate steps, find last non-skipped step where `elapsed >= step.time`
  - Visual states (use Tailwind):
    - Current: `bg-brew-800 text-white` (dark bg, full opacity)
    - Future: `bg-white border border-brew-100 opacity-50`
    - Completed: `bg-brew-50 text-brew-400`
    - Skipped: `line-through opacity-40`
  - Auto-scroll: when `currentStepIdx` changes, scroll step ref into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`)
  - Tap-to-confirm: tapping a step records `tappedSteps[step.id] = elapsed`, shows variance indicator
  - Skip button (X): marks `skippedSteps[step.id] = true`, step excluded from current-step calculation
  - Double-tap guard: `if (!tappedSteps[step.id])` prevents re-tapping

- [x] **Controls**:
  - Play button (large 72px circle, centered) — only before timer starts
  - Pause button (smaller, bordered) — while running
  - Resume button (dark bg) — while paused
  - "Finish Brew" button: always visible once `elapsed > 0`, stops timer, transitions to `'commit'` phase

- [x] **Persistence**: write brew state to `brewlog_active_brew` on: play, pause, step tap, step skip, every 10s while running
- [x] On mount, check `getActiveBrew()` — if exists, offer to resume with a confirmation prompt
- [x] Call `onBrewActiveChange(true)` when timer starts, `onBrewActiveChange(false)` on finish/unmount

### Phase 6: Post-Brew Commit (Phase 3 of Flow)

**Files**: `src/components/BrewScreen.jsx`

- [x] **Brew Report Summary**:
  - Large total brew time in accent color (`text-brew-500 text-5xl font-mono`)
  - Target time range comparison below
  - Step-by-step timing table: step name, planned vs actual time, variance with color coding (green `text-green-600` if <=3s, amber `text-amber-500` if >3s), skipped steps struck-through

- [x] **Brew Notes textarea**:
  - Label: "Brew Notes"
  - Subtitle: "What happened during this brew?"
  - Placeholder: "Bed looked uneven after bloom, water temp dropped fast..."
  - Standard app styling (`bg-brew-50 border border-brew-200 rounded-xl`)

- [x] **Changes for Next Brew textarea**:
  - Visually distinct: warm background (`bg-amber-50 border border-amber-200`)
  - Label: "Changes for Next Brew"
  - Subtitle: "These notes will appear as suggestions next time you brew this bean"
  - Placeholder: "Try coarser grind, extend bloom to 45s..."

- [x] **Existing tasting fields** (feature parity — NOT deferred):
  - FlavorPicker component (reuse existing)
  - Body selector (clickable tags from BODY_OPTIONS)
  - Rating selector (emoji scale from RATING_SCALE)
  - Issues tags (clickable from BREW_ISSUES)

- [x] **Tasting Notes placeholder** (future feature):
  - Dashed border card: "Tasting Notes — Coming soon"
  - Non-interactive

- [x] **Commit Brew action**:
  - `savingRef` guard (useRef) — prevents double-tap. **Reset in `finally` block**.
  - Build complete Brew record from all phases:
    ```js
    const brew = {
      id: uuidv4(),
      brewScreenVersion: 1,
      beanName: selectedBean.name.trim(),
      roaster: selectedBean.roaster || '',
      roastDate: selectedBean.roastDate || '',
      coffeeGrams, waterGrams, grindSetting, waterTemp,
      targetTime: totalDurationSeconds,
      targetTimeRange: targetTimeRangeString,
      totalTime: brewData.elapsed,
      recipeSteps: recipe.steps,       // planned
      steps: recipe.steps,             // actual (same for now)
      stepResults: buildStepResults(),  // variance data
      flavors, body, rating, issues,
      notes: '',                       // legacy field
      brewNotes: brewNotesText,        // new field
      nextBrewChanges: nextBrewChangesText,
      pourTemplateId: selectedTemplateId,
      method: equipment?.brewMethod,
      grinder: equipment?.grinder,
      dripper: equipment?.dripper,
      brewedAt: new Date().toISOString(),
    }
    ```
  - Call `saveBrew(brew)` → `onBrewSaved(updatedBrews)`
  - Call `saveBean()` with selected bean data (idempotent — safe to always call)
  - Call `setBeans(getBeans())`
  - Update bean's `lastBrewChanges`: `updateBean(selectedBean.id, { lastBrewChanges: nextBrewChangesText })`
  - Call `clearActiveBrew()` to remove in-progress state
  - Show success confirmation state with checkmark
  - "Back to History" button → calls `onNavigate('history')`
  - Call `onBrewActiveChange(false)`

### Phase 7: Entry Points & Integration

**Files**: `src/components/BeanLibrary.jsx`, `src/components/BrewHistory.jsx` (minor), `src/components/BeanLibrary.jsx`

- [x] Add "Brew" button to each bean card in BeanLibrary:
  - Small accent-colored button in card header or expanded view
  - On click: call new prop `onBrewBean(bean)` which sets `brewingBean` in App.jsx and `setView('brew')`
- [x] Pass `onBrewBean` prop from App.jsx to BeanLibrary
- [x] Update BeanFormModal to include new optional fields: grower, variety, elevation, tastingNotes (comma-separated input → array)
- [x] Ensure BrewHistory edit button still works (routes to BrewForm via `editingBrew` — unchanged)

### Phase 8: Polish & Edge Cases

- [x] All touch targets >= 44x44px (`min-h-[44px] min-w-[44px]`)
- [x] All inputs use `text-base` (prevents iOS auto-zoom)
- [x] All animations paired with `motion-reduce:animate-none`
- [x] Handle bean with no previous brew: empty recipe with equipment defaults, no Changes prompt
- [x] Handle all steps skipped: Phase 3 shows all steps as "Skipped", total time still valid
- [x] Handle timer past target: progress bar stays at 100%, danger color
- [x] Handle tab backgrounding: wall-clock delta timer handles this automatically
- [x] Handle accidental double-tap on steps: guard in place (`if (!tappedSteps[step.id])`)
- [x] Handle page refresh during Phase 2: resume from `brewlog_active_brew`
- [x] Extract `formatTime()` into a shared utility (currently duplicated in BrewForm, BrewHistory, BrewTrends — resolves pending todo #018)

---

## Acceptance Criteria

### Functional
- [x] User can select a bean and enter the guided brew flow
- [x] Recipe auto-fills from the most recent brew of the same bean
- [x] "Changes from last brew" notes appear as Apply/Skip cards when available
- [x] Pour template selection swaps the step list
- [x] Timer uses wall-clock delta and displays accurately even after tab backgrounding
- [x] Steps auto-advance and can be tapped to record actual timing
- [x] Steps can be skipped
- [x] Brew state persists to localStorage on every significant action
- [x] An interrupted brew can be resumed on page refresh
- [x] Screen stays awake during active brew (on supported browsers)
- [x] In-app navigation during active brew shows a confirmation dialog
- [x] Post-brew report shows step-by-step variance
- [x] Flavors, body, rating, and issues can be recorded (feature parity with BrewForm)
- [x] "Changes for next brew" text is stored and surfaces on next brew of same bean
- [x] Committed brew appears in History and Trends identically to legacy brews
- [x] Export/import includes pour templates

### Non-Functional
- [x] All interactions are one-tap, large target, no precision required
- [x] Timer text readable from arm's length
- [x] No localStorage reads in render paths (cached in state)
- [x] Double-tap guards on all save/transition actions
- [x] `savingRef` reset in `finally` blocks

---

## Institutional Learnings Applied

These are documented solutions in `docs/solutions/` that directly apply:

1. **savingRef must reset in `finally`** — all save guards use try/finally pattern
2. **Never read localStorage in render path** — timer re-renders at 1Hz; all storage reads cached in state via lazy initializers
3. **New code path must replicate all side effects** — commit handler audited against BrewForm's create path: `saveBean()`, `setBeans()`, `setBrews()`, `savingRef.current = false`, `clearActiveBrew()`
4. **String references require consistent normalization** — `beanName.trim()` on all write paths, `saveBean()` (not direct writes) for dedup
5. **Multiple write paths must all use storage layer** — commit calls `saveBrew()` and `saveBean()`, never writes directly to localStorage keys

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/components/BrewScreen.jsx` | **New** — main feature component |
| `src/hooks/useTimer.js` | **New** — wall-clock timer hook |
| `src/hooks/useWakeLock.js` | **New** — screen wake lock hook |
| `src/data/storage.js` | Add pour template CRUD, active brew persistence, `getChangesForBean()`, `normalizeSteps()`, export/import updates |
| `src/data/defaults.js` | Add `DEFAULT_POUR_TEMPLATES` |
| `src/App.jsx` | Add `brewingBean`/`isBrewActive` state, navigation guard, BrewScreen render, pour template seeding |
| `src/components/BeanLibrary.jsx` | Add "Brew" button, pass new fields to BeanFormModal |
| `src/components/Header.jsx` | No changes needed (same "New Brew" tab label) |
| `src/components/MobileNav.jsx` | No changes needed (same tab) |

---

## References

- Feature spec: `docs/plans/brew-screen-spec.md`
- Original implementation plan: `docs/plans/brew-screen-plan.md`
- Interactive prototype: `src/reference/brewscreen-prototype.jsx`
- Bean rename cascade solution: `docs/solutions/logic-errors/string-reference-rename-orphans-records.md`
- Render path storage reads: `docs/solutions/react-patterns/render-path-localstorage-and-event-gating.md`
- New code path side effects: `docs/solutions/logic-errors/new-code-path-drops-side-effects.md`
- Multiple write paths dedup: `docs/solutions/logic-errors/multiple-write-paths-bypass-bean-deduplication.md`
