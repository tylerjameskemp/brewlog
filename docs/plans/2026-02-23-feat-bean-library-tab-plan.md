---
title: "feat: Add Bean Library Tab"
type: feat
date: 2026-02-23
---

# feat: Add Bean Library Tab

## Overview

Add a "Beans" tab to the BrewLog navigation. Users can browse their bean collection, see brew counts per bean, expand a bean to see its brews, and manually add/edit/delete beans. Beans are already auto-saved during brew logging — this feature gives them a dedicated home.

## Problem Statement / Motivation

Beans are currently invisible. They're auto-saved in localStorage when logging a brew, but the only place they surface is as autocomplete suggestions in the bean name input. Users have no way to:

- See their full bean collection at a glance
- Know how many times they've brewed a particular bean
- Add a bean before brewing it (e.g., when buying new beans)
- Fix typos or enrich auto-saved beans with origin/process info
- Delete test entries or duplicates

## Proposed Solution

A new `BeanLibrary` component rendered via the existing tab navigation system. Bean cards show key info + brew count. Clicking a card expands to show that bean's brews inline. A modal form handles add/edit. Delete with confirmation.

## Technical Approach

### 1. Navigation — Add "Beans" Tab

**Files:** `src/components/Header.jsx`, `src/App.jsx`

Add a third tab to the Header tabs array:

```jsx
// Header.jsx — add to tabs array
const tabs = [
  { id: 'brew', label: 'New Brew' },
  { id: 'beans', label: 'Beans' },
  { id: 'history', label: 'History' },
]
```

Add conditional render in App.jsx:

```jsx
// App.jsx — add alongside existing view conditionals
{view === 'beans' && (
  <BeanLibrary
    beans={beans}
    setBeans={setBeans}
    brews={brews}
  />
)}
```

The Beans tab is always visible (not gated by equipment setup), matching how History works.

### 2. New Defaults — Origins & Processes

**File:** `src/data/defaults.js`

Add predefined click-to-select options, consistent with how `BODY_OPTIONS`, `BREW_ISSUES`, and `FLAVOR_DESCRIPTORS` work:

```js
export const BEAN_ORIGINS = [
  'Ethiopia', 'Colombia', 'Kenya', 'Guatemala', 'Costa Rica',
  'Brazil', 'Peru', 'Honduras', 'Rwanda', 'Indonesia',
  'Mexico', 'Panama', 'El Salvador', 'Burundi', 'India',
]

export const BEAN_PROCESSES = [
  'Washed', 'Natural', 'Honey', 'Anaerobic', 'Wet-hulled',
  'Carbonic maceration', 'Swiss Water (decaf)',
]
```

Both support a freetext "Other" input when none of the presets fit.

### 3. Storage — Add `deleteBean()`

**File:** `src/data/storage.js`

Add the missing delete function, following the `deleteBrew()` pattern:

```js
export function deleteBean(id) {
  const beans = getBeans().filter(b => b.id !== id)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}
```

No other storage changes needed — `getBeans()`, `saveBean()`, and `updateBean()` already exist.

### 4. BeanLibrary Component

**New file:** `src/components/BeanLibrary.jsx`

**Props:**
```jsx
function BeanLibrary({ beans, setBeans, brews })
```

**Internal state:**
- `expandedBeanId` — which bean card is expanded (null = all collapsed)
- `showAddForm` — whether the Add Bean modal is open
- `editingBean` — bean object being edited (null = adding new, object = editing existing)

**Layout structure:**

```
+------------------------------------------+
|  Your Beans (count)          [+ Add Bean] |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  | Bean Name              3 brews  >  |  |
|  | Roaster · Origin · Process         |  |
|  | Roasted: Feb 10, 2026              |  |
|  +------------------------------------+  |
|  | (expanded: brew cards appear here) |  |
|  | Brew 1 card...                     |  |
|  | Brew 2 card...                     |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | Another Bean            1 brew  >  |  |
|  | Roaster · Origin                   |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

**Bean card rendering:**
- Uses canonical card styling: `bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden`
- Entire card header is clickable to expand/collapse (matching BrewHistory pattern)
- Bean name: `text-sm font-semibold text-brew-800`
- Metadata line: `text-xs text-brew-400` — roaster, origin, process joined with ` · `, only showing fields that have values
- Roast date: `text-xs text-brew-400` formatted nicely
- Brew count: right-aligned badge `text-xs font-medium text-brew-500`
- Chevron rotates on expand (matching BrewForm Section pattern)
- Edit/delete buttons appear in expanded view (not on the collapsed card to keep it clean)

**Expanded brew list:**
- Filters `brews` where `brew.beanName === bean.name`
- Renders simplified brew cards (date, method, rating, grind, ratio — no diff tags)
- Sorted newest first
- If no brews: show "No brews yet" message

**Empty state** (when `beans.length === 0`):
```jsx
<div className="mt-12 text-center text-brew-400">
  <div className="text-4xl mb-3">-</div>
  <p className="text-lg font-medium">No beans yet</p>
  <p className="text-sm mt-1">Beans are saved automatically when you log a brew, or add one manually.</p>
</div>
```

**Brew count computation:**
Use `useMemo` to pre-compute a `Map<beanName, count>` once, rather than filtering per-card:

```jsx
const brewCounts = useMemo(() => {
  const counts = new Map()
  brews.forEach(b => {
    counts.set(b.beanName, (counts.get(b.beanName) || 0) + 1)
  })
  return counts
}, [brews])
```

### 5. Add/Edit Bean Modal

**Rendered inside:** `BeanLibrary.jsx` (conditionally, same as EquipmentSetup modal pattern)

**Modal overlay:** `fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4`
**Modal box:** `bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6`

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Bean Name | Text input | Yes | Validate non-empty, warn on duplicate name |
| Roaster | Text input | No | Free text |
| Origin | Tag select + "Other" text input | No | Uses `BEAN_ORIGINS` from defaults. Click a tag to select; if none fit, click "Other" to reveal a text input |
| Process | Tag select + "Other" text input | No | Uses `BEAN_PROCESSES` from defaults. Same pattern as origin |
| Roast Date | Date input | No | `type="date"` |

**Tag select + freetext pattern:**
- Render tags using the standard chip style (`px-3 py-1.5 rounded-lg text-xs font-medium border`)
- Include an "Other" tag at the end
- When "Other" is selected, show a text input below the tags
- Selecting a predefined tag deselects "Other" and hides the input (and vice versa)

**Add vs Edit mode:**
- Add: all fields empty, title "Add Bean", save calls `saveBean()` then `setBeans()`
- Edit: fields pre-filled from `editingBean`, title "Edit Bean", save calls `updateBean()` then `setBeans()`
- Both share the same form component; the only difference is initial state and the save action

**Duplicate name warning:**
On save, if another bean exists with the same name (case-insensitive, trimmed), show an inline warning: "A bean with this name already exists." Allow saving anyway (different roasters can have same-named beans).

### 6. Delete Bean

**Location:** Inside the expanded bean card (alongside the Edit button)

**Flow:**
1. User expands a bean card
2. Clicks "Delete" button (small, secondary style — `text-xs text-red-500 hover:text-red-700`)
3. Inline confirmation appears: "Delete this bean? Brews using it won't be affected." with "Cancel" and "Delete" buttons
4. On confirm: call `deleteBean(id)` from storage, then `setBeans(updated)`

Brews are not affected — they reference beans by name string, and the brew records persist independently.

### 7. Bean Name Normalization

**File:** `src/components/BrewForm.jsx` (existing auto-save logic, line 88)

Trim whitespace from bean names before the duplicate check:

```jsx
// Before: beans.find(b => b.name === form.beanName)
// After:  beans.find(b => b.name.trim().toLowerCase() === form.beanName.trim().toLowerCase())
```

Apply the same normalization in the Add Bean form. This prevents "Heart Columbia" and "Heart Columbia " from creating duplicates.

**Note:** Do not change how names are stored — store them as the user typed them (trimmed). Only normalize for comparison.

## Acceptance Criteria

### Functional Requirements

- [x] "Beans" tab appears in navigation between "New Brew" and "History"
- [x] Clicking "Beans" tab shows the BeanLibrary component
- [x] Bean cards display: name, roaster, roast date, origin (if set), process (if set), brew count
- [x] Clicking a bean card expands it to show all brews made with that bean
- [x] Clicking again collapses the expanded view
- [x] "Add Bean" button opens a modal form
- [x] Add Bean form has fields: name (required), roaster, origin (tag select + other), process (tag select + other), roast date
- [x] Saving a new bean adds it to the list and persists to localStorage
- [x] Edit button on expanded bean opens the modal pre-filled with bean data
- [x] Saving an edit updates the bean in the list and localStorage
- [x] Delete button on expanded bean shows inline confirmation
- [x] Confirming delete removes the bean from list and localStorage
- [x] Auto-saved beans (missing origin/process) render gracefully — missing fields simply don't show
- [x] Empty state shows when no beans exist
- [x] Beans tab is accessible even before equipment setup

### Non-Functional Requirements

- [x] Card styling matches existing app cards (`bg-white rounded-2xl border border-brew-100 shadow-sm`)
- [x] Tag/chip styling matches existing patterns (body, flavors, issues)
- [x] Modal styling matches EquipmentSetup modal
- [x] Form input styling matches existing inputs (`p-3 rounded-xl border border-brew-200`)
- [x] Mobile-friendly: touch targets 44px+, modal scrollable on small screens
- [x] Brew count computed via `useMemo` for performance

## File Change Summary

| File | Action | What Changes |
|------|--------|--------------|
| `src/components/Header.jsx` | Edit | Add `{ id: 'beans', label: 'Beans' }` to tabs array |
| `src/App.jsx` | Edit | Import BeanLibrary, add conditional render for `view === 'beans'`, pass props |
| `src/data/defaults.js` | Edit | Add `BEAN_ORIGINS` and `BEAN_PROCESSES` arrays |
| `src/data/storage.js` | Edit | Add `deleteBean()` function, export it |
| `src/components/BeanLibrary.jsx` | **Create** | New component: bean list, cards, expand/collapse, add/edit modal, delete |
| `src/components/BrewForm.jsx` | Edit | Normalize bean name comparison (trim + case-insensitive) |

## Dependencies & Risks

- **Low risk:** All changes are client-side, localStorage-only, no external APIs
- **Data compatibility:** Existing auto-saved beans lack `origin` and `process` fields — BeanLibrary handles this with conditional rendering (show field only if truthy)
- **Bean-name matching fragility:** Brews reference beans by `beanName` string, not by ID. This is an existing architectural choice. Adding normalization (trim + case-insensitive comparison) reduces but does not eliminate edge cases. A full migration to ID-based references is out of scope
- **No migration needed:** No localStorage data format changes; new fields are simply optional

## Future Considerations (Out of Scope)

- Bean-to-brew ID-based linking (migration from name-based matching)
- "Brew this bean again" shortcut from bean detail to BrewForm
- Auto-fill roaster/roastDate from bean record when selecting from BrewForm datalist
- Bean search/filter when the collection grows large
- Sort options (by name, brew count, most recent brew, roast date)
- Bean freshness tracking (days since roast)

## References

### Internal References

- Navigation pattern: `src/App.jsx:25` (view state), `src/components/Header.jsx:8-11` (tabs array)
- Card styling: `src/components/BrewForm.jsx:397-419` (Section component), `src/components/BrewHistory.jsx:99`
- Modal pattern: `src/components/EquipmentSetup.jsx` (overlay + modal box)
- Storage helpers: `src/data/storage.js:58-84` (bean CRUD)
- Auto-save logic: `src/components/BrewForm.jsx:87-98`
- Tag/chip pattern: `src/components/FlavorPicker.jsx`, `src/components/BrewForm.jsx:290-310` (body options)
- Empty state pattern: `src/components/BrewHistory.jsx:16-24`
- Defaults: `src/data/defaults.js`
