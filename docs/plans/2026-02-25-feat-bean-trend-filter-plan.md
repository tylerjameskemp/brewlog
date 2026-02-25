---
title: "feat: Add per-bean filtering to trend charts"
type: feat
date: 2026-02-25
---

# feat: Add per-bean filtering to trend charts

## Overview

Add a bean filter dropdown to the Brew Trends view so brewers can isolate trend data for a specific bean. When filtered, show a stats summary (average rating, brew count, grind range, top flavors). This enables the "dial-in" workflow: tracking grind/ratio/timing adjustments for a single bag without noise from other beans.

## Problem Statement

The trend charts show all brews together. When dialing in a new bag (e.g., adjusting grind across 4-5 brews of "Heart Columbia"), trends are polluted by unrelated beans. A brewer can't see whether their grind adjustments are actually improving ratings for that specific bean.

## Proposed Solution

Add filtering entirely within `BrewTrends.jsx`. Keep it self-contained — the filter is view-local state, no App-level changes needed beyond passing the `beans` prop.

### Implementation

#### 1. Pass `beans` prop to BrewTrends (`src/App.jsx:121`)

```jsx
{view === 'trends' && (
  <BrewTrends brews={brews} beans={beans} />
)}
```

One line change. BrewTrends needs the bean library to populate the dropdown.

#### 2. Add filter state and dropdown (`src/components/BrewTrends.jsx`)

Add `selectedBean` state at the top of the component:

```jsx
const [selectedBean, setSelectedBean] = useState('')
```

Build dropdown options by combining bean library names + unique `beanName` values from brews (covers brews referencing beans not in the library). Deduplicate via case-insensitive matching, sort alphabetically:

```jsx
const beanOptions = useMemo(() => {
  const nameSet = new Map()
  beans.forEach(b => {
    if (b.name?.trim()) nameSet.set(b.name.trim().toLowerCase(), b.name.trim())
  })
  brews.forEach(b => {
    if (b.beanName?.trim()) {
      const key = b.beanName.trim().toLowerCase()
      if (!nameSet.has(key)) nameSet.set(key, b.beanName.trim())
    }
  })
  return [...nameSet.values()].sort((a, b) => a.localeCompare(b))
}, [beans, brews])
```

Render a `<select>` dropdown above the charts, styled with the brew-* palette:

```jsx
<div className="flex items-center gap-3">
  <h2 className="text-lg font-semibold text-brew-800">Trends</h2>
  <select
    value={selectedBean}
    onChange={e => setSelectedBean(e.target.value)}
    className="text-sm border border-brew-200 rounded-lg px-3 py-1.5 bg-white
               text-brew-700 focus:outline-none focus:ring-2 focus:ring-brew-300
               text-base"
  >
    <option value="">All Beans</option>
    {beanOptions.map(name => (
      <option key={name} value={name}>{name}</option>
    ))}
  </select>
</div>
```

Note: `text-base` on the select prevents iOS auto-zoom (documented pattern in CLAUDE.md).

#### 3. Filter brews before building chart data

Apply the filter before the existing `slice(0, 20).reverse()` logic:

```jsx
const filteredBrews = selectedBean
  ? brews.filter(b => b.beanName?.trim().toLowerCase() === selectedBean.trim().toLowerCase())
  : brews
```

Then use `filteredBrews` everywhere instead of `brews` for chart data and the empty state check.

#### 4. Adjust empty state for filtered view

When a bean is selected but has < 3 brews, the empty state messaging should reflect the filter context:

```jsx
if (filteredBrews.length < 3) {
  const remaining = 3 - filteredBrews.length
  // If filtered, show "Log N more brews with [bean]..."
  // If unfiltered, show existing generic message
}
```

#### 5. Add stats summary when filtered (`src/components/BrewTrends.jsx`)

Only show when `selectedBean` is set AND there are brews. Compute from `filteredBrews`:

- **Brew count**: `filteredBrews.length`
- **Average rating**: mean of `rating` values (skip nulls), rounded to 1 decimal
- **Grind range**: `min – max` of `grindSetting` values
- **Most common flavors**: frequency count across all `flavors` arrays, show top 3

Render as a compact card between the dropdown and the charts:

```jsx
{selectedBean && filteredBrews.length > 0 && (
  <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-4
                  grid grid-cols-2 gap-3 sm:grid-cols-4">
    <StatItem label="Brews" value={stats.brewCount} />
    <StatItem label="Avg Rating" value={stats.avgRating} />
    <StatItem label="Grind Range" value={stats.grindRange} />
    <StatItem label="Top Flavors" value={stats.topFlavors} />
  </div>
)}
```

`StatItem` is a tiny inline component (label + value), not a separate file.

## Technical Considerations

- **No App-level state change**: The filter is local to BrewTrends. Only change in App.jsx is passing `beans` prop.
- **iOS compatibility**: `text-base` on the `<select>` to prevent Safari auto-zoom (documented pattern).
- **Performance**: `useMemo` for bean options and stats computation. The data set is small (max ~100 brews in localStorage) so this is more for pattern consistency than necessity.
- **Animation**: Stats card uses existing `animate-fade-in-up motion-reduce:animate-none` pattern.
- **String matching**: Case-insensitive `.trim().toLowerCase()` comparison, matching the existing pattern used throughout `storage.js`.

## Acceptance Criteria

- [x] Bean filter dropdown appears above trend charts in `BrewTrends.jsx`
- [x] Dropdown is populated from bean library + unique brew bean names, sorted alphabetically
- [x] Default value is "All Beans" (shows all brews — current behavior)
- [x] Selecting a bean filters all 3 charts to only that bean's brews
- [x] Stats summary (brew count, avg rating, grind range, top flavors) shows when a bean is selected
- [x] Empty state shows when a filtered bean has < 3 brews, with bean-specific messaging
- [x] `text-base` on the select element to prevent iOS auto-zoom
- [x] Animations respect `prefers-reduced-motion`

## Files Changed

| File | Change |
|------|--------|
| `src/App.jsx:121` | Pass `beans` prop to `<BrewTrends>` |
| `src/components/BrewTrends.jsx` | Add filter dropdown, filtering logic, stats summary, adjusted empty state |

Two files. One is a one-line change. The real work is in `BrewTrends.jsx`.

## References

- Existing chart implementation: `src/components/BrewTrends.jsx`
- Bean data model and deduplication: `src/data/storage.js:72-128`
- Brew data model (beanName field): `src/data/storage.js:21-31`
- String normalization pattern: `src/data/storage.js:79` (`.trim().toLowerCase()`)
- iOS auto-zoom fix: CLAUDE.md "iOS auto-zoom" pattern
- Animation patterns: `tailwind.config.js:31-48`
