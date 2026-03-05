---
title: "feat: Unified Smart Time Input"
type: feat
date: 2026-03-05
---

# Unified Smart Time Input

## Overview

Extract the inline `TimeInput` from StepEditor into a reusable component. Add a flexible `parseFlexTime()` utility that accepts both raw seconds ("90") and MM:SS ("1:30"). Propagate the component to all time input fields. Fix remaining raw-seconds display spots.

## Design Decisions

Resolved from brainstorm + SpecFlow analysis:

| Question | Decision | Rationale |
|----------|----------|-----------|
| Focus display value | Show formatted MM:SS (e.g. "1:30") | Telegraphs that MM:SS is accepted; less jarring than flipping to raw seconds |
| "1:3" handling | Valid = 63 seconds (forgiving) | Accept 1-2 digits after colon. Reject 3+ digits. |
| BrewForm totalTime | Yes, convert to TimeInput | Same field in RateThisBrew gets smart input — must be consistent |
| Mobile inputMode | `inputMode="text"` | User must be able to type ":" on mobile. Full keyboard is a small price. |
| Empty field | Revert to previous value | Matches current behavior. Prevents null step times breaking cascade logic. |
| Component styling | Accept `className` prop | Component owns parse/display logic; caller owns visual styling. |
| parseTimeRange update | No change | Target time range is a different UX; keep strict parseTime inside it. |
| parseFlexTime location | `storage.js` | Co-locate with `parseTime()` and `formatTime()`. |
| Negative/decimal values | Invalid (return null) | No valid use case for negative or fractional seconds. |
| Max value | No cap | Pour-over is short but French press / cold brew can be long. Trust the user. |

## `parseFlexTime()` Truth Table

```
"90"     → 90      (raw seconds)
"1:30"   → 90      (MM:SS)
"1:3"    → 63      (M:S, forgiving)
"0"      → 0       (valid zero)
"0:00"   → 0       (valid zero)
"01:30"  → 90      (leading zero OK)
"090"    → 90      (leading zero OK)
"2:00"   → 120
"12:30"  → 750
""       → null    (empty)
":"      → null    (malformed)
"abc"    → null    (non-numeric)
"-5"     → null    (negative)
"1.5"    → null    (decimal)
"1:300"  → null    (3+ digits after colon)
null     → null
undefined → null
90       → 90      (number passthrough)
```

Logic: If string contains ":", split on it. Minutes = left side (1-3 digits), seconds = right side (1-2 digits). Otherwise, treat entire string as raw seconds via parseInt. Reject NaN, negative, decimal.

## Acceptance Criteria

- [x] `parseFlexTime()` exported from storage.js, passes truth table above
- [x] `TimeInput` component extracted to `src/components/TimeInput.jsx`
- [x] TimeInput shows formatted MM:SS on blur AND on focus (user can select-all and retype)
- [x] TimeInput calls `onChange(seconds)` on blur with parsed integer; reverts on invalid
- [x] StepEditor imports TimeInput from new file, deletes inline version
- [x] StepEditor deletes `formatTimeDisplay()`, uses `formatTime()` from storage.js for display (except TimeInput uses empty string for null internally)
- [x] StepEditor duration display changes from `(45s)` to `(0:45)` via `formatTime()`
- [x] RateThisBrew manual entry totalTime uses TimeInput (line ~1404 BrewScreen.jsx)
- [x] RateThisBrew correction totalTime uses TimeInput (line ~1431 BrewScreen.jsx)
- [x] BrewForm totalTime uses TimeInput, label changes from "Total Time (sec)" to "Total Time"
- [x] `npm run build` passes with no errors
- [x] Vitest unit tests for `parseFlexTime()` added

## Implementation Steps

### Step 1: Add `parseFlexTime()` to storage.js

**File:** `src/data/storage.js`

Add next to `parseTime()` (~line 716). Keep `parseTime()` untouched — `parseTimeRange()` still uses it.

```js
export function parseFlexTime(input) {
  if (input == null) return null
  if (typeof input === 'number') return input >= 0 && Number.isFinite(input) && Number.isInteger(input) ? input : null
  const str = String(input).trim()
  if (!str) return null
  if (str.includes(':')) {
    const match = str.match(/^(\d{1,3}):(\d{1,2})$/)
    if (!match) return null
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
  }
  const n = parseInt(str, 10)
  if (isNaN(n) || n < 0 || String(n) !== str.replace(/^0+/, '') && str !== '0') return null
  return n
}
```

Note: The decimal/negative check — `parseInt("1.5")` returns 1, but we want to reject it. Check `String(n) !== str` after stripping leading zeros to catch "1.5", "-5", etc. Actually, simpler: match against `/^\d+$/` first for the non-colon path.

Refined non-colon logic:
```js
if (!/^\d+$/.test(str)) return null
const n = parseInt(str, 10)
return n >= 0 ? n : null
```

### Step 2: Add unit tests for `parseFlexTime()`

**File:** `src/data/__tests__/storage.test.js`

Add a `describe('parseFlexTime')` block covering the truth table. Import `parseFlexTime` from storage.

### Step 3: Extract `TimeInput` component

**File:** `src/components/TimeInput.jsx` (new)

```jsx
import { formatTime, parseFlexTime } from '../data/storage'

export default function TimeInput({ value, onChange, className, placeholder, disabled, label }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const display = value != null ? formatTime(value) : ''

  const handleFocus = () => {
    setEditing(true)
    setDraft(display)  // Show formatted value, not raw seconds
  }

  const handleBlur = () => {
    setEditing(false)
    const parsed = parseFlexTime(draft)
    if (parsed != null) {
      onChange(parsed)
    }
    // Invalid or empty → revert (display stays as previous value)
  }

  return (
    <input
      type="text"
      inputMode="text"
      aria-label={label}
      value={editing ? draft : display}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={className || 'w-14 px-2 py-1.5 text-center text-xs font-mono rounded-lg border border-brew-200 bg-brew-50 focus:outline-none focus:ring-1 focus:ring-brew-400 text-base'}
    />
  )
}
```

Key differences from inline version:
- Uses `parseFlexTime()` instead of `parseInt()`
- Shows formatted value on focus (not raw seconds)
- Accepts `className` prop for styling overrides
- Uses `formatTime()` from storage.js (returns empty string for null via inline check, not em dash)

### Step 4: Update StepEditor

**File:** `src/components/StepEditor.jsx`

1. **Delete** `formatTimeDisplay()` function (lines 18-25)
2. **Delete** inline `TimeInput` function (lines 69-107)
3. **Add import:** `import TimeInput from './TimeInput'`
4. **Add import:** `import { formatTime } from '../data/storage'` (if not already imported)
5. **Replace** all `formatTimeDisplay(...)` calls with `formatTime(...)` — BUT: `formatTime(null)` returns `'—'` which is fine for display contexts (step one-liners, time ranges). Check each call site.
6. **Fix duration display** (line ~251): Change `({step.duration || 0}s)` to `({formatTime(step.duration)})` — shows `(0:45)` instead of `(45s)`
7. **Fix diff duration display** (line ~253): Change `planned: {diff.fields.duration ?? '—'}s` to `planned: {formatTime(diff.fields.duration)}`

Call sites for `formatTimeDisplay` in StepEditor to migrate to `formatTime`:
- `stepTimeRange()` helper (~line 110-114): builds `"M:SS → M:SS"` range strings
- One-liner display (~line 142)
- Expanded step display (~line 251 for duration)
- Removed step display (~line 318)

### Step 5: Update RateThisBrew in BrewScreen

**File:** `src/components/BrewScreen.jsx`

RateThisBrew section (~line 1260+):

1. **Add import** for TimeInput at top of file
2. **Replace** the `totalTimeStr` local state pattern. Currently:
   - State: `const [totalTimeStr, setTotalTimeStr] = useState(brew.totalTime != null ? formatTime(brew.totalTime) : '')`
   - Flush in handleDone: `const parsedTime = parseTime(totalTimeStr)`

   Replace with a `totalTimeSeconds` state that holds the numeric value:
   - State: `const [totalTimeSeconds, setTotalTimeSeconds] = useState(brew.totalTime)`
   - Flush in handleDone: `totalTime: totalTimeSeconds ?? brew.totalTime`

3. **Replace both input JSX blocks** (manual entry ~line 1404, correction ~line 1431) with:
   ```jsx
   <TimeInput
     value={totalTimeSeconds}
     onChange={setTotalTimeSeconds}
     className="..."  // preserve existing styling
     placeholder="3:30"
   />
   ```

This eliminates the string-based intermediary entirely — TimeInput handles the string ↔ seconds conversion internally.

### Step 6: Update BrewForm totalTime

**File:** `src/components/BrewForm.jsx`

1. **Add import** for TimeInput
2. **Change** the `type="number"` totalTime input (~line 386-407) to TimeInput:
   ```jsx
   <TimeInput
     value={form.totalTime}
     onChange={(seconds) => { setForm(prev => ({ ...prev, totalTime: seconds })); setSaved(false) }}
     className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono text-center focus:outline-none focus:ring-2 focus:ring-brew-400"
     placeholder="3:30"
   />
   ```
3. **Update label** from "Total Time (sec)" to "Total Time"
4. **Remove** the `formatTime()` helper text below the input (it showed the MM:SS equivalent — now the input itself displays MM:SS)

### Step 7: Build verification

```bash
npm run build
npm test
```

## Files Changed

| File | Change |
|------|--------|
| `src/data/storage.js` | Add `parseFlexTime()` |
| `src/data/__tests__/storage.test.js` | Add parseFlexTime tests |
| `src/components/TimeInput.jsx` | **New file** — extracted reusable component |
| `src/components/StepEditor.jsx` | Delete inline TimeInput + formatTimeDisplay, import from new file, fix duration display |
| `src/components/BrewScreen.jsx` | RateThisBrew: replace string-based totalTime with TimeInput |
| `src/components/BrewForm.jsx` | Replace number input for totalTime with TimeInput |

## Gotchas (from docs/solutions/)

- **Paired input blur race** (`docs/solutions/ui-bugs/paired-input-blur-race-causes-value-flicker.md`): TimeInput's blur handler only touches its own value — no cross-field logic. Safe.
- **Primary action flush** (`docs/solutions/react-patterns/primary-action-must-flush-pending-edits.md`): RateThisBrew's handleDone already flushes. With TimeInput, the value is committed on blur, so by the time the user taps Done, the state is already updated. But if user taps Done while still focused in TimeInput (without blurring first), we need the button's onClick to trigger blur first. React's synthetic event system handles this — blur fires before click. Verify in testing.
- **Per-keystroke writes** (`docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`): TimeInput buffers in local `draft` state, only calls `onChange` on blur. Safe.

## References

- Brainstorm: `docs/brainstorms/2026-03-05-unified-time-input-brainstorm.md`
- Prior brainstorm (timeline step editor): `docs/brainstorms/2026-03-04-timeline-step-editor-brainstorm.md`
