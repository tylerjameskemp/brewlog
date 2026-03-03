# BrewLog — Adaptive Brewing Journal

## What This Project Is
A pour-over coffee brewing journal. Track brews, manage a bean library, compare sessions side-by-side, and visualize trends. Built with React + Vite + Tailwind CSS. All data in localStorage, no backend.

## Architecture
- **React 18** with functional components and hooks — all state in `App.jsx`, passed via props
- **Vite** for dev server and bundling
- **Tailwind CSS** with custom `brew-*` color palette, custom animations, Inter/JetBrains Mono fonts
- **Recharts** for line charts in Brew Trends
- **uuid** for generating brew and bean IDs
- **localStorage** for persistence (via `src/data/storage.js`) — 6 keys: `brewlog_brews`, `brewlog_equipment`, `brewlog_beans`, `brewlog_ui_prefs`, `brewlog_pour_templates`, `brewlog_active_brew`
- **No backend** — everything runs client-side

## Key Files
- `src/App.jsx` — Root component. Manages 4 views (`brew`, `beans`, `history`, `trends`), top-level state, view transitions. Runs migrations on init.
- `src/data/defaults.js` — Static options: brew methods, grinders, flavor descriptors (7 categories, 56 flavors), body, ratings, issues, bean origins (15), bean processes (7), 3 default pour templates.
- `src/data/storage.js` — All localStorage logic (35 exported functions). CRUD for brews, beans, equipment, pour templates, active brew. Also: `deduplicateBeans()`, `renameBrewBean()`, `migrateGrindSettings()`, `migrateBloomToSteps()`, `normalizeSteps()`, `formatTime()`/`parseTime()`, `exportData()`/`importData()`/`mergeData()`, `getUIPref()`/`setUIPref()`, `getLastBrew()`/`getLastBrewOfBean()`, `getChangesForBean()`, `computeTimeStatus()`. Sort by `brewedAt` descending in `getBrews()`.
- `src/components/BrewScreen.jsx` — **Largest file (1,348 lines).** Guided brew flow with 5 inline sub-components: `BeanPicker`, `RecipeAssembly`, `ActiveBrew`, `PostBrewCommit`, `SwipeCards`, plus `PhaseIndicator`. Phase state machine: `pick → recipe → brew → commit → committed`. Manages its own substantial internal state (phase, selectedBean, brewData, recipe). Communicates with App.jsx via narrow callback interface.
- `src/components/BrewForm.jsx` — Legacy brew form. Currently used for both new brews and editing existing brews. Supports dual mode: create (pre-fills from last brew of same bean) and edit (pre-fills via `editBrew` prop). Uses legacy step format.
- `src/components/BrewHistory.jsx` — Timeline of past brews with auto-diff badges. Edit navigates to BrewForm. Compare mode: select 2 brews for side-by-side diff.
- `src/components/BeanLibrary.jsx` — Bean CRUD with expandable cards. Shows brew count per bean. Rename cascades to all brews.
- `src/components/BrewTrends.jsx` — Three stacked Recharts line charts (rating, grind, time) for the last 20 brews.
- `src/components/StepEditor.jsx` — Step editor for BrewForm. Reads/writes legacy step format.
- `src/components/EquipmentSetup.jsx` — 3-step onboarding wizard for new users; single-page edit for returning users.
- `src/components/FlavorPicker.jsx` — Clickable flavor tags grouped by category. Custom flavor input.
- `src/components/Header.jsx` — Sticky top bar with desktop tab navigation (hidden below `md:`), settings gear icon.
- `src/components/MobileNav.jsx` — Fixed bottom nav for mobile (hidden at `md:+`). SVG icons, safe-area padding.
- `src/components/SettingsMenu.jsx` — Settings dropdown: equipment setup, export/import (merge or replace modes).
- `src/hooks/useTimer.js` — Wall-clock timer using Date.now() delta (not setInterval counting). Supports play/pause/stop/restore. `stop()` flushes final pause gap before computing elapsed. `getTimerState()` returns serializable state for persistence. `restore()` resumes from saved state.
- `src/hooks/useWakeLock.js` — Screen Wake Lock API wrapper. Prevents phone sleep during active brew. Progressive enhancement — silent fail on unsupported browsers. Re-acquires on tab visibility change.

## Data Models

### Brew (Current — two formats coexist)

**BrewScreen format** (brews created via guided flow, has `brewScreenVersion: 1`):
- Includes: `brewScreenVersion`, `recipeSteps` (new step format), `stepResults`, `timeStatus`, `nextBrewChanges`, `pourTemplateId`, `targetTimeRange`, `targetTimeMin`, `targetTimeMax`
- Steps use new format: `{ id, name, waterTo, time, duration, note }`

**BrewForm format** (legacy brews, no `brewScreenVersion`):
- Includes: `recipeSteps`/`steps` (legacy step format), may have `bloomTime`, `bloomWater`, `actualBloomTime`, `actualBloomWater`
- Steps use legacy format: `{ label, startTime, targetWater, note }`

**Both share:** `id`, `beanName`, `roaster`, `roastDate`, `coffeeGrams`, `waterGrams`, `grindSetting`, `waterTemp`, `targetTime`, `totalTime`, `flavors`, `body`, `rating`, `issues`, `notes`, `method`, `grinder`, `dripper`, `brewedAt`

### Bean
```json
{ "id": "uuid", "name": "string", "roaster": "string", "origin": "string",
  "process": "string", "roastDate": "string", "addedAt": "ISO timestamp",
  "lastBrewChanges": "string (optional, from BrewScreen nextBrewChanges)" }
```

### Equipment
Stored with `brewMethod` field, but brew records use `method`. Fields `kettle`, `scale`, `filterType`, `notes` exist on equipment but are NOT copied to brew records currently.
```json
{ "brewMethod": "v60", "dripper": "ceramic", "grinder": "fellow-ode",
  "kettle": "gooseneck-electric", "scale": "", "filterType": "paper-tabbed", "notes": "" }
```

### Pour Template
Three built-in templates seeded on first load. Steps use new format.
```json
{ "id": "standard-3pour-v60", "name": "Standard 3-Pour V60",
  "steps": [{ "id": 1, "name": "Bloom", "waterTo": 42, "time": 0, "duration": 40, "note": "..." }] }
```

### Active Brew (crash recovery)
At most one in-progress brew. Persisted every 5 seconds during timer and immediately on step tap/skip. Cleared on commit.
```json
{ "beanId": "uuid", "beanName": "string", "recipe": { "...recipe state..." },
  "timerState": { "startedAt": 123, "pausedDuration": 0, "pausedAt": null },
  "tappedSteps": { "stepId": 45 }, "skippedSteps": { "stepId": true }, "elapsed": 120 }
```

## BrewScreen Phase State Machine
```
pick → recipe → brew → commit → committed
```
- **pick**: BeanPicker — select from library. Skipped if entering via BeanLibrary "Brew this bean".
- **recipe**: RecipeAssembly — review/edit recipe. Template picker shown for beans with no prior brew. Three swipeable cards.
- **brew**: ActiveBrew — timer, step teleprompter, tap-to-record. Active brew persists to localStorage.
- **commit**: PostBrewCommit — brew report, tasting notes, "what to try next". `saveBrew()` called here.
- **committed**: Success screen — "Start New Brew" or "View in History".

**Navigation guard:** `isBrewActive` state in App.jsx triggers `window.confirm` + `beforeunload` listener during `brew` phase. MobileNav hidden when `brewFlowActive` is true (phases recipe/brew/commit).

## Design Principles
1. **Pre-fill from last brew of same bean** — "Dial-in" pattern. `getLastBrewOfBean()` in storage. Falls back to global last brew for new beans. BrewScreen uses `buildRecipeFromBean()` with `normalizeSteps()` to convert legacy steps.
2. **Click-to-select** — Flavors, body, issues are all clickable tags, not text fields.
3. **Collapsible sections** — Don't overwhelm. Show detail on demand.
4. **Warm coffee palette** — Custom `brew-*` colors from amber/brown range.
5. **Mobile-first** — Bottom nav < 768px, top tabs >= 768px. 44px touch targets. Safe-area insets.
6. **Empty states guide the user** — Every tab has a designed empty state with actionable CTA.
7. **Auto-diff between brews** — History shows what changed relative to the previous brew of the same bean.
8. **Accessibility** — All animations respect `prefers-reduced-motion` via `motion-reduce:animate-none`.

## Patterns & Conventions

**State initialization:** Use lazy initializers for localStorage data: `useState(() => getBrews())`. Never `useState([])` + `useEffect` — that causes an empty-state flash on refresh.

**Storage-layer sorting:** `getBrews()` sorts by `brewedAt` descending. Consumers never sort — the storage layer is the single source of truth for order.

**Bean deduplication:** `saveBean()` normalizes names via `trim().toLowerCase()` and skips duplicates. `deduplicateBeans()` runs on app load to clean existing data. All bean write paths must apply the same normalization.

**Rename cascade:** When a bean name changes, `renameBrewBean(oldName, newName)` updates all matching brew records. String-based references require cascading.

**Double-save guards:** `savingRef` (useRef) in BrewForm and PostBrewCommit, `isImporting` state in SettingsMenu, `dismissed` ref in EquipmentSetup — all prevent duplicate submissions from fast taps.

**Migrations:** Run synchronously in App.jsx lazy initializer. Pattern: idempotent check → in-place mutation → batch write → return brews. Current chain: `migrateGrindSettings()` → `seedDefaultPourTemplates()` → `migrateBloomToSteps()`.

**Step format normalization:** `normalizeSteps()` in storage.js converts legacy `{ label, startTime, targetWater, note }` to current `{ id, name, waterTo, time, duration, note }`. Detects format by checking for `name` field. BrewHistory.jsx has a separate local `normalizeSteps()` that only does array validation — this is a known issue (should use the canonical one).

**Import merge vs replace:** Merge uses "local wins" — if an ID exists locally and in the import, keep local. Only add new records. Replace overwrites everything.

**UI preferences:** `brewlog_ui_prefs` stores one-time dismissible hints separately from user data.

**Animations:** Tailwind keyframes `fade-in`, `fade-in-up`, `scale-in` in `tailwind.config.js`. Always pair with `motion-reduce:animate-none`.

**Mobile iOS compat:** `text-base` on all inputs (prevents iOS auto-zoom at <16px). `touch-action: manipulation` on html. `.pb-safe` utility class for safe-area insets.

**Edit form field preservation:** When editing a brew created by BrewScreen via BrewForm, use refs to track which fields the user actually modified. On save, carry forward original data for unmodified fields (especially `stepResults`, `timeStatus`, `nextBrewChanges`). See `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`.

**Terminal states as phases:** Multi-phase workflows must model ALL states (including terminal/success) as formal phase values, not local booleans. See `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`.

**Per-keystroke storage writes:** Never call storage functions in `onChange` handlers. Buffer in local state, persist on blur or action button. See `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`.

## Bugs & Lessons Learned
21 documented solutions in `docs/solutions/` across 6 categories:
- **logic-errors/** (7): string reference orphans, dual field names, edit overwrites, dedup bypass, dropped side effects, dual brew format schema, duplicated computation divergence
- **react-patterns/** (10): timer flush, terminal state, persist/restore, filter patterns, reset handler, derived booleans, UI state leaking to domain objects, render-path localStorage gating, unconstrained flex scroll, immediate-save-then-rate flow
- **performance/** (1): per-keystroke localStorage writes
- **state-management/** (1): lazy init state goes stale on prop change
- **test-failures/** (1): Node 22 localStorage shadows browser mock
- **ui-bugs/** (1): paired input blur race

Full tracking: `todos/` (48 items, 40 complete, 8 pending). Plans: `docs/plans/`. Solutions: `docs/solutions/`.

## Commands
- `npm install` — Install dependencies
- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Build for production
- `npm run preview` — Preview production build locally
- `npm test` — Run tests (Vitest)

## Critical Rules
- ALWAYS run `npm run build` after making changes to verify nothing broke
- NEVER modify files outside the scope of what was asked
- NEVER refactor or "improve" code that wasn't asked about
- If other files need changes, explain first — don't just change them
- Commit after each completed change with a descriptive message

## Future Plans (Do NOT implement unless asked)
- Foundation stabilization: unified brew schema, recipe snapshots, merged post-brew flow (see `docs/plans/2026-03-02-refactor-foundation-stabilization-plan.md`)
- AI brewing coach (Claude API integration)
- Per-recipe equipment selection
- PWA for mobile
