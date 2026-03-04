---
title: "Split operation accumulates name suffixes"
category: logic-errors
tags: [string-concat, split, recursive-operation, strip-before-append]
module: StepEditor
symptoms:
  - "Splitting a step twice produces 'Bloom (1) (1)' instead of 'Bloom (1)'"
  - "Step names grow unbounded with repeated split operations"
created: 2026-03-04
---

# Split operation accumulates name suffixes

## Problem

When a "split step" operation appends a suffix like `(1)` / `(2)` to the step name, re-splitting a previously-split step concatenates a new suffix onto the existing one:

```
Bloom → split → "Bloom (1)", "Bloom (2)"
"Bloom (1)" → split → "Bloom (1) (1)", "Bloom (1) (2)"  ← BUG
```

The user expects the second split to produce `"Bloom (1)"` and `"Bloom (2)"` from the base name, not accumulate suffixes.

## Symptoms

- Step names grow with each split: `(1)`, `(1) (1)`, `(1) (1) (1)`
- Visual clutter in compact one-liners and timeline
- Data pollution — persisted step names carry accumulated junk

## Root Cause

The split handler used the step's current `name` directly as the base for new suffixes:

```js
const name = step.name || `Step ${index + 1}`
// If step.name is already "Bloom (1)", this produces "Bloom (1) (1)"
newSteps.splice(index, 1,
  { ...step, name: `${name} (1)` },
  { id: newId, name: `${name} (2)`, ... }
)
```

Any operation that appends to a string that may already contain a previous append creates unbounded accumulation.

## Solution

Strip existing suffix before appending new one:

```js
const baseName = (step.name || `Step ${index + 1}`).replace(/\s*\(\d+\)$/, '')
newSteps.splice(index, 1,
  { ...step, duration: d1, name: `${baseName} (1)` },
  { id: newId, name: `${baseName} (2)`, ... }
)
```

The regex `\s*\(\d+\)$` matches a trailing space + parenthesized number like ` (1)` or ` (2)`.

## Prevention

1. **Any append operation on user-visible strings must strip the previous append first.** If you add `(1)` on split, strip `(\d+)` before adding it again.

2. **Test recursive application.** If an operation can be applied to its own output, test it twice in succession. Split → Split, Rename → Rename, etc.

3. **Prefer idempotent naming schemes.** If possible, derive the suffix from the step's position rather than concatenating onto the name.

## Related

- `src/components/StepEditor.jsx` — `handleSplit` function
- `docs/solutions/logic-errors/duplicated-computation-diverges-over-time.md` — similar class: string-based data that silently mutates
