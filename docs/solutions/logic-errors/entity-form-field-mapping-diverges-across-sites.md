---
title: Entity-Form Field Mapping Diverges Across Multiple Sites
category: logic-errors
module: BrewScreen
tags: [duplication, field-mapping, recipe, entity, form-state, diff-detection]
symptoms:
  - Adding a new field to entity doesn't appear in form state
  - "Save changes" button doesn't detect modifications to some fields
  - Recipe snapshot missing fields that exist on the entity
  - Form-to-entity save path drops fields silently
created: 2026-03-04
---

# Entity-Form Field Mapping Diverges Across Multiple Sites

## Problem

When a data entity maps to/from UI form state, the same field list gets manually written out at every mapping site. In the Recipe Entity MVP, a 14-field recipe shape appeared in 5 separate locations. When the diff-detection site used a hardcoded subset (omitting `steps`, `pourTemplateId`, `targetTimeMin`, `targetTimeMax`), step modifications became invisible to the "Save changes to recipe" button.

## Symptoms

- User modifies pour steps in RecipeAssembly → "Save changes to recipe" button does not appear
- Adding `targetTimeMin`/`targetTimeMax` to the entity → fields not carried through to form state at one site
- Recipe snapshot in brew record missing fields that exist on the recipe entity

## Root Cause

Five distinct code paths each manually enumerated the recipe field list:

1. **Entity → Form** (`buildRecipeFromEntity`): 14 fields with `??` defaults
2. **Entity → Form** (`onRecipeSelect` handler): Same 14 fields — duplicate of #1
3. **Form → Entity** (`linkRecipeToBrew`/`saveRecipe`): 14 fields extracted from form state
4. **Form → Entity** (`onSaveToRecipe`/`updateRecipe`): Same 14 fields — duplicate of #3
5. **Diff detection** (`RecipeAssembly`): Hardcoded 10-field subset — **diverged from the full 14**

The diff detection at site #5 was written manually and the author forgot to include `steps` (which requires deep comparison), `pourTemplateId`, `targetTimeMin`, and `targetTimeMax`. This made changes to those fields invisible.

## Solution

Extract a shared field constant and bidirectional mapping helpers:

```js
// storage.js
export const RECIPE_FIELDS = [
  'coffeeGrams', 'waterGrams', 'grindSetting', 'waterTemp',
  'targetTime', 'targetTimeRange', 'targetTimeMin', 'targetTimeMax',
  'steps', 'pourTemplateId', 'method', 'grinder', 'dripper', 'filterType',
]

export function recipeEntityToFormState(entity, defaults) {
  const form = {}
  for (const f of RECIPE_FIELDS) {
    if (f === 'steps') {
      form[f] = entity[f] ? normalizeSteps(entity[f]) : []
    } else {
      form[f] = entity[f] ?? defaults[f]
    }
  }
  return form
}

export function formStateToRecipeFields(formState) {
  const fields = {}
  for (const f of RECIPE_FIELDS) {
    fields[f] = f === 'steps' ? structuredClone(formState[f]) : formState[f]
  }
  return fields
}
```

All 5 sites now use these helpers:

```js
// Site 1 & 2: Entity → Form
setRecipe(recipeEntityToFormState(selected, defaults))

// Site 3 & 4: Form → Entity
saveRecipe({ beanId, name, ...formStateToRecipeFields(recipe) })
updateRecipe(id, formStateToRecipeFields(recipe))

// Site 5: Diff detection — uses the SAME field list
const differs = RECIPE_FIELDS.some(f => {
  if (f === 'steps') return JSON.stringify(recipe[f]) !== JSON.stringify(loaded[f] || [])
  return recipe[f] !== loaded[f]
})
```

**Result:** Adding a field to `RECIPE_FIELDS` propagates to all 5 sites automatically.

## Prevention

**When an entity maps to/from form state in more than one location:**

1. **Extract a `FIELDS` constant** immediately — don't wait for the second duplication
2. **Write bidirectional mapping helpers** (`entityToForm`, `formToEntity`)
3. **Diff detection must use the same field list** as persistence — never a hardcoded subset
4. **Special fields** (like `steps` needing deep comparison or `structuredClone`) should be handled in the helper, not at each call site

**Code smell to watch for:** If you see the same set of field names listed in more than one place, extract immediately. The cost of extraction is 10 lines; the cost of a diverged field list is a silent data loss bug.

## Related

- `docs/solutions/logic-errors/duplicated-computation-diverges-over-time.md` — same principle for computed values
- `docs/solutions/logic-errors/dual-field-names-for-same-data-cause-silent-loss.md` — naming divergence
- Todo #076 (resolved), #080 (resolved)
