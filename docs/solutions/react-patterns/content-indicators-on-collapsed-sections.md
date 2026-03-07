---
title: "Content indicators on collapsed sections"
category: react-patterns
tags: [progressive-disclosure, collapsible, preview, content-indicator, form-ux]
module: BrewForm.jsx
symptoms:
  - "User cannot tell if a collapsed section has data without expanding it"
  - "Sections with important data are overlooked because they appear empty when collapsed"
  - "Users expand every section just to check if it has content"
date: 2026-03-06
---

# Content indicators on collapsed sections

## Problem

BrewForm uses collapsible sections for Issues, Notes, and Tasting. When collapsed, headers show only the section title. Users cannot tell whether a section contains data without expanding it.

## Root Cause

The `Section` component had no mechanism to surface a summary of its contents when collapsed.

## Fix

Add a `preview` prop to the `Section` component. When collapsed and `preview` is non-null, render it inline next to the title:

```jsx
{!open && preview && (
  <span className="text-xs text-brew-400 truncate">{preview}</span>
)}
```

Preview values are computed at the call site from live form state:
- Count indicator: `form.issues.length > 0 ? \`(${form.issues.length})\` : null`
- Truncated text: `form.notes?.slice(0, 40) + '...'` or `null`
- Composite: `[flavorCount, form.body, ratingEmoji].filter(Boolean).join(' · ') || null`

### Design rules

1. **Compute from form state**, not stored data — preview must reflect unsaved edits
2. **Show only when collapsed** — `!open && preview` condition
3. **Return `null` when empty** — no "0" or empty indicators
4. **Truncate aggressively** — cap at ~40 chars, use counts/emoji for dense types
5. **Use `min-w-0`** on the flex container so `truncate` works

## Lesson

When adding a new collapsible section, always ask: "Can the user tell this has data when it is closed?" If not, add a `preview` prop.

## Related

- `docs/solutions/react-patterns/progressive-disclosure-summary-vs-details-split.md`
- `docs/solutions/react-patterns/extracted-component-should-not-bake-layout-wrapper.md`
