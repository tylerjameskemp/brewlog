# Recipe Entity Architecture Brainstorm

**Date:** 2026-03-03
**Status:** Ready for planning
**Source:** Recipe & Entry Architecture braindump (March 2026 sprint doc)

---

## What We're Building

A first-class Recipe entity that replaces the current implicit "pre-fill from last brew" pattern. Recipes are stable baselines — your dialed-in settings per bean per method. Multiple recipes per bean are supported (V60 vs AeroPress, or parallel experiments).

## Why This Approach

### The Problem Today

Recipes don't exist as entities. "Recipe" is just "whatever fields the last brew had," re-derived each time via `getLastBrewOfBean()`. This causes three frequent pain points:

1. **Method switching** — Brew V60, then AeroPress. Next V60 pre-fills AeroPress settings.
2. **Experiment recovery** — Try a wild grind, it fails. Next brew pre-fills the failed experiment, not your known-good baseline.
3. **Accidental persistence** — Every tweak silently becomes the new default. No concept of "dialed-in" vs. "just trying something."

### Why Not Stay Implicit

The current pre-fill pattern handles ~90% of cases. But the user switches methods frequently and experiments often — the 10% gap is a real, frequent frustration. Adding `preferredRecipe` fields to Bean (Layer 1 approach) would lock in "one recipe per bean" and become throwaway work.

### Product Identity

BrewLog is both a **journal** (log and look back) and a **dial-in tool** (iterate toward the perfect cup). The Recipe entity serves the dial-in use case without compromising the journal experience.

## Key Decisions

### 1. Recipe is a first-class entity with its own storage collection
- New `brewlog_recipes` localStorage key
- CRUD in storage.js: `getRecipes()`, `getRecipesForBean()`, `saveRecipe()`, `updateRecipe()`, `deleteRecipe()`
- Each recipe has a unique ID, linked to a Bean via `beanId`

### 2. Multiple recipes per bean, keyed by method
- One bean can have a V60 recipe AND an AeroPress recipe
- Could also have two V60 recipes (parallel experiments)
- Recipe includes a user-facing `name` field, defaulting to just the method name ("V60", "AeroPress") — editable inline if the user wants something more specific (e.g., "V60 — Fine Grind Experiment")

### 3. Auto-select with visible indicator
- When brewing, auto-select the last-used recipe for that bean
- Show a visible badge/indicator of which recipe is active
- Tap to switch to a different recipe for that bean

### 4. Pre-brew tweaks are ephemeral — never auto-save
- Adjusting grind/dose/steps before brewing does NOT update the recipe
- Brew record snapshots what you actually used (as today)
- Recipe stays unchanged unless explicitly edited
- Recipe = stable baseline. Brew prep = one-off adjustments.

### 5. Recipe updates are explicit only (for MVP)
- To change a recipe, user must deliberately edit it
- No auto-save, no "make this my recipe?" prompt (deferred to post-MVP)
- This keeps the model simple: recipe is a source of truth, brews are snapshots

### 6. Brew records link to their source recipe
- New `recipeId` field on brew records
- `recipeSnapshot` continues to capture the actual values used (including tweaks)
- Enables future "planned vs actual" and "recipe effectiveness" analysis

## MVP Scope (Build Now)

- Recipe entity model + storage CRUD
- Migration: extract implied recipes from existing brew history (group by bean + method, take latest settings)
- BrewScreen: recipe picker replaces implicit pre-fill
  - Auto-selects last-used recipe
  - Shows indicator of active recipe
  - Tap to switch
- Brew records get `recipeId` field
- Recipe creation from BrewScreen (when bean has no recipe for selected method)

## Deferred (Build Later, Layered)

| Feature | Why Deferred | Depends On |
|---------|-------------|------------|
| Version history (stored old versions) | Complexity; increment-only version number is enough for MVP | Recipe entity |
| "Update" vs "Save as New" prompt | Needs versioning to be meaningful | Version history |
| Post-brew fork ("make this my recipe?") | Great UX but needs the entity to exist first; explicit-only is simpler for MVP | Recipe entity |
| Recipe wizard in bean setup | Can create recipes from BrewScreen; bean setup flow is extra UX work | Recipe entity |
| Recipe version comparison view | Existing brew comparison covers most needs | Version history |
| Recipe-level notes (decision rationale) | Keep notes on brew records for now | Recipe entity |
| Generic/template recipes | Future AI direction; pour templates cover this for now | Recipe entity |

## Resolved Questions

1. **Migration strategy** — One recipe per unique bean+method combo, seeded from the latest brew's recipe fields. Simple, predictable. Users can create additional recipes manually later.
2. **Recipe naming** — Default to just the method name ("V60", "AeroPress"). Editable inline if the user wants to rename. No bean name in the recipe name — it's redundant when you're already in a bean context.
3. **Recipe deletion** — Soft delete via `archivedAt` timestamp. Archived recipes are hidden from UI but brew records still have a valid reference. No data loss.
4. **BeanLibrary integration** — Skip for MVP. Recipes only surface in BrewScreen. Once the core recipe flow is solid, we'll know what info is useful on bean cards.

## Relationship to Braindump Document

The source braindump doc covers 6 sections. Here's what this MVP addresses vs. defers:

| Braindump Section | MVP Coverage |
|---|---|
| 1. Where We Stand | Foundation: Recipe entity closes the gap |
| 2. Recipe Entry Points | Partial: BrewScreen only (defer bean setup wizard) |
| 3. Recipe Versioning | Minimal: version number field, no history storage |
| 4. Editing Boundary (Post-Brew Fork) | Deferred: explicit-only updates for MVP |
| 5. Comparison View | Deferred: existing brew comparison is sufficient |
| 6. Per-Screen Rules | Partial: BrewScreen recipe picker, recipe fields read-only during brew |
