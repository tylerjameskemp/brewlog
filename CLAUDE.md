# BrewLog — Adaptive Brewing Journal

## What This Project Is
A pour-over coffee brewing journal that helps users track brews, tag flavors, and see patterns over time. Built with React + Vite + Tailwind CSS. Data stored in localStorage.

## Architecture
- **React 18** with functional components and hooks
- **Vite** for dev server and bundling
- **Tailwind CSS** for styling (custom `brew` color palette in tailwind.config.js)
- **localStorage** for persistence (via `src/data/storage.js`)
- **No backend** — everything runs client-side

## Key Files
- `src/App.jsx` — Main component, manages views and state
- `src/data/defaults.js` — All default options (methods, grinders, flavors, etc.)
- `src/data/storage.js` — localStorage read/write helpers
- `src/components/BrewForm.jsx` — The brew logging form (pre-fills from last brew)
- `src/components/BrewHistory.jsx` — Browse past brews with auto-diff
- `src/components/FlavorPicker.jsx` — Clickable flavor tag selector
- `src/components/EquipmentSetup.jsx` — One-time gear profile setup

## Data Model
A brew record looks like:
```json
{
  "id": "uuid",
  "beanName": "Heart Columbia Javier Omar",
  "roaster": "Heart",
  "roastDate": "2026-02-10",
  "coffeeGrams": 20,
  "waterGrams": 320,
  "grindSetting": 6,
  "waterTemp": 205,
  "bloomTime": 45,
  "bloomWater": 60,
  "totalTime": 210,
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

## Design Principles
1. **Pre-fill from last brew** — Most brews are similar. Show what changed.
2. **Click-to-select** — Flavors, body, issues are all clickable tags, not text fields.
3. **Collapsible sections** — Don't overwhelm. Show detail on demand.
4. **Warm coffee palette** — Custom `brew-*` colors from amber/brown range.
5. **Mobile-first** — Max-width 2xl, touch-friendly tap targets.

## Commands
- `npm install` — Install dependencies
- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Build for production

## Future Plans (Do NOT implement unless asked)
- AI brewing coach (Claude API integration)
- Bean freshness tracking and alerts
- Brew trend charts (Recharts)
- Export/import data
- PWA for mobile
- Scalable UI complexity toggle
