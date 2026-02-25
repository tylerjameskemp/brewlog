---
title: "View-local filtering with dropdown options derived from multiple data sources"
category: react-patterns
tags: [filtering, useMemo, deduplication, dropdown, view-state]
module: BrewTrends
symptoms:
  - "Need to filter a view by an entity name that exists in multiple data sources"
  - "Dropdown options should include items from library AND from historical records"
  - "Filter state doesn't need to persist or be shared with other views"
date: 2026-02-25
severity: P3
---

# View-local filtering with dropdown options derived from multiple data sources

## Problem

When adding a filter dropdown to a view, the options may need to come from multiple data sources. For example, filtering brews by bean name requires options from both the bean library (canonical names) AND brew history (which may reference beans not in the library — deleted beans, renamed beans, imported data).

Using only one source misses valid options. Using both without deduplication shows duplicates.

## Solution

### Derive options from all sources, deduplicate case-insensitively

```jsx
const beanOptions = useMemo(() => {
  const nameSet = new Map()  // key: normalized, value: display name
  // Primary source (canonical names)
  beans.forEach(b => {
    if (b.name?.trim()) nameSet.set(b.name.trim().toLowerCase(), b.name.trim())
  })
  // Secondary source (historical references — only add if not already present)
  brews.forEach(b => {
    if (b.beanName?.trim()) {
      const key = b.beanName.trim().toLowerCase()
      if (!nameSet.has(key)) nameSet.set(key, b.beanName.trim())
    }
  })
  return [...nameSet.values()].sort((a, b) => a.localeCompare(b))
}, [beans, brews])
```

**Key decisions:**
- Primary source (bean library) wins on display name for duplicates
- Secondary source (brews) fills gaps for unlisted beans
- `Map` with normalized key ensures case-insensitive dedup
- Sort alphabetically for predictable UI

### Keep filter state local to the view

```jsx
const [selectedBean, setSelectedBean] = useState('')
```

Don't lift filter state to App.jsx unless multiple views share it. View-local state:
- Resets when navigating away (expected behavior — filter is transient)
- Avoids prop-drilling
- Keeps App.jsx simple

### Show the filter even in empty states

When the filtered view has no data (e.g., 0 brews for a bean), keep the dropdown visible so the user can switch to another option. If you hide the dropdown in the empty state, users get stuck.

## When This Applies

- Any view that filters by an entity referenced via string name (not ID)
- Entity names may exist in a "library" collection AND in historical records
- Filter is view-specific, not app-wide

## Related

- `docs/solutions/logic-errors/string-reference-rename-orphans-records.md` — why string references can diverge between sources
- `src/data/storage.js:79` — the `.trim().toLowerCase()` normalization pattern reused here
- PR #13: feat: Add per-bean filtering to trend charts
