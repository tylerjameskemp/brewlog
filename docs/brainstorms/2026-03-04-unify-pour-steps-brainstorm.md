# Unify Pour Steps — Single Editor, Inline Diff

**Date:** 2026-03-04
**Status:** Ready for planning

## Problem

Pour steps appear in multiple places with inconsistent capabilities:

1. **New brew (RecipeAssembly):** Custom inline renderer — can edit duration/water/notes but **cannot add or remove steps**. Not using StepEditor component.
2. **Edit from History (BrewForm):** Two full StepEditor instances — one for "planned steps" (`recipeSteps`), one for "actual steps" (`steps`). Confusing and redundant.
3. **Brew record storage:** Three copies of steps at creation — `recipeSteps`, `steps`, `recipeSnapshot.steps` — all identical initially.

Users see steps in two places during editing, can't add steps during brew setup, and the plan-vs-actual distinction creates confusion rather than value.

## What We're Building

**Approach: Single Steps + Frozen Snapshot**

A brew record has ONE editable `steps` field (the actuals). The original plan is preserved in `recipeSnapshot.steps` (read-only, frozen at brew time — already exists). The redundant `recipeSteps` top-level field is eliminated.

### Changes by Screen

| Screen | Current | New |
|---|---|---|
| RecipeAssembly (new brew) | Custom inline renderer, no add/remove | Full StepEditor with add/remove/edit all fields |
| ActiveBrew (timer) | Read-only teleprompter | No change |
| RateThisBrew | Read-only timing review from `recipeSteps` | Read-only timing review from `recipeSnapshot.steps` |
| BrewForm (edit from history) | TWO StepEditors (plan + actuals) | ONE StepEditor editing `steps`, inline annotations showing planned-vs-actual diff |
| BrewHistory expanded card | Read-only actuals | No change |

### Data Model Changes

- **Remove:** `recipeSteps` top-level field on brew records (migrate existing data)
- **Keep:** `steps` (the actuals, editable), `recipeSnapshot.steps` (frozen plan, read-only), `stepResults` (timer data)
- **No new fields added**

### Inline Diff Behavior

When editing a brew in BrewForm, if a step differs from `recipeSnapshot.steps`, show a subtle annotation:
- Changed duration: "planned: 40s" next to the actual value
- Added step (not in snapshot): "added post-brew" tag
- Removed step (in snapshot but not actuals): shown in a muted "removed" row

Diff is computed at render time by comparing `steps` against `recipeSnapshot.steps`. No stored diff field needed.

### Recipe Update Prompt

When saving edits in BrewForm, if `steps` differ from `recipeSnapshot.steps`, prompt: "Your actual steps differed from the recipe. Update the recipe for this bean?" This gives the user control over whether corrections flow back to the recipe template.

## Why This Approach

- **Simpler data model:** Eliminates one of three redundant step copies
- **Uses existing structures:** `recipeSnapshot.steps` already exists and is already frozen — no new data model needed
- **Single editor everywhere:** StepEditor component is reused in both RecipeAssembly and BrewForm
- **Planned vs actual preserved:** The distinction is maintained via `recipeSnapshot.steps` comparison, but surfaced as inline annotations rather than a confusing second editor
- **YAGNI:** No pre-computed diff logs, no new storage fields

### Recipe Naming & Multi-Recipe Support

The app already supports multiple recipes per bean (keyed by `beanId`), with a picker dropdown in RecipeAssembly. However, recipes are auto-named by method ("V60"), so two V60 recipes for the same bean look identical in the picker.

**Changes:**
- **Rename from picker:** Add an inline rename action to the recipe picker dropdown (long-press, edit icon, or swipe). User can rename "V60" to "V60 Full Body" or "V60 Mellow".
- **Auto-naming stays:** Auto-creation still names the recipe after the method. User renames later if they want to distinguish.
- **`getRecipeForBeanAndMethod` unchanged:** Still returns most-recently-used for a given method. When there are multiple same-method recipes, the picker is already shown.
- **No new data fields:** Recipe already has a `name` field — it's just not user-editable today.

## Key Decisions

1. **One `steps` field per brew** — `recipeSteps` is eliminated, `recipeSnapshot.steps` serves as the frozen plan
2. **Full StepEditor in RecipeAssembly** — replaces the limited custom inline renderer
3. **Single editor in BrewForm** — editing `steps` with inline diff annotations from `recipeSnapshot.steps`
4. **Optional recipe update on save** — prompt when actuals differ from plan
5. **Migration required** — existing brews need `recipeSteps` removed; data is already duplicated in `recipeSnapshot.steps`
6. **Renamable recipes** — editable recipe names from the picker dropdown, auto-named by method on creation
7. **Multiple same-method recipes supported** — already works in storage, naming makes them distinguishable in UI

## Open Questions

- Should the inline diff annotations be collapsible/hideable for users who don't care about the comparison?
- When a brew has no `recipeSnapshot` (very old brews pre-migration), should we skip diff display entirely or synthesize a snapshot from `recipeSteps`?
- What's the best rename UX for the recipe picker? Options: edit icon next to each recipe, tap-and-hold to rename, or a small "Rename" button in the dropdown.

## Scope Estimate

- Migration: small (drop `recipeSteps`, ensure `recipeSnapshot.steps` exists on all records)
- RecipeAssembly: medium (replace custom inline renderer with StepEditor integration)
- BrewForm: medium (collapse two editors to one, add inline diff annotations)
- RateThisBrew: small (read from `recipeSnapshot.steps` instead of `recipeSteps`)
- StepEditor: small (may need minor props for diff annotation support)
- Recipe naming: small (add rename UI to existing picker dropdown)
