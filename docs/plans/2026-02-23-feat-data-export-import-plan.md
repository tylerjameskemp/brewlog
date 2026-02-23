---
title: "feat: Add data export and import functionality"
type: feat
date: 2026-02-23
---

# feat: Add data export and import functionality

## Overview

Add export/import buttons behind the gear icon so users can back up and restore their BrewLog data as JSON files. The gear icon becomes a settings dropdown with three options: Equipment Setup, Export Data, and Import Data. Import supports both merge and replace modes. This is critical for backup and future BrewWeave integration.

## Problem Statement / Motivation

All BrewLog data lives in localStorage with no backup mechanism. If a user clears browser data, switches devices, or encounters a localStorage corruption, all brewing history is lost. Export/import provides:

- **Backup safety net** for valuable brewing data
- **Device portability** (export from laptop, import on phone)
- **Future BrewWeave integration** path (shared export format)

## Proposed Solution

### 1. Settings Dropdown Menu (new component)

**File:** `src/components/SettingsMenu.jsx`

Refactor the gear icon (`src/components/Header.jsx:41-48`) to open a dropdown menu instead of directly opening EquipmentSetup.

The dropdown appears below the gear icon and contains three items:
- **Equipment Setup** — opens the existing EquipmentSetup modal (preserves current behavior)
- **Export Data** — triggers JSON file download
- **Import Data** — opens file picker, then shows merge/replace confirmation

Dropdown dismisses on: click outside, Escape key, or item selection.

**Wiring in App.jsx:** Change `onSettingsClick` to toggle the dropdown. Pass a new `onImportComplete` callback that refreshes React state after import.

### 2. Export Flow

**Trigger:** User clicks "Export Data" in the settings dropdown.

**Steps:**
1. Call existing `exportData()` from `src/data/storage.js:117-126` — returns `{ brews, equipment, beans, exportedAt }`
2. Add `version: 1` to the export object (future-proofing for schema changes)
3. `JSON.stringify(data, null, 2)` for readable output
4. Create a `Blob` and trigger download via a temporary `<a>` element
5. Filename: `brewlog-export-YYYY-MM-DD.json` using **local date** (matches user's mental model)
6. Show brief success feedback in the dropdown area

**No changes needed to `exportData()`** — just add `version` in the calling code.

### 3. Import Flow

**Trigger:** User clicks "Import Data" in the settings dropdown.

**Steps:**
1. Open browser file picker via hidden `<input type="file" accept=".json">`
2. Read file with `FileReader.readAsText()`
3. Parse JSON with `JSON.parse()` — catch and show error if invalid
4. **Validate top-level structure:**
   - `brews` must be an array (or absent)
   - `beans` must be an array (or absent)
   - `equipment` must be an object or null (or absent)
   - Reject anything else with a clear error message
5. Show **Import Confirmation Modal** with:
   - File summary: "Exported on [date], contains X brews, Y beans, [has/no] equipment"
   - Current data summary: "You currently have X brews, Y beans, [has/no] equipment"
   - Two action buttons: **Merge** and **Replace**
   - Cancel button
6. Execute chosen mode (see below)
7. Refresh React state via `onImportComplete` callback
8. Close modal, show success feedback

### 4. Replace Mode

**Behavior:** Full replacement of all three data categories.

- Clear all three localStorage keys first
- Write imported data for each key present in the file
- Keys absent from the import file result in empty/null data (true full replace)

**Uses existing `importData()`** from `src/data/storage.js:128-133` with a small modification: clear all keys before writing so that missing keys in the import file result in cleared data rather than stale data persisting.

### 5. Merge Mode

**New function:** `mergeData(importedData)` in `src/data/storage.js`

**Brews:** Deduplicate by `id`. If the same `id` exists locally and in the import, **keep the local version** (don't overwrite edits). Add all imported brews whose IDs are not present locally.

**Beans:** Deduplicate by `id`. Same strategy — local wins on conflict, new beans are added.

**Equipment:** If local equipment exists, keep it unchanged. If local equipment is `null`, use the imported equipment.

**Rationale:** "Local wins" is the safest default. The user's most recent local edits are preserved, and import only adds new records they don't already have.

### 6. State Refresh After Import

After import (either mode), App.jsx must re-sync React state with localStorage:

```
setBrews(getBrews())
setEquipment(getEquipment())
setBeans(getBeans())
```

Pass an `onImportComplete` callback from App.jsx through the settings dropdown to the import confirmation modal. This follows the existing callback pattern used by `onBrewSaved` (`src/App.jsx:80`).

## Technical Considerations

**Error handling:**
- Wrap `JSON.parse()` in try/catch — show "Invalid JSON file" error
- Wrap `localStorage.setItem()` in try/catch — handle `QuotaExceededError` with "Storage quota exceeded" message
- Validate that the parsed data has the expected shape before writing

**File download approach:**
```
const blob = new Blob([json], { type: 'application/json' })
const url = URL.createObjectURL(blob)
// create temp <a>, click, revoke URL
```

**Export format (version 1):**
```json
{
  "version": 1,
  "exportedAt": "2026-02-23T08:30:00Z",
  "brews": [...],
  "equipment": {...},
  "beans": [...]
}
```

**No new dependencies required.** Uses standard browser APIs (Blob, URL.createObjectURL, FileReader).

## Acceptance Criteria

### Core

- [x] Gear icon opens a settings dropdown menu with three items
- [x] "Equipment Setup" item opens the existing EquipmentSetup modal (no regression)
- [x] "Export Data" downloads a JSON file named `brewlog-export-YYYY-MM-DD.json`
- [x] Export file contains `version`, `exportedAt`, `brews`, `equipment`, and `beans`
- [x] "Import Data" opens a file picker filtered to `.json` files
- [x] Invalid JSON shows a user-friendly error message
- [x] Valid JSON shows a confirmation modal with data summary and Merge/Replace options
- [x] Replace mode overwrites all data (clears keys not present in import)
- [x] Merge mode adds new records (by `id`) without overwriting existing ones
- [x] Merge mode keeps local equipment if it exists
- [x] UI state refreshes immediately after import (no page reload needed)
- [x] Dropdown dismisses on click outside and Escape key

### Edge Cases

- [x] Exporting with empty data produces a valid, importable file
- [x] Importing an empty file with Replace clears all data (with confirmation)
- [x] Importing a file missing some keys (e.g., no `equipment`) handles gracefully
- [x] File picker cancel does not trigger any state change or error
- [x] Confirmation modal Cancel discards parsed data and returns to dropdown

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/SettingsMenu.jsx` | **Create** | Dropdown menu + import confirmation modal |
| `src/data/storage.js` | **Modify** | Add `mergeData()`, update `importData()` to clear all keys on replace |
| `src/App.jsx` | **Modify** | Replace `showSetup` toggle with settings dropdown state, add `onImportComplete` callback |
| `src/components/Header.jsx` | **Modify** | Pass settings dropdown state instead of direct `onSettingsClick` |

## Implementation Order

1. **Add `mergeData()` to `storage.js`** — Pure logic, testable in isolation
2. **Update `importData()` in `storage.js`** — Clear all keys before writing for true replace behavior
3. **Create `SettingsMenu.jsx`** — Dropdown with three items, export logic, import flow with file picker + validation + confirmation modal
4. **Wire into `App.jsx` and `Header.jsx`** — Replace direct EquipmentSetup trigger with dropdown, pass callbacks

## Design Notes

- Dropdown follows existing button styling: `bg-white rounded-xl border border-brew-100 shadow-lg`
- Menu items use: `px-4 py-3 hover:bg-brew-50 text-sm text-brew-700`
- Confirmation modal follows existing modal pattern from EquipmentSetup: `fixed inset-0 bg-black/40 z-50` backdrop, `bg-white rounded-2xl shadow-xl max-w-lg` container
- "Replace" button should use a warning style (e.g., `bg-amber-500 text-white`) to distinguish it from "Merge" (`bg-brew-600 text-white`)
- Success/error feedback appears as a brief inline message in the dropdown or modal

## References

- `src/data/storage.js:117-133` — Existing `exportData()` and `importData()` functions
- `src/data/storage.js:12-16` — `STORAGE_KEYS` constants
- `src/App.jsx:26-30` — State management (brews, equipment, beans)
- `src/App.jsx:50-51` — Current gear icon wiring
- `src/components/Header.jsx:41-48` — Gear icon button
- `src/components/EquipmentSetup.jsx` — Existing modal pattern reference
- `src/components/BeanLibrary.jsx:347-476` — Another modal pattern reference
