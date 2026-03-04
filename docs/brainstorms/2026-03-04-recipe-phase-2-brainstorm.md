# Recipe Phase 2 Brainstorm

**Date:** 2026-03-04
**Status:** Ready for planning
**Source:** Deferred features from Recipe Entity MVP (docs/brainstorms/2026-03-03-recipe-entity-brainstorm.md)

---

## What We're Building

Four features that make the Recipe entity visible and useful to the user, building on the MVP foundation (storage, migration, basic BrewScreen integration).

## Features

### 1. Post-Brew Fork ("Update recipe?")

**Decision: Inline prompt on success screen (Approach A)**

After the brew is saved and rated, if the brew's actual settings differ from the source recipe, show a card on the success screen:
- "You used different settings. Update recipe? / Keep original / Save as new recipe"
- Uses the same `RECIPE_FIELDS` diff detection already in RecipeAssembly
- Only appears when `recipeId` exists AND settings changed
- Context is fresh (just finished brewing), minimal disruption (one extra tap)

**Rejected approaches:**
- Step in rate phase — too long already
- Deferred notification — loses the moment of context

### 2. Recipe Management in BeanLibrary

Show recipes on expanded bean cards. Currently expanded cards show brew history — add a recipes section above or below.

**Scope:**
- List recipes for each bean (name, key settings summary)
- Inline rename (tap recipe name to edit)
- Delete recipe (with confirmation, soft-delete via archivedAt)
- No full recipe editor — editing happens in BrewScreen

### 3. "Update" vs "Save as New"

When the "Save changes to recipe" button is tapped in RecipeAssembly (pre-brew), offer a choice:
- **Update** — overwrites the current recipe (existing behavior)
- **Save as New** — creates a new recipe with the modified settings

This pairs with Feature 1 (post-brew fork) which offers the same choice after brewing.

### 4. Recipe-Level Notes

Add a `notes` field to the Recipe entity for recording rationale ("Went finer because of light roast", "This is my competition recipe").

**Where it surfaces:**
- Editable in BeanLibrary recipe card (Feature 2)
- Visible in RecipeAssembly when a recipe is selected (read-only, collapsible)
- Distinct from brew-level `notes` (which are per-session observations)

## Key Decisions

1. Post-brew fork lives on the success screen, not in the rate flow
2. BeanLibrary gets recipe visibility but not a full editor
3. "Update vs Save as New" appears in two places: pre-brew (RecipeAssembly) and post-brew (success screen)
4. Recipe notes are a simple text field, not structured

## Relationship to MVP

All 4 features depend on the Recipe entity MVP (merged PR #29). No new storage keys needed — just a `notes` field added to the recipe model and UI changes in BrewScreen, BeanLibrary.
