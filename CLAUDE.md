# BrewLog — Adaptive Brewing Journal

## What This Project Is
A pour-over coffee brewing journal. Track brews, manage a bean library, compare sessions side-by-side, and visualize trends. Built with React + Vite + Tailwind CSS. All data in localStorage, no backend.

## Architecture
- **React 18** with functional components and hooks — all state in `App.jsx`, passed via props
- **Vite** for dev server and bundling
- **Tailwind CSS** with custom `brew-*` color palette, custom animations, Inter/JetBrains Mono fonts
- **Recharts** for line charts in Brew Trends
- **uuid** for generating brew and bean IDs
- **localStorage** for persistence (via `src/data/storage.js`) — 7 keys: `brewlog_brews`, `brewlog_equipment`, `brewlog_beans`, `brewlog_ui_prefs`, `brewlog_pour_templates`, `brewlog_active_brew`, `brewlog_recipes`
- **No backend** — everything runs client-side

## Key Files
- `src/App.jsx` — Root component. Manages 4 views (`brew`, `beans`, `history`, `trends`), top-level state, view transitions. Runs migrations on init.
- `src/data/defaults.js` — Static options: brew methods, grinders, flavor descriptors (7 categories, 56 flavors), body, ratings, issues, bean origins (15), bean processes (7), 3 default pour templates. Exports `getMethodName(id)` and `getGrinderName(id)` lookup helpers for display names.
- `src/data/storage.js` — All localStorage logic (~40 exported functions). CRUD for brews, beans, recipes, equipment, pour templates, active brew. Recipe helpers: `RECIPE_FIELDS` constant, `recipeEntityToFormState()`, `formStateToRecipeFields()`. Also: `deduplicateBeans()`, `renameBrewBean()`, `migrateGrindSettings()`, `migrateBloomToSteps()`, `migrateToSchemaV2()`, `migrateExtractRecipes()`, `normalizeSteps()`, `formatTime()`/`parseTime()`, `exportData()`/`importData()`/`mergeData()`, `getUIPref()`/`setUIPref()`, `getLastBrewOfBean()`, `getChangesForBean()`, `computeTimeStatus()`. `getBrews()` sorts by `brewedAt` descending with module-level cache (`_brewsCache`/`_brewsCacheRaw`); all write functions call `_invalidateBrewsCache()`.
- `src/components/BrewScreen.jsx` — **Largest file (~1,620 lines).** Guided brew flow with 5 inline sub-components: `BeanPicker`, `RecipeAssembly`, `ActiveBrew`, `RateThisBrew`, `SwipeCards`, plus `PhaseIndicator`. Phase state machine: `pick → recipe → brew → rate → success`. Key helpers: `buildBrewRecord` (useCallback, shared by `handleFinishBrew` and `handleLogWithoutTimer`), `buildRecipeFromBean` (pre-fill from last brew). Equipment section in RecipeAssembly allows per-brew equipment selection. Skip-timer mode via "Log without timer" button bypasses ActiveBrew phase. Communicates with App.jsx via narrow callback interface.
- `src/components/BrewForm.jsx` — Edit-only brew form. Used exclusively for editing existing brews from History (via `editBrew` prop). New brew creation goes through BrewScreen. Preserves `recipeSnapshot`, `stepResults`, `method`, `grinder`, `dripper`, `filterType` on save.
- `src/components/BrewHistory.jsx` — Timeline of past brews with auto-diff badges. Edit navigates to BrewForm. Compare mode: select 2 brews for side-by-side diff.
- `src/components/BeanLibrary.jsx` — Bean CRUD with expandable cards. Shows brew count per bean. Rename cascades to all brews.
- `src/components/BrewTrends.jsx` — Three stacked Recharts line charts (rating, grind, time) for the last 20 brews.
- `src/components/StepEditor.jsx` — Step editor for BrewForm. Reads/writes unified step format (`{ id, name, waterTo, time, duration, note }`).
- `src/components/EquipmentSetup.jsx` — 3-step onboarding wizard for new users; single-page edit for returning users.
- `src/components/FlavorPicker.jsx` — Clickable flavor tags grouped by category. Custom flavor input.
- `src/components/Header.jsx` — Sticky top bar with desktop tab navigation (hidden below `md:`), settings gear icon.
- `src/components/MobileNav.jsx` — Fixed bottom nav for mobile (hidden at `md:+`). SVG icons, safe-area padding.
- `src/components/SettingsMenu.jsx` — Settings dropdown: equipment setup, export/import (merge or replace modes).
- `src/hooks/useTimer.js` — Wall-clock timer using Date.now() delta (not setInterval counting). Supports play/pause/stop/restore. `stop()` flushes final pause gap before computing elapsed. `getTimerState()` returns serializable state for persistence. `restore()` resumes from saved state.
- `src/hooks/useWakeLock.js` — Screen Wake Lock API wrapper. Prevents phone sleep during active brew. Progressive enhancement — silent fail on unsupported browsers. Re-acquires on tab visibility change.

## Data Models

### Brew (Unified — Schema V2)

All brews use one canonical format (`schemaVersion: 2`). Legacy brews are migrated on app load by `migrateToSchemaV2()`. Steps use format: `{ id, name, waterTo, time, duration, note }`.

**Core fields:** `id`, `schemaVersion`, `beanName`, `roaster`, `roastDate`, `coffeeGrams`, `waterGrams`, `grindSetting`, `waterTemp`, `targetTime`, `targetTimeRange`, `targetTimeMin`, `targetTimeMax`, `totalTime`, `timeStatus`, `flavors`, `body`, `rating`, `issues`, `notes`, `nextBrewChanges`, `method`, `grinder`, `dripper`, `filterType`, `pourTemplateId`, `recipeId`, `brewedAt`

**Recipe snapshot:** `recipeSnapshot` object frozen at brew start — captures all recipe fields + equipment + steps. Never edited after creation. Enables planned-vs-actual comparison.

**Steps & results:** `recipeSteps` (planned steps), `steps` (actual steps — same as recipeSteps at creation, can be corrected post-brew), `stepResults` (per-step timing: `{ stepId: { tappedAt, skipped, variance } }`).

**Flags:** `isManualEntry` (true for skip-timer brews, no stepResults/timeStatus).

### Bean
```json
{ "id": "uuid", "name": "string", "roaster": "string", "origin": "string",
  "process": "string", "roastDate": "string", "addedAt": "ISO timestamp",
  "lastBrewChanges": "string (optional, from BrewScreen nextBrewChanges)" }
```

### Recipe
Reusable recipe entity linked to a bean by UUID (`beanId`). Soft-deleted via `archivedAt` when parent bean is deleted. Field list defined by `RECIPE_FIELDS` constant in storage.js. Created automatically when a brew is saved via `linkRecipeToBrew()`. `notes` is intentionally NOT in `RECIPE_FIELDS` — it's metadata, not a brew parameter.
```json
{ "id": "uuid", "beanId": "uuid", "name": "string (method display name)",
  "coffeeGrams": 15, "waterGrams": 250, "grindSetting": "string",
  "waterTemp": "string", "targetTime": "string", "targetTimeRange": "string",
  "targetTimeMin": "string", "targetTimeMax": "string",
  "steps": [{ "id": 1, "name": "Bloom", "waterTo": 42, "time": 0, "duration": 40 }],
  "pourTemplateId": "string", "method": "string", "grinder": "string",
  "dripper": "string", "filterType": "string",
  "notes": "string (optional, max 500 chars, not in RECIPE_FIELDS)",
  "lastUsedAt": "ISO timestamp", "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp", "archivedAt": "ISO timestamp|null",
  "version": 1 }
```

### Equipment
Global equipment inventory stored with `brewMethod` field. Serves as defaults for per-brew equipment selection in RecipeAssembly. Per-brew equipment is stored on each brew record as `method`, `grinder`, `dripper`, `filterType`.
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
At most one in-progress brew. Persisted every 5 seconds during timer and immediately on step tap/skip. Includes `phase` field for recovery routing.
```json
{ "phase": "brew|rate", "beanId": "uuid", "beanName": "string", "recipe": { "...recipe state..." },
  "timerState": { "startedAt": 123, "pausedDuration": 0, "pausedAt": null },
  "tappedSteps": { "stepId": 45 }, "skippedSteps": { "stepId": true }, "elapsed": 120,
  "brewId": "uuid (present when phase=rate)" }
```
On recovery: `phase === 'brew'` resumes timer, `phase === 'rate'` skips to rating screen with saved `brewId`. Cleared on "Done" in RateThisBrew.

## BrewScreen Phase State Machine
```
pick → recipe → brew → rate → success
                  ↓ (skip timer)
               recipe → rate → success
```
- **pick**: BeanPicker — select from library. Skipped if entering via BeanLibrary "Brew this bean".
- **recipe**: RecipeAssembly — review/edit recipe, per-brew equipment, template picker. "Brew This" or "Log without timer".
- **brew**: ActiveBrew — timer, step teleprompter, tap-to-record. Active brew persists to localStorage. "Finish Brew" calls `saveBrew()` immediately, then transitions to rate.
- **rate**: RateThisBrew — correct actuals, tasting notes (flavors, body, rating, issues), "what to try next". Edits already-saved brew via `updateBrew()`.
- **success**: Done — "Start New Brew" or "View in History".

**Navigation guard:** `isBrewActive` state in App.jsx triggers `window.confirm` + `beforeunload` listener during `brew` phase. MobileNav hidden when `brewFlowActive` is true (phases recipe/brew/rate).

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

**Double-save guards:** `savingRef` (useRef) in BrewForm, RateThisBrew, and BrewScreen (handleFinishBrew/handleLogWithoutTimer), `isImporting` state in SettingsMenu, `dismissed` ref in EquipmentSetup — all prevent duplicate submissions from fast taps.

**Migrations:** Run synchronously in App.jsx lazy initializer. Pattern: idempotent check → in-place mutation → batch write → return brews. Current chain: `migrateGrindSettings()` → `seedDefaultPourTemplates()` → `migrateBloomToSteps()` → `migrateToSchemaV2()` → `migrateExtractRecipes()`. V2 migration creates backup in `brewlog_brews_backup_v1` (does not overwrite existing backup). On corrupt data, attempts restore from backup. Recipe migration extracts unique recipe entities from existing brews grouped by beanId.

**Step format normalization:** `normalizeSteps()` in storage.js converts legacy `{ label, startTime, targetWater, note }` to current `{ id, name, waterTo, time, duration, note }`. Detects format by checking for `name` field. All consumers use the canonical `normalizeSteps()` from storage.js.

**Brew record construction:** `buildBrewRecord` (useCallback in BrewScreen) is the single factory for new brew records. Both `handleFinishBrew` (timed brews) and `handleLogWithoutTimer` (manual entry) call it with overrides. Always call `clearActiveBrew()` before `saveBrew()` to prevent duplicate-on-crash.

**getBrews() caching:** Module-level `_brewsCache`/`_brewsCacheRaw` avoids re-parsing JSON on every call. All write functions (`saveBrew`, `updateBrew`, `deleteBrew`, `renameBrewBean`, `importData`, `mergeData`, and migrations) call `_invalidateBrewsCache()`.

**Equipment lookup helpers:** `getMethodName(id)` and `getGrinderName(id)` in defaults.js resolve equipment IDs to display names. Used by BrewHistory for diff badges and expanded card display.

**Import merge vs replace:** Merge uses "local wins" — if an ID exists locally and in the import, keep local. Only add new records. Replace overwrites everything.

**UI preferences:** `brewlog_ui_prefs` stores one-time dismissible hints separately from user data.

**Animations:** Tailwind keyframes `fade-in`, `fade-in-up`, `scale-in` in `tailwind.config.js`. Always pair with `motion-reduce:animate-none`.

**Mobile iOS compat:** `text-base` on all inputs (prevents iOS auto-zoom at <16px). `touch-action: manipulation` on html. `.pb-safe` utility class for safe-area insets.

**Edit form field preservation:** When editing a brew created by BrewScreen via BrewForm, use refs to track which fields the user actually modified. On save, carry forward original data for unmodified fields (especially `stepResults`, `timeStatus`, `nextBrewChanges`). See `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`.

**Terminal states as phases:** Multi-phase workflows must model ALL states (including terminal/success) as formal phase values, not local booleans. See `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`.

**Per-keystroke storage writes:** Never call storage functions in `onChange` handlers. Buffer in local state, persist on blur or action button. See `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`.

**Entity-form field mapping:** When an entity maps to/from form state at multiple sites, extract a shared `FIELDS` constant and bidirectional helpers (`entityToForm`, `formToEntity`). Diff detection must use the same field list. See `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md`.

**New entity CRUD parity:** When adding a new entity's CRUD, audit the existing entity's functions for write safety (`safeSetItem` return checks), field protection (pin `id`/FKs after spread), return conventions (`null` on failure), and cascade safety. See `docs/solutions/logic-errors/new-entity-crud-misses-defensive-patterns.md`.

## Bugs & Lessons Learned
26 documented solutions in `docs/solutions/` across 6 categories:
- **logic-errors/** (10): string reference orphans, dual field names, edit overwrites, dedup bypass, dropped side effects, dual brew format schema, duplicated computation divergence, cache mutation breaks sort invariant, entity-form field mapping divergence, new entity CRUD missing defensive patterns
- **react-patterns/** (11): timer flush, terminal state, persist/restore, filter patterns, reset handler, derived booleans, UI state leaking to domain objects, render-path localStorage gating, unconstrained flex scroll, immediate-save-then-rate flow, synchronous ref guard ineffective
- **performance/** (1): per-keystroke localStorage writes
- **state-management/** (1): lazy init state goes stale on prop change
- **test-failures/** (1): Node 22 localStorage shadows browser mock
- **ui-bugs/** (2): paired input blur race, raw field names displayed to users

Full tracking: `todos/` (90 items, 81 complete). Plans: `docs/plans/`. Solutions: `docs/solutions/`.

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
- AI brewing coach (Claude API integration)
- PWA for mobile
- Grinder-aware trend filtering in BrewTrends
- Export format versioning
