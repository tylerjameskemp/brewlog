---
title: "Mobile Polish: Race Conditions and iOS Compatibility Issues"
category: ui-bugs
tags: [code-review, mobile, ios-safari, race-condition, touch-targets, react, css-transitions]
module: components
symptoms:
  - iOS Safari auto-zooms on input focus
  - Double-tap creates duplicate brews
  - Fast taps select more than 2 brews in compare mode
  - Roaster name overflows on small screens
  - Import button can fire twice
  - Layout jank on budget mobile devices
  - Delete confirmation persists across bean cards
date_solved: 2026-02-23
pr: "#6"
severity: P1-P2
---

# Mobile Polish: Race Conditions and iOS Compatibility Issues

## Problem

After implementing a native-feel mobile experience (bottom nav, touch targets, safe area insets, `touch-action: manipulation`), a multi-agent code review found 9 issues across 6 files. The core theme: **adding `touch-action: manipulation` eliminated the 300ms tap delay, which made pre-existing race conditions exploitable** and surfaced iOS Safari quirks.

## Symptoms

1. **iOS Safari auto-zoom**: Select dropdowns and some inputs triggered viewport zoom on focus
2. **Duplicate brews**: Fast double-tap on "Save Brew" could save the same brew twice
3. **Compare mode overflow**: Rapid taps could select 3+ brews (should max at 2)
4. **Roaster text clipping**: `truncate` + `flex-shrink-0` conflict hid roaster names
5. **Double import**: Tapping "Merge" or "Replace" twice could import data twice
6. **Layout jank**: `transition-all` animating width/height/padding on every interaction
7. **Stale delete confirmation**: Delete confirmation on one bean card persisted when expanding another

## Root Cause Analysis

### iOS Auto-Zoom (P1)
iOS Safari auto-zooms any input with font-size below 16px on focus. The `EquipmentSetup` component had 4 inputs missing `text-base` (Tailwind's 16px class): grinder select, kettle select, scale input, and notes textarea.

### Double-Tap Race Conditions (P1)
With `touch-action: manipulation`, the browser no longer waits 300ms to distinguish single from double taps. This means two rapid taps fire two click events in quick succession. React's `useState` batches updates, so reading state directly in a handler sees stale values.

**BrewForm**: `handleSave()` had no guard — two taps = two brews saved with different UUIDs.
**BrewHistory**: Compare mode read `selectedIds` from closure, not from latest state. Two fast taps could both see `length < 2` and both add, exceeding the limit.
**SettingsMenu**: `handleImportConfirm()` had no guard against double invocation.

### CSS Conflicts (P2)
- `transition-all` on all form elements animated layout properties (width, height, padding, margin), causing reflow/repaint on every state change. Budget devices showed visible jank.
- `flex-shrink-0` on a `truncate`d roaster span prevented the text from shrinking, defeating the truncation.

## Working Solution

### Fix 1: iOS Auto-Zoom — Add `text-base` to inputs (EquipmentSetup.jsx)

```jsx
// Before — missing text-base triggers iOS zoom
<select className="w-full p-3 rounded-xl border border-brew-200 bg-white
                   text-brew-800 focus:outline-none ...">

// After — text-base ensures 16px font, preventing zoom
<select className="w-full p-3 rounded-xl border border-brew-200 bg-white
                   text-base text-brew-800 focus:outline-none ...">
```

Applied to: grinder select, kettle select, scale input, notes textarea.

### Fix 2: Touch Targets — Increase filter button padding (EquipmentSetup.jsx)

```jsx
// Before — py-2 = ~36px total height, below Apple HIG 44px minimum
<button className={`px-4 py-2 rounded-lg border text-sm ...`}>

// After — py-2.5 = ~40px + border ≈ 44px
<button className={`px-4 py-2.5 rounded-lg border text-sm ...`}>
```

### Fix 3: Double-Tap Guard with useRef (BrewForm.jsx)

```jsx
// useRef updates synchronously — perfect for tap guards
const savingRef = useRef(false)

const handleSave = () => {
  if (savingRef.current) return  // Block second tap
  savingRef.current = true

  const brew = { id: uuidv4(), ...form, ... }
  saveBrew(brew)
  // ...
}
```

**Why `useRef` instead of `useState`?** `useState` batches updates — two synchronous calls to `setSaving(true)` in the same event loop both see `false`. `useRef` mutates immediately, so the second tap sees `true` and returns.

### Fix 4: Lazy useState Initializer (BrewForm.jsx)

```jsx
// Before — getLastBrew() called on EVERY render (parses localStorage JSON)
const lastBrew = getLastBrew()

// After — called once on mount, cached in state
const [lastBrew] = useState(() => getLastBrew())
```

### Fix 5: Updater Function for Compare Mode (BrewHistory.jsx)

```jsx
// Before — reads stale closure value
if (selectedIds.length < 2) {
  setSelectedIds(prev => [...prev, brew.id])
}

// After — updater function always sees latest state
setSelectedIds(prev => {
  if (prev.includes(brew.id)) {
    return prev.filter(id => id !== brew.id)
  }
  if (prev.length >= 2) return prev  // Can't exceed 2
  return [...prev, brew.id]
})
```

### Fix 6: Remove flex-shrink-0 Conflict (BrewHistory.jsx)

```jsx
// Before — truncate can't work because flex-shrink-0 prevents shrinking
<span className="text-xs text-brew-400 truncate flex-shrink-0">

// After — element can shrink, truncation works
<span className="text-xs text-brew-400 truncate">
```

### Fix 7: Import Double-Tap Guard (SettingsMenu.jsx)

```jsx
const [isImporting, setIsImporting] = useState(false)

function handleImportConfirm(mode) {
  if (isImporting) return
  setIsImporting(true)
  try {
    // ... import logic
  } finally {
    setIsImporting(false)
  }
}
```

### Fix 8: Targeted CSS Transitions (index.css)

```css
/* Before — animates ALL properties including layout */
button, input, select, textarea {
  @apply transition-all duration-150;
}

/* After — only animates color changes, no layout thrashing */
button, input, select, textarea {
  @apply transition-colors duration-150;
}
```

### Fix 9: Clear Delete Confirmation on Expand (BeanLibrary.jsx)

```jsx
// Before — expanding another card leaves delete confirmation visible
onClick={() => setExpandedBeanId(isExpanded ? null : bean.id)}

// After — also clears any pending delete confirmation
onClick={() => { setExpandedBeanId(isExpanded ? null : bean.id); setDeletingBeanId(null) }}
```

## Prevention Strategies

### 1. Always Guard Mutating Handlers
Any handler that creates records, makes API calls, or modifies persistent state should have a `useRef`-based guard:

```jsx
const busyRef = useRef(false)
const handleAction = () => {
  if (busyRef.current) return
  busyRef.current = true
  // ... action
}
```

### 2. Use Updater Functions for State-Dependent Logic
When the next state depends on the current state, always use the updater form:

```jsx
// Bad — stale closure
if (items.length < max) setItems([...items, newItem])

// Good — always reads latest
setItems(prev => prev.length < max ? [...prev, newItem] : prev)
```

### 3. iOS Input Checklist
Every `<input>`, `<select>`, and `<textarea>` needs:
- `text-base` class (16px minimum to prevent auto-zoom)
- Minimum 44px touch target height
- `appearance-none` if custom styling select elements

### 4. Prefer `transition-colors` Over `transition-all`
`transition-all` is almost never what you want. It animates layout properties causing unnecessary reflows. Be explicit: `transition-colors`, `transition-opacity`, `transition-transform`.

### 5. Watch for CSS Property Conflicts
`truncate` (which sets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) requires the element to be able to shrink. Combining with `flex-shrink-0` defeats it silently.

## Cross-References

- PR #6: feat(mobile): Native-feel mobile experience
- Commit `7b0e75a`: fix(mobile): Address code review findings (P1 + P2)
- Apple HIG: [44pt minimum touch targets](https://developer.apple.com/design/human-interface-guidelines/accessibility#Controls-and-interactions)
- WebKit auto-zoom behavior: inputs below 16px font-size trigger zoom on iOS Safari
