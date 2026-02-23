---
title: "Import/export data integrity — partial overwrites, stale closures, and missing validation"
category: logic-errors
tags: [data-integrity, import-export, localStorage, react, stale-closure, validation, useMemo]
module: SettingsMenu, storage
symptoms:
  - Import replaces all localStorage keys even when file only contains some keys
  - Clicking outside import modal closes entire settings menu instead of just the modal
  - Large files crash the browser tab during FileReader parsing
  - Import accepts records with missing or non-string IDs
  - localStorage re-parsed on every render while import modal is open
date: 2026-02-23
severity: P1
---

# Import/export data integrity — partial overwrites, stale closures, and missing validation

## Problem Statement

When building a data export/import feature for a localStorage-backed React app, several data integrity and UX issues emerged across two rounds of code review:

1. **Partial import destroyed unrelated data.** Importing a file that only contained `brews` would also wipe `beans` and `equipment` because `importData()` unconditionally overwrote all three keys.

2. **Click-outside handler dismissed the import modal.** The `mousedown` event listener closed the entire settings menu when a user clicked the modal backdrop, because the handler couldn't distinguish "clicking outside the dropdown" from "clicking the modal overlay."

3. **No file size guard.** A multi-megabyte file would be read entirely into memory before any validation, potentially freezing the tab.

4. **Records with missing IDs were accepted.** Malformed records (missing `id` or non-string `id`) passed validation and entered localStorage, causing downstream lookup failures.

5. **localStorage re-parsed every render.** `getBrews()`, `getBeans()`, and `getEquipment()` were called inline during render, re-parsing JSON on every state change while the import modal was open.

## Root Cause

### 1. Unconditional key replacement in `importData()`

```js
// BAD — always sets all three keys, even if data.beans is undefined
export function importData(data) {
  localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(data.brews || []))
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(data.beans || []))
  localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment || null))
}
```

When `data.beans` is `undefined`, `data.beans || []` produces `[]`, which overwrites the user's existing bean library with an empty array.

### 2. Stale closure in click-outside handler

The `useEffect` for click-outside captured `importState` at mount time (always `null`). When the import modal opened later, the handler still saw `null` and treated modal backdrop clicks as "outside the menu."

### 3. No input boundary validation

`FileReader.readAsText()` was called immediately on file selection with no size check. Record-level validation only checked array types, not individual record shape.

## Solution

### 1. Guard `importData()` with `'key' in data` checks

`src/data/storage.js`:

```js
export function importData(data) {
  if ('brews' in data) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(data.brews || []))
  }
  if ('equipment' in data) {
    if (data.equipment) {
      localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
    } else {
      localStorage.removeItem(STORAGE_KEYS.EQUIPMENT)
    }
  }
  if ('beans' in data) {
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(data.beans || []))
  }
}
```

Using the `in` operator distinguishes "key is present with value `undefined`" from "key is not in the payload at all." Only keys explicitly included in the export file are touched.

### 2. Use a ref to break the stale closure

`src/components/SettingsMenu.jsx`:

```js
const importStateRef = useRef(importState)
importStateRef.current = importState  // sync on every render

useEffect(() => {
  function handleClick(e) {
    if (importStateRef.current) return  // modal handles its own dismissal
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      onClose()
    }
  }
  // ...
}, [onClose])
```

The ref always holds the current value of `importState`, so the event handler sees the latest state even though the effect only runs once.

### 3. Add file size guard before FileReader

```js
if (file.size > 5 * 1024 * 1024) {
  setFeedback({ type: 'error', message: 'File too large. Maximum size is 5MB.' })
  e.target.value = ''
  return
}
```

### 4. Filter records with invalid IDs

```js
if (data.brews) data.brews = data.brews.filter(b => b && typeof b.id === 'string')
if (data.beans) data.beans = data.beans.filter(b => b && typeof b.id === 'string')
```

### 5. Wrap localStorage reads in `useMemo`

```js
const localCounts = useMemo(() => {
  if (!importState) return null
  return { brews: getBrews(), beans: getBeans(), equipment: getEquipment() }
}, [importState])
```

The expensive JSON parsing only runs when `importState` changes (i.e., when the modal opens or closes), not on every render.

## Prevention

1. **Only touch what you're given.** When a function receives a partial payload, use `'key' in obj` to detect which keys are intentionally included. Never fall back to defaults for keys that aren't in the payload — that's indistinguishable from the user explicitly setting them to empty.

2. **Refs for event handlers, state for rendering.** When a `useEffect` registers an event listener that needs to read changing state, use a ref that syncs on every render. The effect captures the ref (stable), not the state (stale after first render).

3. **Validate at the boundary, not inline.** Check file size before reading, check JSON structure before parsing fields, check record shape before storing. Each validation layer catches a different class of bad input.

4. **Cache derived data with `useMemo`.** If you're calling a function that parses JSON from localStorage during render, wrap it in `useMemo` with an appropriate dependency. Re-parsing on every render is invisible but wasteful.

5. **Test import with partial payloads.** Export files from older versions or other tools may not contain all keys. Always test: brews-only file, beans-only file, equipment-only file, empty file, file with extra keys.

6. **Context-aware UI for empty states.** When local data is empty, show a single "Import" button instead of merge/replace options. The user doesn't need to make a decision when there's nothing to merge with.

7. **Audit all event handlers for closure staleness.** When adding new state that affects event handler behavior, check whether existing `useEffect` handlers capture that state. If the effect has an empty or limited dependency array, the handler won't see updates.

## Affected Files

| File | Role |
|------|------|
| `src/data/storage.js` | `importData()` — selective key replacement; `mergeData()` — dedup merge |
| `src/components/SettingsMenu.jsx` | Import modal, export download, click-outside handler, file validation |
| `src/App.jsx` | `onImportComplete` callback refreshes all state from localStorage |
| `src/components/Header.jsx` | Settings menu render prop slot |

## Related

- PR #5: feat(settings): Add data export and import functionality
- Plan: `docs/plans/2026-02-23-feat-data-export-import-plan.md`
- Existing solution: `docs/solutions/logic-errors/string-reference-rename-orphans-records.md` (same localStorage architecture, different integrity issue)
