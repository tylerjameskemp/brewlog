---
status: complete
priority: p1
issue_id: "077"
tags: [code-review, security, data-integrity, recipe-entity]
dependencies: []
---

# Import Validation Missing for Recipes Array

## Problem Statement

`SettingsMenu.jsx` validates `brews` and `beans` arrays during import (checks array type, filters records without valid string IDs) but applies no validation to the `recipes` field. A crafted import file could inject recipe records with missing IDs, non-string IDs, or non-array values.

## Findings

- SettingsMenu.jsx `handleFileSelect` filters brews/beans: `data.brews.filter(b => b && typeof b.id === 'string')`
- No equivalent filter for `data.recipes`
- `mergeData` in storage.js does check `Array.isArray(data.recipes)`, but `importData` (replace mode) does not
- Impact: malicious import could inject invalid records or cause runtime errors

## Proposed Solutions

### Option A: Add validation parity with brews/beans (recommended)
Add 3 lines to SettingsMenu.jsx `handleFileSelect`:
```js
if (data.recipes && !Array.isArray(data.recipes)) { setFeedback({...}); return }
if (data.recipes) data.recipes = data.recipes.filter(r => r && typeof r.id === 'string')
```
- **Pros:** Trivial fix, reaches parity with existing validation
- **Cons:** None
- **Effort:** Small (3 lines)
