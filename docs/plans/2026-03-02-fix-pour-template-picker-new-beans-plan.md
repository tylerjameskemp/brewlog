---
title: "fix: Show pour template picker for new beans instead of blind auto-select"
type: fix
date: 2026-03-02
---

# fix: Show pour template picker for new beans instead of blind auto-select

## Problem

When starting a brew with a bean that has **no prior brews**, `buildRecipeFromBean` (`BrewScreen.jsx:1114-1135`) blindly falls back to `templates[0]?.steps`, which is always "Standard 3-Pour V60". This is confusing — if you just brewed a Geisha with a delicate 3-pour recipe and switch to a dark roast, the app silently pre-fills the same template regardless.

**Current fallback chain** (line 1120-1122):
```js
const steps = lastBrew?.recipeSteps
  ? normalizeSteps(lastBrew.recipeSteps)
  : templates[0]?.steps || []  // ← problem: always picks first template
```

For beans **with** prior brews, `getLastBrewOfBean()` returns the correct last brew and steps auto-fill from it — this works correctly and should not change.

## Proposed Solution

When a bean has no prior brews, show a **template picker** in RecipeAssembly instead of auto-selecting. The picker displays available templates from `getPourTemplates()` as selectable cards with summary info, plus a "Custom" option for manual step entry. After selection, the recipe populates and the normal flow continues.

## Implementation

### 1. Flag "needs template pick" in `buildRecipeFromBean` (`BrewScreen.jsx:1114`)

When `getLastBrewOfBean()` returns null, return recipe with empty steps and a `needsTemplatePick: true` flag:

```jsx
// BrewScreen.jsx — buildRecipeFromBean
const buildRecipeFromBean = useCallback((beanName) => {
  if (!beanName) {
    // No bean selected — this state is used during reset before bean picker shows.
    // needsTemplatePick: false because the user hasn't picked a bean yet.
    return { coffeeGrams: 15, waterGrams: 240, grindSetting: '', waterTemp: 200,
             targetTime: 210, targetTimeRange: '', targetTimeMin: null, targetTimeMax: null,
             steps: [], pourTemplateId: null, needsTemplatePick: false }
  }
  const lastBrew = getLastBrewOfBean(beanName)
  const method = BREW_METHODS.find(m => m.id === equipment?.brewMethod) || BREW_METHODS[0]

  // Bean has prior brew — auto-fill from it (existing behavior, unchanged)
  if (lastBrew) {
    const steps = lastBrew.recipeSteps
      ? normalizeSteps(lastBrew.recipeSteps)
      : templates[0]?.steps || []
    return {
      coffeeGrams: lastBrew.coffeeGrams || 15,
      waterGrams: lastBrew.waterGrams || 240,
      grindSetting: lastBrew.grindSetting || '',
      waterTemp: lastBrew.waterTemp || 200,
      targetTime: lastBrew.targetTime || method.defaultTotalTime,
      targetTimeRange: lastBrew.targetTimeRange || '',
      targetTimeMin: lastBrew.targetTimeMin || null,
      targetTimeMax: lastBrew.targetTimeMax || null,
      steps,
      pourTemplateId: lastBrew.pourTemplateId || templates[0]?.id || null,
      needsTemplatePick: false,
    }
  }

  // No prior brew for this bean — show template picker
  return {
    coffeeGrams: 15, waterGrams: 240, grindSetting: '', waterTemp: 200,
    targetTime: method.defaultTotalTime, targetTimeRange: '',
    targetTimeMin: null, targetTimeMax: null,
    steps: [], pourTemplateId: null, needsTemplatePick: true,
  }
}, [equipment, templates])
```

**Key change:** When `lastBrew` is null, `steps` is `[]` and `needsTemplatePick` is `true`. No template is pre-selected.

### 2. Template picker cards in `RecipeAssembly` (`BrewScreen.jsx:159`)

Replace the existing pill-button template selector (lines 514-534) with a conditional:

- **If `recipe.needsTemplatePick` is true** → show full-card template picker (new UI)
- **If false** → show the existing pill buttons for switching templates mid-recipe (existing behavior)

```jsx
// New TemplatePicker component — inline in RecipeAssembly or extracted
// Renders when recipe.needsTemplatePick === true

{recipe.needsTemplatePick ? (
  <div className="px-4 mt-4">
    <div className="text-sm font-medium text-brew-700 mb-1">Choose a pour template</div>
    <div className="text-xs text-brew-400 mb-3">Pick a starting recipe, or build your own</div>
    <div className="space-y-2">
      {templates.map(t => {
        const totalWater = t.steps.reduce((max, s) => Math.max(max, s.waterTo || 0), 0)
        return (
          <button
            key={t.id}
            onClick={() => handleTemplateSelect(t)}
            className="w-full text-left p-4 rounded-2xl border border-brew-200
                       bg-white hover:bg-brew-50 hover:border-brew-400 transition-all
                       min-h-[44px]"
          >
            <div className="font-medium text-brew-800 text-sm">{t.name}</div>
            <div className="text-xs text-brew-400 mt-1">
              {t.steps.length} steps · {totalWater}g total water
            </div>
          </button>
        )
      })}
      {/* Custom — timer only, no step guidance */}
      <button
        onClick={() => {
          setSelectedTemplateId(null)
          setRecipe(prev => ({
            ...prev,
            steps: [],
            pourTemplateId: null,
            needsTemplatePick: false,
          }))
        }}
        className="w-full text-left p-4 rounded-2xl border border-dashed border-brew-300
                   bg-brew-50/50 hover:bg-brew-50 hover:border-brew-400 transition-all
                   min-h-[44px]"
      >
        <div className="font-medium text-brew-600 text-sm">Custom</div>
        <div className="text-xs text-brew-400 mt-1">Timer only — no step guidance</div>
      </button>
    </div>
  </div>
) : (
  /* Existing pill-button template selector (lines 514-534 — unchanged) */
  templates.length > 0 && (
    <div className="px-4 mt-4">
      <div className="text-[11px] text-brew-400 uppercase tracking-widest mb-2">Pour Templates</div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {templates.map(t => ( /* ... existing pill buttons ... */ ))}
      </div>
    </div>
  )
)}
```

### 3. Clear `needsTemplatePick` on template select

Update `handleTemplateSelect` (line 205) to also clear the flag:

```jsx
const handleTemplateSelect = (template) => {
  setSelectedTemplateId(template.id)
  setRecipe(prev => ({
    ...prev,
    steps: template.steps,
    pourTemplateId: template.id,
    needsTemplatePick: false,  // ← add this
  }))
}
```

### 4. Hide swipe cards and "Brew This" CTA until template is chosen

When `needsTemplatePick` is true, the recipe has no steps — so the swipe cards (essentials, steps, origin) and the "Brew This" button should be hidden or disabled until a template is selected.

```jsx
// Gate the swipe cards and CTA on template being chosen
{!recipe.needsTemplatePick && (
  <>
    <div className="mt-4">
      <SwipeCards cards={[essentialsCard, stepsCard, originCard]} ... />
    </div>
    {/* existing pill template selector */}
    {/* existing Brew This CTA */}
  </>
)}
```

This keeps the RecipeAssembly clean: first pick a template, then adjust the recipe.

## Edge Cases

1. **Custom card must clear `selectedTemplateId`** — The Custom button's onClick must call `setSelectedTemplateId(null)` so the pill selector doesn't highlight `templates[0]` after choosing Custom. (Fixed in the code above.)

2. **`buildRecipeFromBean(null)` returns `needsTemplatePick: false`** — The null-bean path is only hit during `handleStartNewBrew` reset, which immediately sends the user to the bean picker. No template picker should show in that state. (Fixed in the code above.)

3. **No templates at all** — If `getPourTemplates()` returns `[]` (e.g., user imported a file with `pourTemplates: []`), the picker shows only the Custom card. This is acceptable — `seedDefaultPourTemplates()` runs on app load so this is an unusual edge case.

4. **`initialBean` back button** — When a user enters BrewScreen via BeanLibrary's "Brew This Bean" (`initialBean` prop), pressing Back from the template picker calls `setPhase('pick')` and shows the generic BeanPicker, not BeanLibrary. This is a pre-existing UX gap, not introduced by this change. Out of scope for this fix.

## Files Changed

| File | Change |
|------|--------|
| `src/components/BrewScreen.jsx:1114-1135` | Add `needsTemplatePick` flag to `buildRecipeFromBean` |
| `src/components/BrewScreen.jsx:159-212` | Template picker card UI in RecipeAssembly |
| `src/components/BrewScreen.jsx:205-212` | Clear flag in `handleTemplateSelect` |
| `src/components/BrewScreen.jsx:508-534` | Conditional: cards vs picker based on `needsTemplatePick` |

No new files. No storage changes. No data model changes.

## Acceptance Criteria

- [x] New bean (no prior brews): RecipeAssembly shows template picker cards, NOT the swipe-card recipe view
- [x] Each template card shows: name, step count, total water
- [x] "Custom" card starts with empty steps for manual entry
- [x] Selecting a template populates steps and transitions to the normal recipe view with swipe cards
- [x] Pill-button template switcher still appears in the normal recipe view (after initial pick)
- [x] Bean WITH prior brews: auto-fills from last brew of that bean, no picker shown — existing behavior unchanged
- [x] "Brew This" button is not visible until a template is selected
- [x] All buttons have min-h-[44px] touch targets
- [x] Template picker follows existing design language (rounded-2xl, brew-* colors, Inter font)

## Test Plan

- [ ] Add a new bean via Bean Library. Start a brew with it. Verify template picker appears
- [ ] Select "Standard 3-Pour V60" — verify steps populate (4 steps, 240g total)
- [ ] Select "Tetsu 4:6 Method" — verify steps populate (5 steps, 250g total)
- [ ] Select "Custom" — verify empty steps, can add manually
- [ ] Brew and commit with the new bean. Start a second brew with same bean — verify it auto-fills from first brew, no picker
- [ ] Start a brew with a bean that already has history — verify no picker, auto-fill works
- [ ] Mobile: verify cards are tappable, no horizontal overflow issues
