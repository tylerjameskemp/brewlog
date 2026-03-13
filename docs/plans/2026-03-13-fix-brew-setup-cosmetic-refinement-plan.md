---
title: Brew Setup Cosmetic Refinement
type: fix
date: 2026-03-13
---

# Brew Setup Cosmetic Refinement

Match the RecipeAssembly screen to the v6 HTML prototype and phone screenshots. Cosmetic only — no data model, storage, or navigation changes.

## Problem Statement

Three categories of visual gap between the current implementation and the design target:

1. **White borders on mobile** — RecipeAssembly doesn't break out of App.jsx's `max-w-2xl mx-auto px-4` container, leaving visible white gutters on left/right edges
2. **Recipe card is editable instead of read-only** — Prototype shows a summary reference card; current renders full StepEditor, equipment selectors, and editable parameter inputs
3. **Missing recipe card metadata** — No "Last brewed Mar 9 · rated good" subtitle, no step time ranges, no step type tags (prep/pour/wait)

## Proposed Solution

### Phase 1: Edge-to-Edge Fix

**File:** `src/components/BrewScreen.jsx` (RecipeAssembly return JSX, ~line 234)

Add `-mx-4` to the RecipeAssembly outer div to break out of App.jsx's `px-4` container, matching the BeanPicker pattern at line 48:

```jsx
// Before
<div className="relative min-h-screen overflow-hidden">

// After
<div className="-mx-4 relative min-h-screen overflow-hidden">
```

This is the exact pattern BeanPicker uses successfully. The internal `px-6` padding on content zones already provides adequate horizontal padding.

**Acceptance:**
- [ ] No white borders visible on mobile (iPhone SE through iPhone 15 Pro Max widths)
- [ ] Atmospheric background extends to screen edges
- [ ] Content text remains properly padded via existing `px-6`

### Phase 2: Editable Parameters Above the Fold

**File:** `src/components/BrewScreen.jsx`

Move the editable parameters grid into a new **Zone 1.5** between Hero and the brew button. This is where users tweak dose, water, grind, temp, and target before brewing — the core "dial-in" workflow.

#### 2a. Zone 1.5 — Compact Editable Parameters

Place between Hero (Zone 1) and Action (Zone 2). Same 3-column grid as current parameters section, but positioned above the fold so users don't need to expand the recipe card to adjust.

Include: Coffee (g), Water (g), Grind, Temp (°F), Target time, Ratio (display-only).

The water scaling banner also moves here (triggered by water input `onBlur`). Remove the `setRecipeExpanded(true)` call from `handleWaterBlur` — with the card below the fold, auto-expanding is disorienting. The Scale/Keep buttons provide sufficient feedback.

**Acceptance:**
- [ ] Editable inputs for dose, water, grind, temp, target appear between hero and brew button
- [ ] Water scaling banner appears in Zone 1.5 when triggered
- [ ] Ratio updates reactively when dose/water change
- [ ] Hero meta line stays in sync (both read from `recipe` state)

### Phase 3: Read-Only Recipe Card

**File:** `src/components/BrewScreen.jsx` (RecipeAssembly, inside the expandable recipe card)

The below-fold recipe card becomes a **read-only reference summary**. It reads from `recipe` state reactively (mirrors Zone 1.5 edits). Interactive elements that REMAIN: recipe picker, recipe rename, "+ New" / "Import" links, Close button.

#### 3a. Recipe Card Header — Add Subtitle

Add a subtitle line showing last brew date and rating below the recipe name.

**Data source:** `getBrews().find(b => b.recipeId === selectedRecipeId)` — memoize with `useMemo` keyed on `selectedRecipeId`. Use `lastUsedAt` from recipe entity for date, `rating` from brew record mapped through `RATING_SCALE` for label.

```jsx
<div className="text-xs mt-0.5" style={{ color: tod.muted }}>
  Last brewed {shortDate(lastBrew?.brewedAt)} · rated {ratingLabel}
</div>
```

`shortDate` = `new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` — inline helper, no utility needed.

**Fallback:** Hide subtitle entirely if no previous brew exists for this recipe.

#### 3b. Equipment Section — Read-Only Chips

Replace interactive selectors with static display chips showing only the currently selected values.

```jsx
<div className="flex flex-wrap gap-1">
  {[
    getMethodName(recipe.method),
    getGrinderName(recipe.grinder),
    recipe.dripper,
    recipe.filterType?.replace('-', ' '),
  ].filter(Boolean).map((label, i) => (
    <span key={i} className="text-[10px] px-2 py-1 rounded-[10px] border capitalize"
      style={{ color: tod.chipColor, borderColor: tod.chipBorder }}>
      {label}
    </span>
  ))}
</div>
```

**Import fix:** Add `getGrinderName` to the existing import from `../data/defaults` on line 13. It IS exported from defaults.js but is NOT currently imported in BrewScreen.

#### 3c. Parameters Section — Read-Only Grid

Replace `<input>` elements with plain `<span>` display values. Same 3-column grid layout.

```jsx
<span className="font-mono text-xs font-medium" style={{ color: tod.text }}>
  {recipe.coffeeGrams}g
</span>
```

Apply to all 6 cells: Coffee (`Xg`), Water (`Xg`), Ratio (`1:X.X`), Grind (raw value or `—`), Temp (`X°F`), Target (formatted time).

**Edge case:** Empty grind setting → display `—` instead of blank.

#### 3d. Steps Section — Read-Only with Time Ranges and Tags

Replace `<StepEditor>` with a numbered read-only step list. Each step shows:
- Step number (mono, muted)
- Step name/description
- Time range: `formatTime(step.time)–formatTime(step.time + step.duration)` (hidden when `duration === 0`)
- Step type tag (prep/pour/wait) with colored background

**Step type classification** (case-insensitive name matching):
- **prep**: "rinse", "measure", "grind", "heat", "preheat"
- **pour**: "pour", "bloom", "circle"
- **wait**: "wait", "degas", "swirl", "drain", "draw"
- **Fallback**: steps with `waterTo > 0` → "pour"; otherwise no tag

**Tag colors from prototype:**
```
prep: bg #E8ECDF, text #7D8966
pour: bg #F5E6DE, text #C15F3C (uses ACCENT)
wait: bg rgba(210,180,140,0.2), text #6F4E37
```

**Empty state:** When `recipe.steps.length === 0`, show "No steps defined" in muted text.

**Acceptance:**
- [ ] Steps show as numbered list with name, time range, and type tag
- [ ] Tags colored per prototype (prep=sage, pour=terracotta, wait=tan)
- [ ] Steps are NOT editable — no add/remove/reorder controls
- [ ] Empty steps shows fallback message

### Phase 4: Verify Note Card

The note card is already implemented and shows `changes` content. Verify:
- `changes` comes from `getChangesForRecipe()` or `getChangesForBean()`, which return the raw `nextBrewChanges` string from the last brew, split by newlines
- Displays as readable paragraph (not fragmented spans)
- Add literal quote marks wrapping the text to match prototype styling

**Acceptance:**
- [x] Note card appears when last brew has `nextBrewChanges` content
- [x] Text displays as a readable quoted paragraph
- [x] Matches prototype styling (italic, proper line height)

### Phase 5: Fixed CTA Gradient Fix

The fixed bottom CTA (IntersectionObserver-based) currently uses `from-parchment-100` gradient which mismatches the atmospheric background. Change to use `tod.bg` via inline style.

```jsx
// Before (Tailwind class)
<div className="bg-gradient-to-t from-parchment-100 via-parchment-100 to-transparent ...">

// After (inline style matching atmospheric bg)
<div style={{ background: `linear-gradient(to top, ${tod.bg}, ${tod.bg} 60%, transparent)` }} ...>
```

**Acceptance:**
- [x] Fixed CTA gradient blends seamlessly with atmospheric background at all times of day

## Design Decisions

### Equipment editing stays in the recipe card (interactive)

SpecFlow analysis identified that making equipment fully read-only removes the ability to change brew method, grinder, dripper, or filter type for an individual brew. This crosses from "cosmetic" into "functional regression."

**Decision:** Equipment chips STAY interactive in the recipe card. The card is read-only for parameters and steps only. Equipment editing is infrequent enough that having it below the fold is acceptable, but removing it entirely is not.

This means the equipment section in the card keeps the current `BREW_METHODS.map()`, `DRIPPER_MATERIALS.map()`, `GRINDERS` dropdown, and `FILTER_TYPES.map()` with `chipStyle()` — unchanged from the current implementation.

### Read-only card reads from reactive `recipe` state

The card parameters and steps reflect the current edit state (not the saved recipe entity). When the user edits grind in Zone 1.5, the read-only card updates. This means the parameters section in the card is somewhat redundant with Zone 1.5 — but it provides context alongside the steps and equipment, which is valuable as a reference view.

### Step type fallback

Steps with `waterTo > 0` default to "pour" tag. Steps with no matching pattern and no waterTo get no tag. Case-insensitive matching via `.toLowerCase()`.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/BrewScreen.jsx` | RecipeAssembly: `-mx-4`, Zone 1.5 editable params, read-only card (params + steps), recipe subtitle, step tags, fixed CTA gradient |
| `src/components/BrewScreen.jsx` | Add `getGrinderName` to import from `../data/defaults` (line 13) |

**NOT modified:** storage.js, App.jsx, StepEditor.jsx, any other component.

## Technical Notes

- `getGrinderName` must be added to the import on line 13 — it is exported from defaults.js but NOT currently imported
- `formatTime()` from storage.js — already imported, use for step time ranges
- Step type classification: ~10 line helper at module level or inside RecipeAssembly
- Rating label: `RATING_SCALE.find(r => r.value === lastBrew?.rating)?.label` — RATING_SCALE already imported
- Last brew lookup for subtitle: memoize with `useMemo([selectedRecipeId])` to avoid re-scanning on every render
- `tod` object passed to `chipStyle()` helper — already available, no changes needed for equipment section

## Risks

- **Editing UX — split location** — Editable params (Zone 1.5) are spatially separated from the recipe card reference. Users may not realize edits in Zone 1.5 are reflected in the card. Acceptable for v1.
- **Step type heuristic** — Name matching may miscategorize custom step names. No tag is better than a wrong tag.
- **Recipe selection resets edits** — Selecting a new recipe from the picker resets Zone 1.5 params. This is existing behavior but more surprising now that params and picker are in different scroll positions.

## Out of Scope

- Changing step data format to include explicit type field
- Adding tap-to-edit to the read-only card sections
- Modifying storage.js or data model
- Changing navigation or phase state machine
- Equipment editing UX redesign (stays as-is)
