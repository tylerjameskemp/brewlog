# BrewLog — Adaptive Brewing Journal

## What This Project Is
A pour-over coffee brewing journal. Track brews, manage a bean library, compare sessions side-by-side, and visualize trends. Built with React + Vite + Tailwind CSS. All data in localStorage, no backend.

## Architecture
- **React 18** with functional components and hooks — all state in `App.jsx`, passed via props
- **Vite** for dev server and bundling
- **Tailwind CSS** with custom `brew-*` color palette, custom animations, Inter/JetBrains Mono fonts
- **Recharts** for line charts in Brew Trends
- **uuid** for generating brew and bean IDs
- **localStorage** for persistence (via `src/data/storage.js`) — 4 keys: `brewlog_brews`, `brewlog_equipment`, `brewlog_beans`, `brewlog_ui_prefs`
- **No backend** — everything runs client-side

## Key Files
- `src/App.jsx` — Root component. Manages 4 views (`brew`, `beans`, `history`, `trends`), top-level state, view transitions.
- `src/data/defaults.js` — Static options: brew methods, grinders, flavor descriptors (7 categories, 56 flavors), body, ratings, issues, bean origins (15), bean processes (7).
- `src/data/storage.js` — All localStorage logic. CRUD for brews, beans, equipment. Also: `deduplicateBeans()`, `renameBrewBean()`, `migrateGrindSettings()`, `exportData()`, `importData()`, `mergeData()`, `getUIPref()`/`setUIPref()`. Sort by `brewedAt` in `getBrews()`.
- `src/components/BrewForm.jsx` — Brew logging form structured into 3 phases: Recipe (plan), Brew (execution), Tasting (results). Supports dual mode: create (pre-fills from last brew of same bean) and edit (pre-fills from existing brew via `editBrew` prop). Collapsible sections within non-collapsible phase headers. Bean name autocomplete via datalist. Fellow Ode grind selector uses `<select>` with 31 X-1/X-2 positions.
- `src/components/BeanLibrary.jsx` — Bean CRUD with expandable cards. Shows brew count per bean. Modal form with duplicate warning. Rename cascades to all brews.
- `src/components/BrewHistory.jsx` — Timeline of past brews with auto-diff badges. Edit button in expanded card navigates to BrewForm in edit mode. Compare mode: select 2 brews for side-by-side view with highlighted differences.
- `src/components/BrewTrends.jsx` — Three stacked Recharts line charts (rating, grind, time) for the last 20 brews. Custom tooltips.
- `src/components/EquipmentSetup.jsx` — 3-step onboarding wizard for new users; single-page edit for returning users. Auto-dismiss confirmation.
- `src/components/FlavorPicker.jsx` — Clickable flavor tags grouped by category. Custom flavor input.
- `src/components/Header.jsx` — Sticky top bar with desktop tab navigation (hidden below `md:`), settings gear icon.
- `src/components/MobileNav.jsx` — Fixed bottom nav for mobile (hidden at `md:+`). SVG icons, safe-area padding.
- `src/components/SettingsMenu.jsx` — Settings dropdown: equipment setup, export (JSON download), import (merge or replace modes). 5MB file limit, validation.

## Data Models

### Brew
```json
{
  "id": "uuid",
  "beanName": "Heart Columbia Javier Omar",
  "roaster": "Heart",
  "roastDate": "2026-02-10",
  "coffeeGrams": 20,
  "waterGrams": 320,
  "grindSetting": "6-1",
  "waterTemp": 205,
  "bloomTime": 45,
  "bloomWater": 60,
  "targetTime": 210,
  "totalTime": 210,
  "actualBloomTime": 45,
  "actualBloomWater": 60,
  "flavors": ["Chocolate", "Citrus"],
  "body": "Medium",
  "rating": 4,
  "issues": ["Stalled bed"],
  "notes": "Bed stalled at 3:00, lifted filter early",
  "method": "v60",
  "grinder": "fellow-ode",
  "dripper": "ceramic",
  "brewedAt": "2026-02-23T08:30:00Z"
}
```

### Bean
```json
{
  "id": "uuid",
  "name": "Heart Columbia Javier Omar",
  "roaster": "Heart",
  "origin": "Colombia",
  "process": "Washed",
  "roastDate": "2026-02-10",
  "addedAt": "2026-02-23T08:30:00Z"
}
```

### Equipment
```json
{
  "method": "v60",
  "dripper": "ceramic",
  "grinder": "fellow-ode",
  "kettle": "gooseneck-electric",
  "scale": "",
  "filterType": "paper-tabbed",
  "notes": ""
}
```

## Design Principles
1. **Pre-fill from last brew of same bean** — Recipe fields pre-fill from the most recent brew of the same bean ("dial-in" pattern). Falls back to global last brew for new beans.
2. **Click-to-select** — Flavors, body, issues are all clickable tags, not text fields.
3. **Collapsible sections** — Don't overwhelm. Show detail on demand.
4. **Warm coffee palette** — Custom `brew-*` colors from amber/brown range.
5. **Mobile-first** — Bottom nav < 768px, top tabs >= 768px. 44px touch targets. Safe-area insets.
6. **Empty states guide the user** — Every tab has a designed empty state with actionable CTA.
7. **Auto-diff between brews** — History shows what changed relative to the previous brew.
8. **Accessibility** — All animations respect `prefers-reduced-motion` via `motion-reduce:animate-none`.

## Patterns & Conventions

**State initialization:** Use lazy initializers for localStorage data: `useState(() => getBrews())`. Never `useState([])` + `useEffect` — that causes an empty-state flash on refresh.

**Storage-layer sorting:** `getBrews()` sorts by `brewedAt` descending. Consumers never sort — the storage layer is the single source of truth for order.

**Bean deduplication:** `saveBean()` normalizes names via `trim().toLowerCase()` and skips duplicates. `deduplicateBeans()` runs on app load to clean existing data.

**Rename cascade:** When a bean name changes, `renameBrewBean(oldName, newName)` updates all matching brew records. String-based references require cascading — see `docs/solutions/logic-errors/string-reference-rename-orphans-records.md`.

**Double-save guards:** `savingRef` (useRef) in BrewForm, `isImporting` state in SettingsMenu, `dismissed` ref in EquipmentSetup — all prevent duplicate submissions from fast taps.

**Import merge vs replace:** Merge uses "local wins" — if an ID exists locally and in the import, keep local. Only add new records. Replace overwrites everything.

**UI preferences:** `brewlog_ui_prefs` stores one-time dismissible hints (e.g., diff badge explanation) separately from user data.

**Animations:** Tailwind keyframes `fade-in`, `fade-in-up`, `scale-in` defined in `tailwind.config.js`. Always pair with `motion-reduce:animate-none`.

**Mobile iOS compat:** `text-base` on all inputs (prevents iOS auto-zoom at <16px). `touch-action: manipulation` on html. `.pb-safe` utility class for safe-area insets via `env(safe-area-inset-bottom)`.

## Bugs & Lessons Learned
Key bugs found during Sprint 1-2 code review (8 PRs, 10+ P1 fixes):
- **String references orphan records** — Renaming a bean left brews pointing to the old name. Fixed with cascade. See `docs/solutions/logic-errors/`.
- **localStorage init flash** — `useState([])` + `useEffect` shows empty state on every refresh. Fixed with lazy initializers.
- **Double-tap race conditions** — Mobile touch events fire faster than click. Found 3 separate double-tap bugs (duplicate brews, 3+ compare selections, duplicate imports). Fixed with ref-based guards.
- **Import data loss** — `importData()` cleared all localStorage before writing, losing unrelated keys. Fixed by only touching keys present in the payload.
- **iOS auto-zoom** — Inputs with font-size <16px trigger Safari zoom. Fixed with `text-base` on all inputs.

Full tracking: `todos/` (9 items, 8 complete, 1 pending). Plans: `docs/plans/`.

## Commands
- `npm install` — Install dependencies
- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Build for production
- `npm run preview` — Preview production build locally

## Future Plans (Do NOT implement unless asked)
- AI brewing coach (Claude API integration)
- Bean freshness tracking and alerts
- PWA for mobile
- Scalable UI complexity toggle
