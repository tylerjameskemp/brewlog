---
title: "feat: Add Brew Trend Charts"
type: feat
date: 2026-02-23
---

# feat: Add Brew Trend Charts

## Overview

Add a "Trends" tab to BrewLog that displays three stacked line charts (Rating, Grind Setting, Brew Time) using Recharts. The charts show the last 20 brews in chronological order with bean name labels on data points. This is a read-only view — no interactions beyond tooltips.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/Header.jsx` | Add `{ id: 'trends', label: 'Trends' }` to the `tabs` array |
| `src/App.jsx` | Import `BrewTrends`, add `{view === 'trends' && <BrewTrends brews={brews} />}` block |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/BrewTrends.jsx` | New component — three stacked Recharts line charts |

## Acceptance Criteria

- [x] "Trends" tab appears in the navigation bar (last position, after "History")
- [x] Clicking "Trends" tab renders the `BrewTrends` component
- [x] If fewer than 3 brews exist, show centered empty state: "Log more brews to see trends"
- [x] Three line charts render stacked vertically: Rating, Grind Setting, Brew Time
- [x] Charts show the last 20 brews in chronological order (oldest left, newest right)
- [x] Each data point shows the bean name (via Recharts tooltip on hover/tap)
- [x] Charts use the `brew-*` color palette hex values
- [x] Charts are responsive within the `max-w-2xl` container
- [x] Component matches existing code patterns (block comment header, named function export)

## Design Decisions

These resolve the edge cases identified during spec analysis:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Missing `totalTime` (empty string) | Skip data point (gap in line) | Plotting 0 is misleading; a gap is honest |
| `rating` of 0 (unrated) | Skip data point (gap in line) | 0 is outside the 1-5 scale; unrated != terrible |
| Non-numeric `grindSetting` (text) | Skip data point (gap in line) | String can't plot on numeric axis |
| Empty `beanName` | Show "Unknown" in tooltip | Matches `BrewHistory.jsx` pattern |
| Rating Y-axis domain | Fixed 1-5 | Matches `RATING_SCALE`; prevents misleading auto-scale |
| Grind Y-axis domain | Auto-scale from data | Grinder ranges vary widely (1-11 vs 0-40) |
| Brew time Y-axis | Custom `m:ss` tick formatter | Consistent with `formatTime()` used elsewhere |
| Bean name display | Tooltip on hover/tap (not static labels) | Static labels overlap badly at 20 points on mobile |
| X-axis format | `M/D` date format | Consistent with app's existing date display |
| Chart height | ~180px each via `ResponsiveContainer` | Three charts fit on phone with first fully visible |
| Tab position | Last: `[New Brew, Beans, History, Trends]` | Read-only view, newest feature |
| Multiple brew methods mixed | Show all methods together | Keep simple for v1 |
| `needsSetup` gating | Not gated (like History/Beans) | Shows empty state harmlessly |

## Implementation Plan

### Step 1: Add "Trends" tab to Header.jsx

In `src/components/Header.jsx`, add to the `tabs` array (line 10):

```jsx
const tabs = [
  { id: 'brew', label: 'New Brew' },
  { id: 'beans', label: 'Beans' },
  { id: 'history', label: 'History' },
  { id: 'trends', label: 'Trends' },
]
```

### Step 2: Add view routing in App.jsx

In `src/App.jsx`:

1. Import the new component at the top with the other component imports:

```jsx
import BrewTrends from './components/BrewTrends'
```

2. Add conditional render block after the History block (~line 98):

```jsx
{view === 'trends' && (
  <BrewTrends brews={brews} />
)}
```

### Step 3: Create BrewTrends.jsx

Create `src/components/BrewTrends.jsx` with the following structure:

```jsx
// ============================================================
// BREW TRENDS -- Visual charts showing brewing patterns over time
// ============================================================
// Displays three stacked line charts (Rating, Grind Setting, Brew
// Time) for the last 20 brews. Uses Recharts for rendering.

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function BrewTrends({ brews }) {
  // Empty state: fewer than 3 brews
  // Data prep: take last 20, reverse to chronological, format dates
  // Three chart sections with titles
}
```

**Component internals:**

**a) Data preparation (top of component):**
- Early return with empty state if `brews.length < 3`
- Take first 20 from array (newest-first storage), reverse for chronological order
- Map to chart-friendly objects: `{ date, rating, grindSetting, totalTime, beanName }`
- Filter logic: skip falsy values per-chart (don't filter the whole brew, just omit the point from the relevant chart's data)

**b) Helper: `formatTime(seconds)`** — convert seconds to `m:ss` for Y-axis ticks. Define inline (matches existing component pattern).

**c) Helper: `formatDate(isoString)`** — format to `M/D`. Define inline.

**d) Custom tooltip component** — shows bean name, value, and date. Styled with `brew-*` palette colors.

**e) Three chart sections, each wrapped in a card-like container:**

```jsx
<div className="space-y-4">
  {/* Rating Chart */}
  <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-4">
    <h3 className="text-sm font-medium text-brew-700 mb-2">Rating</h3>
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5e6d0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a0673c' }} />
        <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: '#a0673c' }} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="rating"
          stroke="#7c4f2e"
          strokeWidth={2}
          dot={{ fill: '#7c4f2e', r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* Grind Setting Chart — same pattern, auto-scale Y-axis, stroke="#c08552" */}
  {/* Brew Time Chart — same pattern, custom m:ss tick formatter, stroke="#d4a574" */}
</div>
```

**Color assignments per chart:**
- Rating: `#7c4f2e` (brew-600) — darkest, primary metric
- Grind Setting: `#c08552` (brew-400) — medium
- Brew Time: `#d4a574` (brew-300) — lightest

**Chart grid/axis colors:**
- Grid: `#f5e6d0` (brew-100)
- Axis text: `#a0673c` (brew-500)

**f) Empty state (fewer than 3 brews):**

```jsx
<div className="mt-12 text-center text-brew-400">
  <div className="text-4xl mb-3">...</div>
  <p className="text-lg font-medium">Log more brews to see trends</p>
  <p className="text-sm mt-1">You need at least 3 brews to spot patterns</p>
</div>
```

Follows the exact empty state pattern from `BrewHistory.jsx`.

## References

- Navigation tabs: `src/components/Header.jsx:8-12`
- View routing: `src/App.jsx:74-98`
- Brews state: `src/App.jsx:26` (`useState`)
- Empty state pattern: `src/components/BrewHistory.jsx:36-43`
- Component header pattern: `src/components/BrewForm.jsx:1-6`
- Color palette: `tailwind.config.js:11-23`
- Brew data model: `CLAUDE.md` data model section
- `formatTime` example: `src/components/BrewHistory.jsx:39-44`
- Storage (newest-first): `src/data/storage.js:29` (`brews.unshift`)
- Recharts dependency: `package.json:14` (`"recharts": "^2.12.0"`)
