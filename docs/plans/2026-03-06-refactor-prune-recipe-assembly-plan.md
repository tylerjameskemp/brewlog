---
title: "Prune RecipeAssembly + Header + BrewForm Cleanup"
type: refactor
date: 2026-03-06
---

# Prune RecipeAssembly + Header + BrewForm Cleanup

Phase 1 of the [UI Audit](./2026-03-06-ui-audit.md). Purely subtractive — remove clutter, collapse sections, eliminate redundant UI. No new features.

## Overview

RecipeAssembly currently has ~14 interactive sections and requires extensive scrolling. This PR cuts it to ~6 by removing SwipeCards, Origin Details, the Edit/Done toggle, redundant template pickers, and collapsing sections by default. Also cleans up the Header and BrewForm.

## Changes

### PR 1: Prune RecipeAssembly (BrewScreen.jsx)

#### 1. Delete SwipeCards component (lines 38–93)
- Remove the entire `SwipeCards` function
- Remove `cardIndex` state (line 216)
- Remove `handleSwipe` callback (lines 286–288)

#### 2. Delete Origin Details card (lines 420–446)
- Remove `originCard` const
- Remove `beanOverrides` state (line 223)
- Remove `displayBean` computed value (line 233)
- Remove `beanOverrides` flush from `flushPendingEdits` (lines 273–276)
- Remove `onBeanUpdate` prop from RecipeAssembly
- Remove `handleBeanUpdate` callback from parent (lines 1770–1776) and `onBeanUpdate={handleBeanUpdate}` prop (line 2037)

#### 3. Remove Edit/Done toggle — fields always tappable
- Remove `editing` state (line 217)
- Remove Edit/Done button (lines 467–474)
- Remove `handleDoneEditing` callback (lines 280–283)
- Replace all `{editing ? <input> : <div>}` ternaries with always-rendered inputs:
  - Coffee/Water grid (lines 334–346): always render `<input type="number">`
  - Grind (lines 354–377): always render select/input
  - Temp (lines 382–394): always render `<input type="number">`
  - Target Time (lines 399–414): always render text input
- Remove `disabled={!editing}` from StepEditor (line 693)
- Remove `hint` prop that references "Tap Edit above" (line 695)
- **Style inputs to match current read-only display**: center-aligned, large text, transparent background with subtle border on focus (the current `editing` input styles already do this — keep them)

**Gotcha (from learnings):** `flushPendingEdits()` on CTA buttons must remain. The target time input still buffers in `targetTimeInput` state and commits on blur. If user types a value and taps "Brew This" without blurring, the CTA flush catches it. This pattern is preserved — only the `beanOverrides` flush is removed.

#### 4. Remove full-page template picker (lines 608–641)
- Remove the `{!templatePicked ? (...) : (...)}` conditional
- Remove `templatePicked` state (line 222)
- Always render the essentials + steps + equipment (the `<>...</>` branch)
- **Auto-select default template for new beans:** In `getRecipeDefaults()` (line 1690), change `steps: []` to `steps: structuredClone(templates[0]?.steps || [])` and `pourTemplateId: null` to `pourTemplateId: templates[0]?.id || null`. This ensures new beans always start with Standard 3-Pour V60 steps. The `templates` array is already available via `useMemo` (line 1687), but since `getRecipeDefaults` is a `useCallback` that doesn't have `templates` in its deps, we either:
  - (a) Add `templates` to the dep array and reference it, OR
  - (b) Move the auto-population into `buildRecipeFromEntity` when no recipes exist (line 1711–1713)

  **Decision:** Option (b) is cleaner — `getRecipeDefaults` stays generic, and `buildRecipeFromEntity` handles the "no recipe for this bean" case by populating from the first template.

#### 5. Remove Pour Templates horizontal bar (lines 649–670)
- Delete the entire template selector section
- Remove `selectedTemplateId` state (line 218)
- Remove `handleTemplateSelect` callback (lines 290–299)
- **Gap acknowledged:** Between this PR and Phase 2, users cannot switch templates mid-recipe. They can still manually edit steps via StepEditor, or select a different recipe via the recipe picker. Phase 2 will add templates as "starter recipes" in the recipe dropdown.

#### 6. Remove "Revert steps" and "Choose a pour template" links (lines 701–741)
- Delete the entire IIFE block

#### 7. Collapse Pour Steps by default
- Change `stepsOpen` initializer (line 228) from `() => recipe.steps.length > 0` to `false`
- Enhance collapsed summary: show step count + total water (e.g., "4 steps · 240g")
  ```jsx
  {!stepsOpen && recipe.steps.length > 0 && (
    <div className="text-xs text-brew-500">
      {recipe.steps.length} steps{recipe.waterGrams ? ` · ${recipe.waterGrams}g` : ''}
    </div>
  )}
  ```

#### 8. Render essentials inline (no cards)
- Remove card wrapper from `essentialsCard` — render its contents directly in the component tree with `px-4` padding (matching other sections)
- Keep bean identity (name, roaster, roast date) at top as a read-only display
- Keep brew params (coffee, water, ratio, grind, temp, target time) as always-editable inputs below

#### 9. Keep recipe picker, recipe notes, "Notes from Last Brew", and "Save changes to recipe" as-is
- Recipe picker (lines 479–576): no changes
- Recipe notes (lines 579–590): no changes
- "Notes from Last Brew" / changes card (lines 592–606): no changes, stays in current position
- RecipeSaveChoice (lines 842–868): no changes

#### Summary of state removed from RecipeAssembly
| State | Line | Removed |
|-------|------|---------|
| `cardIndex` | 216 | Yes |
| `editing` | 217 | Yes |
| `selectedTemplateId` | 218 | Yes |
| `templatePicked` | 222 | Yes |
| `beanOverrides` | 223 | Yes |
| `showRecipePicker` | 219 | Keep |
| `renamingRecipeId` | 220 | Keep |
| `renameValue` | 221 | Keep |
| `targetTimeInput` | 224 | Keep |
| `stepsOpen` | 228 | Keep (change default) |
| `equipmentOpen` | 229 | Keep |

#### Summary of props removed from RecipeAssembly
| Prop | Removed |
|------|---------|
| `onBeanUpdate` | Yes |
| All others | Keep |

### PR 2: Header + BrewForm Cleanup

#### 1. Header — remove "BrewLog" text (Header.jsx, line 20–22)
- Change `☕ BrewLog` to just `☕`
- Add `aria-label="BrewLog"` to the `<h1>` for accessibility
- Result: `<h1 className="..." aria-label="BrewLog">☕</h1>`

#### 2. BrewForm — make bean name read-only (BrewForm.jsx, lines 207–225)
- Replace the `<input>` with a styled read-only display:
  ```jsx
  <div className="col-span-2">
    <label className="text-xs font-medium text-brew-500 mb-1 block">Bean Name</label>
    <div className="p-3 rounded-xl border border-brew-100 bg-brew-50/50 text-base text-brew-800">
      {form.beanName}
    </div>
  </div>
  ```
- Remove the `<datalist id="bean-suggestions">` element (lines 222–224)
- Keep `form.beanName` in form state (it's still used in save logic at line 115)
- **Gotcha (from learnings):** The save handler uses `form.beanName.trim()` — this still works fine since the value is initialized from `editBrew.beanName` and never changes. No spread-overwrite risk here because the value is identical.

## Target RecipeAssembly Layout (After Pruning)

```
┌──────────────────────────────────────┐
│  < Back  RECIPE                      │
│                                      │
│  Prepare Your Brew                   │
│                                      │
│  [Recipe Picker ▾] (if recipes exist)│
│  Recipe notes (if any)               │
│  ┌─ Notes from Last Brew ──────────┐ │
│  │  "Try coarser grind..."         │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─ Bean + Brew Params ────────────┐ │
│  │  Kemera Red Bourbon             │ │
│  │  Flower Child · Roasted 2/17    │ │
│  │                                 │ │
│  │  [16g]  [272g]   1:17.0        │ │
│  │  COFFEE  WATER    RATIO         │ │
│  │                                 │ │
│  │  [5]      [211°F]              │ │
│  │  GRIND    TEMP                  │ │
│  │                                 │ │
│  │  [3:30]                         │ │
│  │  TARGET TIME                    │ │
│  └─────────────────────────────────┘ │
│                                      │
│  POUR STEPS        4 steps · 272g  ▾ │
│  EQUIPMENT    V60 · Fellow Ode · …  ▾│
│                                      │
│  [Save changes to recipe] (if diff)  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Brew This              │  │
│  └────────────────────────────────┘  │
│         Log without timer            │
└──────────────────────────────────────┘
```

## Gotchas to Avoid (from institutional learnings)

1. **Primary action flush** — Keep `flushPendingEdits()` on "Brew This" and "Log without timer" CTAs. Only remove `beanOverrides` flush and `handleDoneEditing`.
2. **Edit form field preservation** — Bean name in BrewForm stays in `form` state even though it's read-only. The save handler uses it. Don't remove it from the form object.
3. **Nullish coalescing** — When removing editing conditionals, ensure numeric fields (coffeeGrams, waterGrams, waterTemp) use `??` not `||` for default values.
4. **motion-reduce** — Any remaining `animate-fade-in` on collapsible sections must keep `motion-reduce:animate-none`.

## Acceptance Criteria

- [ ] RecipeAssembly renders without SwipeCards, Origin Details, or Edit/Done toggle
- [ ] All brew param fields (coffee, water, grind, temp, target time) are always editable (no toggle needed)
- [ ] New beans auto-populate with Standard 3-Pour V60 steps (no empty recipe)
- [ ] Pour Steps and Equipment sections are collapsed by default
- [ ] Pour Steps collapsed summary shows step count + water total
- [ ] Recipe picker, recipe notes, "Notes from Last Brew", and RecipeSaveChoice unchanged
- [ ] StepEditor is always enabled (no `disabled` prop)
- [ ] "Brew This" and "Log without timer" still flush pending target time input
- [ ] Header shows only coffee cup icon (with aria-label)
- [ ] BrewForm bean name is read-only display
- [ ] `npm run build` passes with zero errors
- [ ] No changes to Rate screen, History, or any other component

## Files Modified

| File | Change |
|------|--------|
| `src/components/BrewScreen.jsx` | Heavy: delete SwipeCards, originCard, editing state, template picker, template bar, revert/choose links. Refactor essentialsCard to inline. Change stepsOpen default. |
| `src/components/Header.jsx` | Minor: remove "BrewLog" text, add aria-label |
| `src/components/BrewForm.jsx` | Minor: make bean name read-only, remove datalist |

## References

- Audit plan: `docs/plans/2026-03-06-ui-audit.md`
- Primary action flush pattern: `docs/solutions/react-patterns/primary-action-must-flush-pending-edits.md`
- Edit form overwrites: `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`
- Extracted component layout: `docs/solutions/react-patterns/extracted-component-should-not-bake-layout-wrapper.md`
