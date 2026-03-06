---
title: "Positional array access creates an implicit ordering contract"
category: logic-errors
tags: [array-access, id-lookup, implicit-contract, templates, data-integrity]
module: BrewScreen.jsx
symptoms:
  - "Wrong template selected after import/merge reorders the template list"
  - "templates[0] silently picks a different template than intended"
  - "pourTemplateId stored on recipe doesn't match the steps that were populated"
date: 2026-03-06
---

# Positional array access creates an implicit ordering contract

## Problem

When auto-populating steps for a new bean (no existing recipe), `buildRecipeFromEntity` used `templates[0]`:

```js
const defaultTemplate = templates[0]
if (defaultTemplate) {
  defaults.steps = structuredClone(defaultTemplate.steps)
  defaults.pourTemplateId = defaultTemplate.id
}
```

The templates have stable string IDs (`'standard-3pour-v60'`, `'4-6-method'`, `'3-pour-flat-bottom'`), but positional access treats ordering as a semantic contract. If the seeding order changes, or if a user's localStorage has templates in a different order after an import/merge, `templates[0]` silently picks the wrong template.

## Root Cause

Named entities with stable IDs were accessed by position instead of by ID. This creates a hidden ordering contract that can be violated by:
- Changing the seed order in `defaults.js`
- Import/merge operations that reorder entries
- Future additions of templates that sort differently

## Solution

Use ID-based lookup with a positional fallback:

```js
const defaultTemplate = templates.find(t => t.id === 'standard-3pour-v60') || templates[0]
if (defaultTemplate) {
  defaults.steps = structuredClone(defaultTemplate.steps)
  defaults.pourTemplateId = defaultTemplate.id
}
```

The `|| templates[0]` fallback is intentional: if the standard template was deleted from localStorage (corrupt data, failed seed), the app still produces a usable default rather than rendering with no steps.

## Prevention

- **Prefer `.find()` by ID** over positional access when the list contains named entities with stable identifiers.
- **Only use `[0]` for "any item will do"** scenarios (e.g., taking the first search result) or as a defensive fallback after an ID lookup.
- **Store the resolved ID, not the position:** `pourTemplateId` stores the template's ID, so the lookup should also use the ID.

## Related

- `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md` — related pattern of implicit contracts between data sites
