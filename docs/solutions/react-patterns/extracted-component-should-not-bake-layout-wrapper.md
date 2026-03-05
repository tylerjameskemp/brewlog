---
title: Extracted Component Should Not Bake In Layout Wrapper
category: react-patterns
module: TimeInput, StepEditor
tags: [component-extraction, layout, conditional-rendering, code-review]
symptoms:
  - Unwanted wrapper div appears in callers that don't need it
  - Extracted component adds unexpected spacing or structure
  - Layout concerns from one context leak to all consumers
date: 2026-03-05
---

# Extracted Component Should Not Bake In Layout Wrapper

## Problem

When extracting an inline component from a parent into a shared file, the inline version often includes a wrapper `<div>` for layout purposes specific to that parent's context (e.g., a label + input row). If the wrapper is baked into the extracted component unconditionally, every caller inherits that layout — even callers that don't need it.

## Symptom

TimeInput was extracted from StepEditor where it was always rendered with an inline label in a flex row. The extracted component always wrapped the `<input>` in a `<div className="flex items-center gap-1">` with a `<span>` label. When BrewForm and RateThisBrew used the component without passing `label`, they got an empty wrapper div affecting layout.

## Root Cause

The extraction preserved the parent's layout structure as part of the component's core rendering, rather than making it conditional on the prop that drives it.

## Solution

Conditionally render the wrapper based on whether the caller needs it:

```jsx
// TimeInput.jsx
const inputEl = (
  <input type="text" inputMode="text" aria-label={label}
    value={editing ? draft : display}
    onChange={(e) => setDraft(e.target.value)}
    onFocus={handleFocus} onBlur={handleBlur}
    disabled={disabled} placeholder={placeholder || '0:00'}
    className={className || defaultClassName}
  />
)

if (!label) return inputEl

return (
  <div className="flex items-center gap-1">
    <span className="text-[10px] text-brew-400">{label}</span>
    {inputEl}
  </div>
)
```

## Prevention

When extracting a component from inline to shared:

1. **Identify which parts are the component's concern vs the parent's layout.** The input element and its focus/blur/parse logic belong to the component. The wrapper div and label belong to the calling context.
2. **Make layout wrappers conditional on the prop that justifies them.** No prop = no wrapper.
3. **Review the component from each caller's perspective** before committing the extraction.

## Related

- `docs/solutions/logic-errors/standalone-component-references-parent-scope.md` — another extraction pitfall (scope references)
