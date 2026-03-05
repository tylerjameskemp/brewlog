---
title: Use Nullish Coalescing for Numeric Form State That Can Be Zero
category: logic-errors
module: BrewForm
tags: [nullish-coalescing, form-state, zero-value, operator-choice, code-review]
symptoms:
  - Form field silently discards zero values
  - Numeric state resets to fallback when value is 0
  - Saved data loses zero entries
date: 2026-03-05
---

# Use Nullish Coalescing for Numeric Form State That Can Be Zero

## Problem

`value || fallback` treats `0` as falsy and replaces it with the fallback. For form state that stores numeric values where zero is valid (time in seconds, counts, scores), this silently discards data.

## Symptom

In BrewForm, `totalTime: editBrew?.totalTime || ''` converted a valid `totalTime: 0` to empty string on form init. Similarly, `form.totalTime || null` converted zero back to null on the value prop, losing the user's input.

## Root Cause

JavaScript's `||` operator falls through on all falsy values: `0`, `""`, `false`, `null`, `undefined`. When a domain value can legitimately be `0`, `||` is the wrong operator.

## Solution

Use `??` (nullish coalescing) which only falls through on `null` and `undefined`:

```js
// Before — zero is discarded
totalTime: editBrew?.totalTime || ''      // 0 becomes ''
value={form.totalTime || null}            // 0 becomes null

// After — zero is preserved
totalTime: editBrew?.totalTime ?? null    // 0 stays 0
value={form.totalTime ?? null}            // 0 stays 0
```

## Prevention

**Rule of thumb:** When initializing or serializing numeric form state, always use `??` not `||`. The `||` operator is only safe when:
- The value is a string where empty string means "no value"
- The value is a boolean
- You genuinely want to treat `0` as "no value"

For time fields, counts, and measurements — `0` is always a valid state.

## Related

- `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md` — uses `??` correctly in `recipeEntityToFormState()`
