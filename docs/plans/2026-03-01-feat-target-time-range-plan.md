---
title: "feat: Editable target time range across BrewScreen phases"
type: feat
date: 2026-03-01
---

# feat: Editable Target Time Range Across BrewScreen Phases

## Overview

Brewers think in target time *ranges* ("3:00 - 3:30"), not exact numbers. The `targetTime` and `targetTimeRange` fields exist in the data model but `targetTimeRange` is never user-editable and `targetTime` is locked after template selection. This feature exposes range editing in RecipeAssembly (Phase 1), displays the range during ActiveBrew (Phase 2), and compares actual vs range in PostBrewCommit (Phase 3).

## Problem Statement

1. **Target time is read-only in RecipeAssembly** -- the essentials card displays it at line 295 but has no input when editing mode is on. Every other field (coffee, water, grind, temp) is editable.
2. **Only single-value targets** -- `targetTime` is a number (seconds). Real brewing targets are ranges.
3. **No post-brew comparison** -- PostBrewCommit shows actual and target side-by-side but doesn't indicate whether the brew was in-range, over, or under.
4. **`targetTime` is overwritten at commit** -- line 824 replaces the user's target with the sum of step durations, losing user intent.

## Proposed Solution

### Data Model

Keep existing fields, add structured min/max:

```javascript
// On recipe state object (in-memory) and saved brew record:
{
  targetTime: 195,                // midpoint in seconds (for calculations, charts, legacy compat)
  targetTimeRange: "3:00 - 3:30", // display string
  targetTimeMin: 180,             // range min in seconds
  targetTimeMax: 210,             // range max in seconds
}
```

**Why structured fields:** The learnings doc `dual-field-names-for-same-data-cause-silent-loss.md` warns against replacing `targetTime`. Instead, we *supplement* it. `targetTime` stays as the single-number field all existing consumers (BrewHistory, BrewTrends, BrewForm) already read. The new `targetTimeMin`/`targetTimeMax` fields are only consumed by BrewScreen phases.

**Midpoint rule:** `targetTime = Math.round((targetTimeMin + targetTimeMax) / 2)`. For single targets (min equals max), `targetTime` equals both.

**Fix the commit overwrite:** Change line 824 from `targetTime: totalDuration` to `targetTime: recipe.targetTime`. The step-sum is already stored implicitly via `recipeSteps`.

### Utility Functions

Add to `src/data/storage.js`:

```javascript
// Parse "M:SS" string to seconds. Returns null for invalid input.
export function parseTime(str) {
  if (!str || typeof str !== 'string') return null
  const match = str.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

// Parse "M:SS - M:SS" or "M:SS" to { min, max } in seconds. Returns null for invalid.
export function parseTimeRange(str) {
  if (!str || typeof str !== 'string') return null
  const parts = str.split(/\s*[-\u2013]\s*/) // hyphen or en-dash
  const min = parseTime(parts[0])
  if (min === null) return null
  const max = parts.length > 1 ? parseTime(parts[1]) : min
  if (max === null) return null
  // Auto-swap if inverted
  return min <= max ? { min, max } : { min: max, max: min }
}

// Format { min, max } seconds to display string
export function formatTimeRange(min, max) {
  if (min == null || max == null) return formatTime(min ?? max)
  if (min === max) return formatTime(min)
  return `${formatTime(min)} - ${formatTime(max)}`
}
```

### Phase 1: RecipeAssembly (line 157+)

In the essentials card (line 294-296), replace the static target time display with an editable row when `editing` is true:

```
┌──────────────────────────────────┐
│  TARGET TIME                     │
│  ┌──────┐  to  ┌──────┐         │
│  │ 3:00 │      │ 3:30 │         │
│  └──────┘      └──────┘         │
└──────────────────────────────────┘
```

**Two separate M:SS text inputs** (Option A). Rationale: mobile-friendly, no parsing ambiguity, clearer semantics. Use `inputMode="numeric"` with `type="text"` for the number pad.

When editing completes ("Done" button):
1. Parse both inputs via `parseTime()`
2. Auto-swap if min > max
3. Update recipe: `targetTimeMin`, `targetTimeMax`, `targetTime` (midpoint), `targetTimeRange` (formatted string)

When not editing, display as before: `recipe.targetTimeRange || formatTime(recipe.targetTime)`

**No auto-sync with step durations.** Target range and step durations are independent. Steps are the *plan*, target is the *goal* -- they can differ.

### Phase 2: ActiveBrew (line 513+)

The target display already exists at line 615: `Target: {recipe.targetTimeRange || formatTime(recipe.targetTime)}`. This continues to work with no changes needed for display.

**Progress bar and overTime behavior change:**

Replace lines 598-599:
```javascript
// Before:
const progress = Math.min(timer.elapsed / totalDuration, 1)
const overTime = timer.elapsed > totalDuration

// After:
const targetMax = recipe.targetTimeMax || recipe.targetTime || totalDuration
const progress = Math.min(timer.elapsed / targetMax, 1)
const overTime = timer.elapsed > targetMax
```

This uses the user's target range max (when set) for progress bar and red-timer threshold, falling back to `recipe.targetTime` then step-sum.

### Phase 3: PostBrewCommit (line 761+)

Add a comparison indicator below the existing target time display (line 878-879):

```javascript
// Compute comparison
const targetMin = recipe.targetTimeMin || recipe.targetTime || null
const targetMax = recipe.targetTimeMax || recipe.targetTime || null
const elapsed = brewData.elapsed

let timeStatus = null
if (targetMin != null && targetMax != null) {
  if (elapsed < targetMin) timeStatus = 'under'
  else if (elapsed > targetMax) timeStatus = 'over'
  else timeStatus = 'on-target'
}
```

Visual treatment:
- **On target** (green): "On target" badge
- **Under** (amber): "{X}s under target" with amber text
- **Over** (red): "{X}s over target" with red text

For single targets (min equals max), use +/- 10 second tolerance for "on target".

**Persist comparison to brew record:** Add `timeStatus` field to the committed brew object so BrewHistory can display it without recomputation.

### Commit Logic Fix (line 824)

```javascript
// Before:
targetTime: totalDuration,
targetTimeRange: recipe.targetTimeRange || formatTime(totalDuration),

// After:
targetTime: recipe.targetTime || totalDuration,
targetTimeRange: recipe.targetTimeRange || formatTime(recipe.targetTime || totalDuration),
targetTimeMin: recipe.targetTimeMin || null,
targetTimeMax: recipe.targetTimeMax || null,
timeStatus,
```

### buildRecipeFromBean Update (line 1054+)

```javascript
// Add to the returned recipe object:
targetTimeMin: lastBrew?.targetTimeMin || null,
targetTimeMax: lastBrew?.targetTimeMax || null,
```

## Acceptance Criteria

- [x] RecipeAssembly: target time row is editable in edit mode with two M:SS inputs (min/max)
- [x] RecipeAssembly: entering a single value (same min/max) works as a point target
- [x] RecipeAssembly: inverted ranges are auto-swapped
- [x] RecipeAssembly: display shows formatted range when not editing
- [x] ActiveBrew: target range displayed near timer (already works, verify)
- [x] ActiveBrew: progress bar and overTime use target range max, not step-sum
- [x] PostBrewCommit: shows "On target" / "Xs under" / "Xs over" badge with color coding
- [x] Commit: `targetTime` preserves user intent (not overwritten with step-sum)
- [x] Commit: `targetTimeMin`, `targetTimeMax`, `targetTimeRange`, `timeStatus` saved to brew record
- [x] Pre-fill: next brew of same bean inherits the target range from last brew
- [x] Persistence: target range survives active-brew resume (page refresh mid-brew)
- [x] Legacy compat: brews without `targetTimeMin`/`targetTimeMax` display correctly (fallback to `targetTime`)
- [x] `parseTime()` and `parseTimeRange()` handle edge cases: null, empty, malformed, inverted

## Technical Considerations

**Institutional learnings applied:**
- `dual-field-names-for-same-data-cause-silent-loss.md`: Keep `targetTime` as the canonical single-number field. Add new fields alongside, not replacing.
- `edit-form-overwrites-fields-it-doesnt-manage.md`: BrewForm doesn't manage `targetTimeMin`/`targetTimeMax`. The commit spread in PostBrewCommit explicitly sets these fields, so no silent loss occurs.
- `persist-and-restore-must-be-end-to-end.md`: Target range fields are part of `recipe` which is already persisted via `saveActiveBrew()`. Verify the round-trip: set range -> refresh -> resume -> range displays correctly.
- `lazy-init-state-goes-stale-on-prop-change.md`: Recipe is re-initialized in `handleBeanSelect` via `buildRecipeFromBean()`, which will include the new fields. No stale state risk.

**Out of scope:**
- BrewForm range support (continues using numeric `targetTime`)
- BrewHistory UI updates for target range display (separate PR)
- BrewTrends target time chart line
- `formatTime` consolidation (tracked in todo #018)

## Dependencies & Risks

- **Low risk:** All changes are in `BrewScreen.jsx` and `storage.js`. No cross-component dependencies beyond adding fields to the brew record.
- **Data compat:** Existing brews without `targetTimeMin`/`targetTimeMax` work via fallback to `targetTime`. No migration needed.
- **BrewForm editing:** Editing a BrewScreen brew in BrewForm will preserve `targetTime` (the midpoint) but lose `targetTimeMin`/`targetTimeMax`. Acceptable for now; tracked as a known limitation.

## References

- `src/components/BrewScreen.jsx` -- all three phases
- `src/data/storage.js:299` -- `formatTime()`, new `parseTime()`/`parseTimeRange()`/`formatTimeRange()` additions
- `docs/solutions/logic-errors/dual-field-names-for-same-data-cause-silent-loss.md`
- `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`
- `docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md`

## MVP

### src/data/storage.js -- New utility functions

```javascript
export function parseTime(str) {
  if (!str || typeof str !== 'string') return null
  const match = str.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

export function parseTimeRange(str) {
  if (!str || typeof str !== 'string') return null
  const parts = str.split(/\s*[-\u2013]\s*/)
  const min = parseTime(parts[0])
  if (min === null) return null
  const max = parts.length > 1 ? parseTime(parts[1]) : min
  if (max === null) return null
  return min <= max ? { min, max } : { min: max, max: min }
}

export function formatTimeRange(min, max) {
  if (min == null || max == null) return formatTime(min ?? max)
  if (min === max) return formatTime(min)
  return `${formatTime(min)} - ${formatTime(max)}`
}
```

### src/components/BrewScreen.jsx -- RecipeAssembly target time input

```jsx
{/* Target Time — editable range */}
<div className="mt-4 text-center">
  <div className="text-[11px] text-brew-400 uppercase tracking-wider mb-1">Target Time</div>
  {editing ? (
    <div className="flex items-center justify-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={formatTime(recipe.targetTimeMin || recipe.targetTime)}
        onChange={e => {
          const secs = parseTime(e.target.value)
          if (secs !== null) {
            const max = recipe.targetTimeMax || secs
            updateField('targetTimeMin', secs)
            updateField('targetTimeMax', max)
            updateField('targetTime', Math.round((secs + max) / 2))
            updateField('targetTimeRange', formatTimeRange(secs, max))
          }
        }}
        placeholder="3:00"
        className="w-16 text-center text-lg font-medium text-brew-800 bg-transparent
                   border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
      />
      <span className="text-brew-400 text-sm">to</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatTime(recipe.targetTimeMax || recipe.targetTime)}
        onChange={e => {
          const secs = parseTime(e.target.value)
          if (secs !== null) {
            const min = recipe.targetTimeMin || secs
            updateField('targetTimeMax', secs)
            updateField('targetTimeMin', min)
            updateField('targetTime', Math.round((min + secs) / 2))
            updateField('targetTimeRange', formatTimeRange(min, secs))
          }
        }}
        placeholder="3:30"
        className="w-16 text-center text-lg font-medium text-brew-800 bg-transparent
                   border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
      />
    </div>
  ) : (
    <div className="text-brew-800 font-medium">
      {recipe.targetTimeRange || formatTime(recipe.targetTime)}
    </div>
  )}
</div>
```

### src/components/BrewScreen.jsx -- PostBrewCommit time status badge

```jsx
{/* Time status indicator */}
{(() => {
  const tMin = recipe.targetTimeMin || recipe.targetTime
  const tMax = recipe.targetTimeMax || recipe.targetTime
  if (!tMin) return null
  const tolerance = tMin === tMax ? 10 : 0
  const under = brewData.elapsed < tMin - tolerance
  const over = brewData.elapsed > tMax + tolerance
  const delta = under ? tMin - brewData.elapsed : over ? brewData.elapsed - tMax : 0
  return (
    <div className={`text-sm font-semibold mt-1 ${
      under ? 'text-amber-500' : over ? 'text-red-500' : 'text-green-600'
    }`}>
      {under ? `${delta}s under target` : over ? `${delta}s over target` : 'On target'}
    </div>
  )
})()}
```
