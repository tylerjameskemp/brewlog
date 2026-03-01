---
title: "Paired input blur race causes value flicker"
category: ui-bugs
tags: [onBlur, race-condition, paired-inputs, React, focus-management]
module: BrewScreen
symptoms:
  - "Values visibly swap and swap back when tabbing between paired inputs"
  - "Input values flicker on field transition"
created: 2026-03-01
---

# Paired input blur race causes value flicker

## Problem

Two related inputs (target time min/max) needed to auto-swap their values if min > max. The initial implementation attached `commitTargetTimeInputs()` — which performs the auto-swap — to `onBlur` for both fields. Tabbing from one field to the other triggers the swap logic mid-transition, before the user has finished editing, causing a visible flicker.

## Symptoms

- Values briefly swap and then swap back when tabbing between the min and max time inputs.
- Input values flicker on field transition (blur fires, swap runs, second field gets focus, swap runs again in reverse).
- The flicker only appears during keyboard navigation (Tab key); mouse clicks to a different target are less likely to expose it.

## Root Cause

`onBlur` fires on the departing field before `onFocus` fires on the arriving field. When both fields share the same blur handler and that handler contains cross-field mutation logic (auto-swap), the sequence is:

```
1. User presses Tab from min field
2. onBlur fires on min field → commitTargetTimeInputs() runs
   - min > max? Swap. React re-renders with swapped values.
3. onFocus fires on max field (which now holds the old min value)
4. User edits what they think is max — it's actually min
   OR: onBlur fires on max field → commitTargetTimeInputs() runs again
   - Values swap back. Visible flicker.
```

The blur handler runs with a stale assumption: it cannot know whether the user is moving to the other paired field or leaving the pair entirely.

## Solution

Split the shared blur handler into per-field handlers that only normalize their own field's display format. Defer all cross-field logic (auto-swap) to a discrete user action — in this case, the "Done" button that explicitly calls `commitTargetTimeInputs()`.

**Per-field blur handlers** are safe because they only touch their own value: they parse the current input string and reformat it (e.g., `"3:0"` → `"3:00"`). No cross-field reads or writes occur during the blur event.

**The Done button** is the correct place for cross-field logic. By the time the user clicks Done, focus has fully settled and both field values are stable.

## Code Examples

### Before (broken)

```jsx
// Both fields trigger the full swap on blur.
// Tabbing from min to max fires the swap before max has focus.
<input
  onBlur={commitTargetTimeInputs}
  value={targetMinInput}
  onChange={e => setTargetMinInput(e.target.value)}
/>
<input
  onBlur={commitTargetTimeInputs}
  value={targetMaxInput}
  onChange={e => setTargetMaxInput(e.target.value)}
/>

<button onClick={commitTargetTimeInputs}>Done</button>
```

### After (fixed)

```jsx
// Per-field blur only normalizes display format for that field.
const handleMinBlur = () => {
  const val = parseTime(targetMinInput)
  if (val !== null) setTargetMinInput(formatTime(val))
}
const handleMaxBlur = () => {
  const val = parseTime(targetMaxInput)
  if (val !== null) setTargetMaxInput(formatTime(val))
}

// Auto-swap is only triggered by the explicit Done action.
<input
  onBlur={handleMinBlur}
  value={targetMinInput}
  onChange={e => setTargetMinInput(e.target.value)}
/>
<input
  onBlur={handleMaxBlur}
  value={targetMaxInput}
  onChange={e => setTargetMaxInput(e.target.value)}
/>

<button onClick={commitTargetTimeInputs}>Done</button>
```

`commitTargetTimeInputs()` still handles both normalization and the auto-swap, but it now only runs when the user explicitly signals they are done editing the pair.

## Prevention

- **Never put cross-field mutation logic in `onBlur`.** A blur handler cannot reliably determine where focus is going next. It should only affect its own field.
- **Blur handlers: own field only.** Normalize, reformat, or validate the departing field's value. Do not read or write sibling fields.
- **Cross-field validation and swapping belong in a discrete commit action** — a button click, a form submit, or an explicit `onBlur` on a wrapper container (`onBlur` on a `<div>` with `tabIndex` fires after focus has fully settled within the group). A button click is the simplest and most reliable boundary.
- **When two inputs are semantically paired**, consider wrapping them in a single controlled component that owns both values and exposes one `onCommit` callback. This makes the boundary explicit and keeps the cross-field logic co-located with the state that owns both values.

## Related

- `src/components/BrewScreen.jsx` — `handleMinBlur`, `handleMaxBlur`, `commitTargetTimeInputs`
- Pattern: same issue can occur with any paired inputs (price min/max, date range start/end, coordinate bounds)
- React docs: [Focus Events](https://react.dev/reference/react-dom/components/common#focusevent-handler) — `onBlur` vs `onFocus` ordering
