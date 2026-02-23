---
title: "feat: Add Brew Comparison Mode to BrewHistory"
type: feat
date: 2026-02-23
---

# feat: Add Brew Comparison Mode to BrewHistory

## Overview

Add a comparison mode to BrewHistory that lets users select any 2 brews and see a side-by-side diff of all parameters, flavors, and ratings. This helps users understand exactly what variables changed between two brews — especially when dialing in a bean.

## Problem Statement

Currently, BrewHistory only shows automatic diffs between *adjacent* brews (via `getDiff`). Users who want to compare non-adjacent brews — or see a full side-by-side breakdown — must mentally cross-reference by scrolling back and forth. This is the most common workflow when dialing in a recipe over several days.

## Proposed Solution

Add a "Compare" toggle to BrewHistory that switches the interaction model from "tap to expand" to "tap to select." When exactly 2 brews are selected, render a comparison panel above the brew list showing all parameters side-by-side with differences highlighted in amber.

All changes are contained within `BrewHistory.jsx` — no new components, no props changes, no App.jsx modifications needed.

---

## Technical Approach

### State Additions to BrewHistory.jsx

```jsx
// src/components/BrewHistory.jsx — new state
const [compareMode, setCompareMode] = useState(false)
const [selectedIds, setSelectedIds] = useState([])   // max length 2
```

When `compareMode` is toggled off, `selectedIds` is cleared. When `compareMode` is on, `expandedId` is set to `null` (expand/collapse disabled).

### Interaction State Machine

| Current State | User Action | Result |
|---|---|---|
| Compare off | Tap toggle | Compare on, 0 selected, expandedId nulled |
| 0 selected | Tap brew | 1 selected |
| 1 selected | Tap same brew | 0 selected (deselect) |
| 1 selected | Tap different brew | 2 selected, comparison panel appears |
| 2 selected | Tap selected brew | 1 selected, comparison panel hidden |
| 2 selected | Tap unselected brew | No change (ignored) |
| Any compare state | Tap toggle | Compare off, selections cleared, normal mode restored |
| 2 selected | Selected brew is deleted | Remove from selectedIds, comparison hidden |

### Comparison Logic — `compareBrews(brewA, brewB)`

New pure function that returns a structured diff object (not pre-formatted strings). Takes the older brew as `brewA`, newer as `brewB` (sorted by `brewedAt`).

```jsx
// src/components/BrewHistory.jsx — new function
function compareBrews(brewA, brewB) {
  const fields = [
    { key: 'coffeeGrams', label: 'Dose', unit: 'g' },
    { key: 'waterGrams', label: 'Water', unit: 'g' },
    { key: 'grindSetting', label: 'Grind', unit: '' },
    { key: 'waterTemp', label: 'Temp', unit: '°F' },
    { key: 'bloomTime', label: 'Bloom', format: formatTime },
    { key: 'bloomWater', label: 'Bloom Water', unit: 'g' },
    { key: 'totalTime', label: 'Total Time', format: formatTime },
  ]

  const diffs = []
  const params = []

  for (const field of fields) {
    const a = brewA[field.key]
    const b = brewB[field.key]
    const changed = a !== b
    const format = field.format || (v => `${v}${field.unit}`)
    params.push({ ...field, a, b, changed, aFormatted: format(a), bFormatted: format(b) })
    if (changed) diffs.push(field.label)
  }

  // Ratio (derived)
  const ratioA = brewA.waterGrams / brewA.coffeeGrams
  const ratioB = brewB.waterGrams / brewB.coffeeGrams
  const ratioChanged = ratioA.toFixed(1) !== ratioB.toFixed(1)
  params.push({
    key: 'ratio', label: 'Ratio', a: ratioA, b: ratioB, changed: ratioChanged,
    aFormatted: `1:${ratioA.toFixed(1)}`, bFormatted: `1:${ratioB.toFixed(1)}`
  })
  if (ratioChanged) diffs.push('Ratio')

  // Array fields
  const sharedFlavors = brewA.flavors.filter(f => brewB.flavors.includes(f))
  const uniqueA = brewA.flavors.filter(f => !brewB.flavors.includes(f))
  const uniqueB = brewB.flavors.filter(f => !brewA.flavors.includes(f))

  // Simple fields
  const simpleChanges = []
  if (brewA.beanName !== brewB.beanName) simpleChanges.push('Bean')
  if (brewA.roaster !== brewB.roaster) simpleChanges.push('Roaster')
  if (brewA.body !== brewB.body) simpleChanges.push('Body')
  if (brewA.rating !== brewB.rating) simpleChanges.push('Rating')
  if ((brewA.method || '') !== (brewB.method || '')) simpleChanges.push('Method')

  return {
    params,
    diffs: [...diffs, ...simpleChanges],
    flavors: { shared: sharedFlavors, uniqueA, uniqueB },
    flavorsChanged: uniqueA.length > 0 || uniqueB.length > 0,
  }
}
```

### UI Layout

#### Compare Toggle (top of BrewHistory)

Placed alongside the existing "Brew History" title and brew count. Uses a text button matching existing patterns.

```jsx
// src/components/BrewHistory.jsx — header area modification (around line 84)
<div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-lg font-semibold text-brew-800">Brew History</h2>
    <p className="text-xs text-brew-400 mt-0.5">{brews.length} brews logged</p>
  </div>
  {brews.length >= 2 && (
    <button
      onClick={() => {
        setCompareMode(!compareMode)
        setSelectedIds([])
        setExpandedId(null)
      }}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        compareMode
          ? 'bg-amber-100 text-amber-700'
          : 'bg-brew-100 text-brew-600 hover:bg-brew-200'
      }`}
    >
      {compareMode ? 'Done' : 'Compare'}
    </button>
  )}
</div>
```

**Key decisions:**
- Toggle hidden when < 2 brews (can't compare)
- Active state uses amber (matching "comparison" semantic color)
- Button text switches between "Compare" and "Done"

#### Selection Indicators on Brew Cards

In compare mode, each brew card gets a selection indicator. Replace the click handler from expand/collapse to selection toggle.

```jsx
// Selection indicator — prepended inside the card button
{compareMode && (
  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
    isSelected
      ? 'border-amber-500 bg-amber-500 text-white'
      : 'border-brew-200'
  }`}>
    {isSelected && <span className="text-xs font-bold">{selectionNumber}</span>}
  </div>
)}
```

- Shows numbered circles (1, 2) for selected brews
- Unselected brews show an empty circle
- Selected cards also get a border highlight: `border-amber-200 bg-amber-50/30`

#### Selection Status Bar

When in compare mode with 0 or 1 selections, show a hint bar:

```jsx
{compareMode && selectedIds.length < 2 && (
  <div className="mb-4 px-4 py-3 bg-amber-50 rounded-xl text-sm text-amber-700 text-center">
    {selectedIds.length === 0
      ? 'Tap two brews to compare them'
      : 'Tap one more brew to compare'}
  </div>
)}
```

#### Comparison Panel

Renders above the brew list when exactly 2 brews are selected. Uses a table-style layout (parameter label left, two value columns right) that works well on mobile.

```
+----------------------------------------------+
| WHAT CHANGED                                  |
| [Grind] [Dose] [Temp] [Rating]   (amber chips)|
+----------------------------------------------+
| Older brew header | Newer brew header          |
|   Bean, date, rating for each                 |
+----------------------------------------------+
|              RECIPE                           |
| Dose       | 20g          | 22g     (amber)  |
| Water      | 320g         | 320g             |
| Ratio      | 1:16.0       | 1:14.5  (amber)  |
| Grind      | 6            | 8       (amber)  |
| Temp       | 205°F        | 205°F            |
+----------------------------------------------+
|              TIMING                           |
| Bloom      | 0:45         | 0:45             |
| Bloom Water| 60g          | 60g              |
| Total Time | 3:30         | 3:15    (amber)  |
+----------------------------------------------+
|              TASTING                          |
| Flavors    | [shared][unique-amber]           |
| Body       | Medium       | Full    (amber)  |
| Rating     | star display for each            |
+----------------------------------------------+
|              NOTES                            |
| (only if at least one brew has notes)         |
| Brew A notes | Brew B notes                   |
+----------------------------------------------+
```

**Mobile layout strategy:** Uses a responsive table pattern. Each row has a label column (~35%) and two value columns (~32.5% each). At narrow widths, this gives roughly 110px + 95px + 95px. Values use `font-mono text-xs` to stay compact. This is readable down to 320px.

```jsx
// Comparison row component (inline within BrewHistory)
function ComparisonRow({ label, valueA, valueB, changed }) {
  return (
    <div className={`flex items-center py-2 px-3 ${changed ? 'bg-amber-50/50' : ''}`}>
      <div className="w-[35%] text-xs font-medium text-brew-500">{label}</div>
      <div className={`w-[32.5%] text-xs font-mono ${changed ? 'text-amber-700 font-semibold' : 'text-brew-700'}`}>
        {valueA}
      </div>
      <div className={`w-[32.5%] text-xs font-mono ${changed ? 'text-amber-700 font-semibold' : 'text-brew-700'}`}>
        {valueB}
      </div>
    </div>
  )
}
```

**Flavor comparison:** Shared flavors render in default `bg-brew-100 text-brew-600` tags. Unique-to-each-brew flavors render in `bg-amber-100 text-amber-700` tags to highlight what's different.

**Comparison panel container:**
```jsx
className="bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden mb-4"
```
(Matches existing card pattern.)

### Diff Chips in Compare Mode

Hide the existing adjacent-brew diff chips when `compareMode` is true. They show diffs relative to the previous brew, which would be confusing alongside the user's chosen comparison.

```jsx
// Existing diff chip rendering (around line 138) — add guard
{!compareMode && !isExpanded && diff && diff.length > 0 && (
  // ... existing diff chip JSX
)}
```

### Delete Safety

In the `handleDelete` function, add a guard to remove the deleted brew from `selectedIds`:

```jsx
// After deletion completes
setSelectedIds(prev => prev.filter(id => id !== deletedId))
```

Since expand/collapse is disabled in compare mode, the delete button is unreachable. No additional guarding needed. If the user exits compare mode and deletes a brew, the selectedIds cleanup still runs safely.

### Brew Order in Comparison

Always place the older brew (earlier `brewedAt`) on the left column. This gives a consistent "before -> after" reading direction and matches the existing `getDiff` directional format.

---

## Acceptance Criteria

### Functional Requirements

- [x] "Compare" button appears in BrewHistory header when >= 2 brews exist
- [x] Button is hidden when < 2 brews
- [x] Tapping "Compare" enters compare mode; tapping "Done" exits and clears selections
- [x] In compare mode, tapping a brew selects it (shows numbered circle indicator)
- [x] Tapping a selected brew deselects it
- [x] Tapping a third brew when 2 are selected does nothing
- [x] Status bar shows "Tap two brews to compare" / "Tap one more brew to compare"
- [x] When 2 brews selected, comparison panel renders above the brew list
- [x] Older brew on left, newer brew on right
- [x] "What Changed" summary at top shows amber chips for each differing field
- [x] All recipe params shown: dose, water, ratio (derived), grind, temp
- [x] All timing params shown: bloom time, bloom water, total time
- [x] Tasting section shows: flavors (shared vs unique highlighted), body, rating
- [x] Differences highlighted in amber (row background + text)
- [x] Matching values shown in default styling
- [x] Flavor tags: shared in default brew color, unique to each brew in amber
- [x] Notes shown for both brews (if either has notes)
- [x] Bean name, roaster, and brew date shown as headers for each column
- [x] Adjacent-brew diff chips hidden while in compare mode
- [x] Expand/collapse disabled while in compare mode
- [x] Comparison panel uses existing card styling patterns

### Edge Cases

- [x] Identical brews: "What Changed" shows "No differences in brew parameters"
- [x] Missing optional fields (no flavors, no notes, no issues): handled gracefully with empty/dash display
- [x] Deleting a selected brew clears it from selectedIds
- [x] Navigating away from History tab loses compare state (acceptable — component unmounts)

### Non-Functional Requirements

- [x] Readable at 320px viewport width (table layout)
- [x] Touch-friendly targets (44px+ for interactive elements)
- [x] Smooth transitions matching existing `transition-colors` patterns
- [x] No new dependencies

---

## Implementation Checklist

All changes in `src/components/BrewHistory.jsx`:

1. **Add state variables** — `compareMode`, `selectedIds`
2. **Add `compareBrews` function** — pure function returning structured diff object
3. **Modify header** — add Compare/Done toggle button
4. **Add selection status bar** — hint text when < 2 selected
5. **Modify brew card click handler** — branch on `compareMode` (select vs expand)
6. **Add selection indicators** — numbered circles on brew cards in compare mode
7. **Add selected card styling** — amber border/background for selected cards
8. **Add `ComparisonRow` inline component** — single row in the comparison table
9. **Add comparison panel** — full panel with What Changed summary, param sections, flavors, ratings, notes
10. **Guard diff chips** — hide adjacent-brew diffs in compare mode
11. **Guard delete handler** — clean up selectedIds on brew deletion

Estimated scope: ~150-180 lines of new JSX/logic added to BrewHistory.jsx (currently 227 lines).

---

## References

### Internal References

- `src/components/BrewHistory.jsx` — Target file; contains `getDiff` (lines 47-73), card rendering, expand/collapse pattern
- `src/components/BrewHistory.jsx:104` — Clickable card header pattern to modify
- `src/components/BrewHistory.jsx:138-152` — Existing diff chip rendering to guard
- `src/components/BrewHistory.jsx:75-80` — Delete handler to augment
- `src/data/defaults.js:104-110` — `RATING_SCALE` for rating display in comparison
- `src/data/defaults.js:100` — `BODY_OPTIONS` for body display
- `tailwind.config.js:12-23` — Custom `brew` color palette

### Design Patterns Reused

- Card container: `bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden`
- Info block: `p-3 bg-amber-50/50 rounded-xl`
- Flavor chip: `px-2 py-0.5 bg-brew-100 text-brew-600 rounded-full text-xs`
- Diff chip: `px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium`
- Toggle button: `px-4 py-2 rounded-xl text-sm font-medium transition-colors`
