---
title: "Raw internal field names displayed to users"
category: ui-bugs
tags: [display, field-labels, user-facing, camelCase, object-rendering]
module: BrewScreen
symptoms:
  - "UI shows 'coffeeGrams' instead of 'Coffee'"
  - "camelCase field names visible in diff/comparison views"
  - "[object Object] appears in user-facing text"
  - "Array fields render as comma-separated gibberish"
date: 2026-03-04
severity: P1
---

# Raw internal field names displayed to users

## Problem

The fork prompt in `BrewSuccess` compared brew values against recipe values and displayed the differences to the user. The field names were taken directly from the internal data model:

```jsx
{changedFields.map(({ field, brewVal, recipeVal }) => (
  <li key={field}>
    <span className="font-medium">{field}:</span>  {/* Shows "coffeeGrams" */}
    {String(recipeVal)} → {String(brewVal)}
  </li>
))}
```

This produced output like:
- `coffeeGrams: 15 → 16`
- `waterTemp: 93 → 96`
- `steps: [object Object],[object Object] → [object Object],[object Object]`

Two issues: (1) camelCase internal names shown to users, (2) complex types (arrays, objects) rendered via `String()` as garbage.

## Solution

Add a display label map and a skip-set for complex fields:

```jsx
const FIELD_LABELS = {
  coffeeGrams: 'Coffee',
  waterGrams: 'Water',
  grindSetting: 'Grind',
  waterTemp: 'Temp',
  targetTime: 'Target time',
  targetTimeRange: 'Time range',
  targetTimeMin: 'Min time',
  targetTimeMax: 'Max time',
  pourTemplateId: 'Template',
  method: 'Method',
  grinder: 'Grinder',
  dripper: 'Dripper',
  filterType: 'Filter',
}

const SKIP_DISPLAY_FIELDS = new Set(['steps'])
```

Then filter and translate in the render:

```jsx
{changedFields
  .filter(({ field }) => !SKIP_DISPLAY_FIELDS.has(field))
  .map(({ field, brewVal, recipeVal }) => (
    <li key={field}>
      <span className="font-medium">{FIELD_LABELS[field] || field}:</span>{' '}
      {String(recipeVal ?? '–')} → {String(brewVal ?? '–')}
    </li>
  ))}
```

Now displays: `Coffee: 15 → 16`, `Temp: 93 → 96`. Steps are hidden entirely since they need dedicated rendering.

## Prevention

- **Never interpolate internal field names into user-facing UI.** Always use a label map.
- When building diff/comparison views, audit every field for:
  1. Is the name user-friendly? If not, add to label map.
  2. Is the value a primitive? If not (array, object), either skip it or build dedicated rendering.
- `String()` on arrays/objects produces `[object Object]` — always check the type before stringifying.

## Detection checklist

Any time you iterate over object keys to display them, ask:
- [ ] Are keys translated to user-friendly labels?
- [ ] Are complex values (arrays, objects, null) handled?
- [ ] Does `String(value)` produce readable output for all possible types?

## Related

- `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md` — covers centralizing field name constants
- PR #30 review finding P1: Raw field names in fork prompt
