---
status: complete
priority: p2
issue_id: "080"
tags: [code-review, bug, recipe-entity]
dependencies: []
---

# "Save to Recipe" Diff Detection Omits Steps and pourTemplateId

## Problem Statement

The "Save changes to recipe" button in RecipeAssembly uses a field list to detect differences between the current form state and the loaded recipe. This list omits `steps`, `pourTemplateId`, `targetTimeMin`, and `targetTimeMax`. If a user modifies pour steps but nothing else, the button will not appear and the step changes cannot be saved to the recipe.

## Findings

- BrewScreen.jsx RecipeAssembly ~line 778: `['coffeeGrams', 'waterGrams', 'grindSetting', 'waterTemp', 'targetTime', 'targetTimeRange', 'method', 'grinder', 'dripper', 'filterType']`
- Missing: `steps`, `pourTemplateId`, `targetTimeMin`, `targetTimeMax`
- Steps require deep comparison (JSON.stringify or custom comparator)
- This is likely a bug, not intentional — the same PR adds step handling to recipe entities

## Proposed Solutions

### Option A: Add missing fields to diff check
Add `targetTimeMin`, `targetTimeMax`, `pourTemplateId` to the shallow comparison. For `steps`, use `JSON.stringify(recipe.steps) !== JSON.stringify(loaded.steps)`.
- **Pros:** Catches all recipe changes
- **Cons:** JSON.stringify for steps comparison on every render (negligible cost)
- **Effort:** Small

### Option B: Use shared RECIPE_FIELDS constant
If todo #076 is implemented first, use the same constant for diff detection.
- **Pros:** Single source of truth
- **Cons:** Depends on #076
- **Effort:** Small (after #076)
