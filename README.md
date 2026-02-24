# BrewLog

An adaptive brewing journal for pour-over coffee. Track your brews, tag flavors, see what changed between sessions, and dial in your process.

## Features

- **Brew Logging** — Pre-fills from your last brew. Collapsible sections for coffee, recipe, timing, tasting, and notes.
- **Bean Library** — Track beans with origin, process, and roast date. See how many times you've brewed each bean. Rename cascades to all brew records.
- **Brew History** — Timeline of past brews with auto-diff badges showing what changed from the previous brew.
- **Comparison Mode** — Select two brews for side-by-side comparison with highlighted differences.
- **Brew Trends** — Line charts for rating, grind setting, and brew time over your last 20 brews.
- **Data Export/Import** — Export all data as JSON. Import with merge (add-only) or replace (overwrite) modes.
- **Equipment Setup** — 3-step onboarding wizard for new users; single-page edit for returning users.
- **Mobile Navigation** — Native-feel bottom nav bar on small screens, top tabs on desktop.

## Screenshots

_Screenshots coming soon._

<!-- Capture: brew form, bean library, history with diff badges, comparison mode, trends charts, mobile nav -->

## Tech Stack

- **React 18** + **Vite** — Fast dev server and bundling
- **Tailwind CSS** — Custom `brew-*` color palette, animations, safe-area support
- **Recharts** — Line charts for brew trends
- **uuid** — Unique IDs for brews and beans
- **localStorage** — All data stored client-side, no backend

## Getting Started

```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

## Project Structure

```
src/
  App.jsx                  # Root component — views, state, navigation
  components/
    BrewForm.jsx           # Brew logging form
    BeanLibrary.jsx        # Bean CRUD + brew tracking
    BrewHistory.jsx        # History timeline + compare mode
    BrewTrends.jsx         # Recharts line charts
    EquipmentSetup.jsx     # Onboarding wizard / edit mode
    FlavorPicker.jsx       # Clickable flavor tag selector
    Header.jsx             # Top nav (desktop tabs + settings)
    MobileNav.jsx          # Bottom nav (mobile)
    SettingsMenu.jsx       # Settings dropdown, export/import
  data/
    defaults.js            # Static options (methods, grinders, flavors, etc.)
    storage.js             # localStorage CRUD + import/export/dedup
docs/
  plans/                   # Feature and bug-fix plan documents
  solutions/               # Post-mortem bug pattern documentation
```

See [CLAUDE.md](CLAUDE.md) for architecture details, data models, and coding patterns.
