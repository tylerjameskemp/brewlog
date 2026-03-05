---
date: 2026-03-05
topic: unified-time-input
---

# Unified Time Input

## What We're Building
Extract and upgrade the existing inline TimeInput component from StepEditor into a reusable component that accepts flexible time input (raw seconds OR MM:SS), stores seconds internally, and displays MM:SS on blur. Propagate it to all step time fields and fix remaining raw-seconds display spots.

## Why This Approach
The codebase already stores time as seconds and displays MM:SS via `formatTime()`. The gap is narrow: the inline TimeInput in StepEditor only accepts raw seconds (parseInt on blur), and it's not reusable. Rather than building something new, we extract what exists, add flexible parsing, and propagate.

## Key Decisions
- **parseFlexTime()**: New utility in storage.js. Accepts "90" → 90, "1:30" → 90, "1:3" → 63, number 90 → 90. Forgiving, not strict.
- **Extract TimeInput**: Move from inline in StepEditor to `src/components/TimeInput.jsx`. On blur: parse via parseFlexTime, display via formatTime. On focus: show the raw value the user typed (not force to seconds).
- **Delete formatTimeDisplay()**: StepEditor's local duplicate of formatTime(). Use the canonical one from storage.js.
- **Fix duration display**: StepEditor shows `(45s)` — change to `(0:45)` via formatTime().
- **Target time range unchanged**: RecipeAssembly/BrewForm target time fields keep parseTimeRange()-based text input. Already works, different UX concern.
- **No data migration**: All time storage is already seconds.

## Scope
- `src/data/storage.js` — add parseFlexTime()
- `src/components/TimeInput.jsx` — new file, extracted from StepEditor
- `src/components/StepEditor.jsx` — import TimeInput, delete inline version + formatTimeDisplay, fix (45s) display
- No changes to BrewScreen RecipeAssembly target time, BrewForm target time, BrewHistory, BrewTrends, useTimer

## Open Questions
- None — scope is well-defined.

## Next Steps
→ `/workflows:plan` for implementation details
