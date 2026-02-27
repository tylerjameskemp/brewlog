---
title: "Dual field names for the same data cause silent loss in consumers"
category: logic-errors
tags: [data-model, field-naming, backwards-compatibility, brewscreen]
module: BrewScreen, BrewHistory
symptoms:
  - "New feature's data doesn't show up in existing views"
  - "Same information stored under two different field names"
  - "Consumers read the old field name and get empty/null"
date: 2026-02-27
severity: P1
---

# Dual field names for the same data cause silent loss in consumers

## Problem

When adding a new feature that extends an existing data model, it's tempting to use a new, more descriptive field name (e.g., `brewNotes` instead of `notes`). But if existing consumers read the old field name, the new data silently disappears from their view.

In BrewScreen, the Post-Brew Commit saves `notes: ''` (empty) alongside `brewNotes` (the user's actual notes). BrewHistory displays `brew.notes`, so BrewScreen-created brews always show empty notes in the history timeline.

## Root Cause

The developer wanted to distinguish between "general notes" (legacy BrewForm) and "brew-specific notes" (BrewScreen) by using different field names. The intent was correct (semantic clarity), but the effect was data loss because the consumer contract wasn't updated.

## Solution

### Rule: When extending a data model, always check all consumers of the field you're replacing

Before introducing a new field name for existing data:

1. Grep for all reads of the old field: `grep -r 'brew\.notes' src/`
2. If consumers exist, either:
   - **Use the same field name** (simplest, no consumer changes needed)
   - **Update all consumers** to check both fields (risky, easy to miss one)
   - **Write to both fields** (redundant but safe): `notes: brewNotes, brewNotes`

### Applied fix:

```jsx
// Before (broken):
notes: '',           // Legacy field — consumers read this
brewNotes,           // New field — nothing reads this

// After (fixed):
notes: brewNotes,    // Same field name, all consumers work
```

### When you DO need a new field name:

If the new field genuinely represents different data (not just a rename), then:
1. Keep writing to the old field with a sensible value
2. Add the new field alongside it
3. Update consumers incrementally
4. Document the migration path

## Related

- `string-reference-rename-orphans-records.md` — similar issue with bean names: changing a reference without updating all pointers causes data to become unreachable.
