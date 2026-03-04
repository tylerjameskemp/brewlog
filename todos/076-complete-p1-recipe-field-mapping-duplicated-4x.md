---
status: complete
priority: p1
issue_id: "076"
tags: [code-review, duplication, recipe-entity, maintenance]
dependencies: []
---

# Recipe-to-Form-State Field Mapping Duplicated 4 Times

## Problem Statement

The same 14-field recipe mapping is manually written out in 4 separate locations in BrewScreen.jsx. If a recipe field is added or changed, all 4 must be updated in lockstep or data will silently drop. This is the highest-maintenance-risk finding in the Recipe Entity MVP.

## Findings

- Location 1: `buildRecipeFromEntity` (BrewScreen ~line 1437) — entity to form state
- Location 2: `onRecipeSelect` inline handler (BrewScreen ~line 1734) — entity to form state (duplicate of Location 1)
- Location 3: `linkRecipeToBrew`/`saveRecipe` call (BrewScreen ~line 1567) — form state to new entity
- Location 4: `onSaveToRecipe` inline handler (BrewScreen ~line 1754) — form state to entity update
- Fields: coffeeGrams, waterGrams, grindSetting, waterTemp, targetTime, targetTimeRange, targetTimeMin, targetTimeMax, steps, pourTemplateId, method, grinder, dripper, filterType
- Additionally, the diff-detection field list (RecipeAssembly ~line 778) is a subset that omits `steps` and `pourTemplateId`

## Proposed Solutions

### Option A: Extract RECIPE_FIELDS constant + mapping helpers
Create a shared `RECIPE_FIELDS` array and two helpers: `recipeEntityToFormState(entity, defaults)` and `formStateToRecipeFields(formState)`. All 4 locations call these instead of enumerating fields.
- **Pros:** Single source of truth, prevents field-drift bugs, ~50 lines of duplication removed
- **Cons:** Slight indirection
- **Effort:** Small-Medium

### Option B: Just extract RECIPE_FIELDS constant
Use a shared field list for iteration but keep inline mapping logic. Less abstraction.
- **Pros:** Simpler than full helper functions
- **Cons:** Still some duplication in how fields are mapped (with vs without defaults)
- **Effort:** Small
