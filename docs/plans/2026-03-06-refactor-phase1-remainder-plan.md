---
title: Phase 1 Remainder — Evaluate & Rethink Items
type: refactor
date: 2026-03-06
---

# Phase 1 Remainder — Evaluate & Rethink Items

5 items remain from the Phase 1 "Prune" audit. 10 of 15 were completed in PR #35. These are the "evaluate" and "rethink" items that require design decisions before implementation.

## Overview

| Item | Component | Decision | Vertical Space Recovered |
|------|-----------|----------|--------------------------|
| 1.1i | RecipeSaveChoice | Remove from RecipeAssembly; rely on existing BrewSuccess prompt | ~44px + button height |
| 1.2b | PhaseIndicator | Remove | ~26px |
| 1.3a | ActiveBrew subtitle | Remove | ~20-24px |
| 1.4b | History expanded card | Progressive disclosure: summary + "Show details" | Reduces scroll depth ~60% |
| 1.5b | BrewForm sections | Add content indicators; make key sections non-collapsible | No change (reduces taps) |

---

## 1.1i — Remove RecipeSaveChoice from RecipeAssembly

### Current State

`RecipeSaveChoice` (BrewScreen.jsx:114-153) renders a floating "Save changes to recipe" button mid-screen whenever recipe fields diverge from the stored recipe entity. On tap, it expands to "Update [name]" / "Save as New" / "Cancel".

### Decision: Remove entirely

The **BrewSuccess screen already handles recipe divergence** (BrewScreen.jsx:~1806-1816). It shows "Update Recipe" / "Save as New Recipe" options after the brew is complete. This is the right place for the prompt — the user has finished brewing and can make a calm decision about persisting recipe changes.

Removing the mid-screen button during RecipeAssembly:
- Eliminates a floating CTA that competes with "Brew This"
- Follows the Phase 1 "subtractive" principle — remove, don't relocate
- Preserves recipe-save functionality via the existing BrewSuccess path
- Avoids the complexity of inserting a prompt between phases

### What NOT to change

- The `recipeDiff` useMemo (lines 215-224) should remain — BrewSuccess uses it to detect divergence
- `linkRecipeToBrew()` still auto-creates recipes on first brew of a bean
- BrewForm's post-edit recipe prompt (BrewForm.jsx:153-186) is a separate concern and stays

### Implementation

1. Delete the `RecipeSaveChoice` component definition (lines 114-153, 40 lines)
2. Delete the render site (lines 596-613)
3. Remove `onSaveToRecipe` and `onSaveAsNewRecipe` props from `RecipeAssembly` signature
4. Remove corresponding prop-passing from parent BrewScreen call site
5. Verify BrewSuccess recipe-fork prompt still works (it reads `recipeDiff` from its own logic)
6. Dead-code audit: grep for `RecipeSaveChoice`, `onSaveToRecipe`, `onSaveAsNewRecipe`

### Files changed

- `src/components/BrewScreen.jsx` — delete component + render site + props

---

## 1.2b — Remove PhaseIndicator

### Current State

`PhaseIndicator` (BrewScreen.jsx:38-52) renders 3 thin horizontal bars (2px tall, ~26px total with padding) showing progress through recipe/brew/rate phases. Hidden during `pick` and `success`.

### Decision: Remove

- **Invisible during brew phase** — ActiveBrew's `fixed` positioning covers it
- **No labels** — bars convey "step X of 3" but not which steps
- **No ARIA** — zero accessibility value
- **~26px recovered** on every phase screen

No replacement orientation mechanism needed. The flow is self-evident: big "Brew This" button → timer → rating screen → done.

### Implementation

1. Delete the `PhaseIndicator` component definition (lines 38-52, 15 lines)
2. Delete the render site (line 1740)
3. Dead-code audit: the component has no external dependencies — self-contained

### Files changed

- `src/components/BrewScreen.jsx` — delete component + render site

---

## 1.3a — Remove ActiveBrew Recipe Reference Strip

### Current State

A muted monospace line (BrewScreen.jsx:760-769) shows `16g · 5 · 272g target` below the timer during active brew. Text is `text-xs text-brew-400` — small and low-contrast.

### Decision: Remove

- **Non-actionable** — dose is in the dripper, grind is set, water target is shown per-step in the teleprompter
- **Target time already visible** — shown adjacent to the timer (line 744-746)
- **Redundant water info** — step cards show per-step `waterTo` targets
- **~20-24px recovered** — pushes play/pause controls up (better thumb reach)

### Implementation

1. Delete the recipe reference strip JSX (lines 760-769, 9 lines)
2. No state/prop cleanup needed — the `recipe` prop is used by other parts of ActiveBrew

### Files changed

- `src/components/BrewScreen.jsx` — delete JSX block

---

## 1.4b — History Expanded Card: Progressive Disclosure

### Current State

Expanding a brew card in BrewHistory.jsx shows all content at once (lines 574-751, ~177 lines of JSX):
1. Recipe section (dose/water/grind/temp/target/equipment/recipe name)
2. Brew section (total time/deviation/pour steps/issues/notes)
3. Tasting section (flavors/body)
4. Diffs section (changes from previous)
5. Edit/Delete buttons (at the very bottom)

Problems:
- Tasting data buried below recipe + brew sections
- Edit button requires scrolling to the very bottom
- On a 5-step brew with notes, the expanded card is ~400+ pixels

### Decision: Summary + "Show details" toggle

**Summary section (always visible on expand):**

| Field | Source | Why |
|-------|--------|-----|
| Dose / Water / Ratio | `brew.coffeeGrams`, `brew.waterGrams` | Core recipe identity |
| Grind | `brew.grindSetting` | Most-tweaked parameter |
| Total Time | `brew.totalTime` | Key outcome metric |
| Flavors (if any) | `brew.flavors` | Quick taste fingerprint |
| Notes preview (if any) | `brew.notes` truncated to ~80 chars | Most unique identifier |
| Edit / Delete buttons | — | Most actionable elements, moved UP from bottom |

**Details section (behind "Show details" toggle):**

| Field | Why hidden |
|-------|-----------|
| Water Temp | Rarely changes, rarely referenced |
| Target Time + deviation | Niche dial-in data |
| Equipment line | Rarely changes |
| Recipe name | Low-value after the brew |
| Actual Pour Steps + timing | Detail-level brew data |
| Issues | Infrequent |
| Full notes (if truncated) | Shown in preview already |
| Body | Niche tasting data |
| Diffs from previous | Already shown as badges on collapsed card |

### Implementation

1. Split the expanded card JSX into two blocks: `summaryContent` and `detailContent`
2. Add local `showDetails` state per card (boolean, default false)
3. Render summary always; render details inside existing `Collapsible` when `showDetails` is true
4. "Show details" / "Hide details" as a text button between summary and Edit/Delete
5. Move Edit/Delete buttons into the summary section (above "Show details")
6. Truncate notes to ~80 chars with "..." in summary; full notes in details
7. Add `aria-expanded` to the "Show details" toggle

### Files changed

- `src/components/BrewHistory.jsx` — restructure expanded card content

---

## 1.5b — BrewForm: Smarter Section Collapsibility

### Current State

7 collapsible sections under 3 phase headers. The `Section` component (BrewForm.jsx:557-579) wraps each in a collapsible card with chevron toggle.

| Phase | Section | Default Open |
|-------|---------|-------------|
| Recipe | Coffee | Yes |
| Recipe | Brew Parameters | Yes |
| Brew | Timing | No |
| Brew | Pour Steps | Yes (if steps exist) |
| Brew | Issues | No |
| Brew | Notes | No |
| Tasting | Tasting | No |

Problems:
- Notes, Issues, and Tasting are collapsed by default — users must hunt for them
- No indication of whether a collapsed section has content
- Phase headers add ~120px of chrome

### Decision: Content indicators + selective non-collapsibility

**Changes:**

1. **Add content indicators to collapsed section headers** — when a section has data, show a brief preview or count next to the title:
   - Issues: `"Issues (3)"` or `"Issues"` if empty
   - Notes: `"Notes — Tried a faster bloom..."` (truncated ~40 chars) or `"Notes"` if empty
   - Tasting: `"Tasting (4 flavors, ★★★★)"` or `"Tasting"` if empty

2. **Make Timing always visible (non-collapsible)** — Total time is the most commonly corrected field post-brew. Removing the tap-to-expand reduces friction. Timing content is small (one input), so the vertical cost is minimal.

3. **Keep Phase Headers** — they provide visual grouping that helps scanning. ~120px is acceptable for the organizational benefit, especially on a form with 7 sections.

4. **Keep Pour Steps, Issues, Notes, Tasting collapsible** — these can be large and are not always relevant.

### Implementation

1. Extend the `Section` component to accept a `preview` prop (string, optional)
2. When collapsed and `preview` is truthy, render preview text next to the section title in muted style
3. Compute preview strings in the parent form:
   - Issues: `form.issues?.length ? \`(${form.issues.length})\` : null`
   - Notes: `form.notes ? form.notes.slice(0, 40) + (form.notes.length > 40 ? '...' : '') : null`
   - Tasting: build from `form.flavors?.length`, `form.body`, `form.rating`
4. For Timing section: replace `<Section>` wrapper with a plain `<div>` with the same card styling but no collapse toggle. Or pass `collapsible={false}` prop to `Section`.
5. Verify all defaultOpen values are still correct after changes

### Files changed

- `src/components/BrewForm.jsx` — extend Section component, add preview props, make Timing non-collapsible

---

## Implementation Order

All 5 items are independent. Recommended order by risk (lowest first):

1. **1.2b — Remove PhaseIndicator** (15 lines deleted, zero dependencies)
2. **1.3a — Remove ActiveBrew subtitle** (9 lines deleted, zero dependencies)
3. **1.1i — Remove RecipeSaveChoice** (40 lines deleted, verify BrewSuccess path)
4. **1.5b — BrewForm section indicators** (additive, extends existing component)
5. **1.4b — History progressive disclosure** (largest change, restructures expanded card)

Items 1-3 can be one commit (pure deletions). Items 4-5 are separate commits.

## Acceptance Criteria

- [x] RecipeSaveChoice button no longer appears in RecipeAssembly
- [x] BrewSuccess still prompts to save/update recipe when fields diverge
- [x] PhaseIndicator bars no longer render during brew flow
- [x] ActiveBrew screen shows timer + target time + step teleprompter only (no subtitle strip)
- [x] History expanded card shows summary on expand; "Show details" reveals full content
- [x] Edit/Delete buttons visible immediately on card expand (not buried at bottom)
- [x] BrewForm collapsed sections show content indicators (counts, previews)
- [x] BrewForm Timing section is always visible (non-collapsible)
- [x] `npm run build` passes
- [x] `npm test` passes
- [x] No dead imports/props/callbacks left behind (dead-code audit per documented pattern)

## Gotchas (from institutional learnings)

- **Dead-prop halo** — after removing RecipeSaveChoice, grep for `onSaveToRecipe`, `onSaveAsNewRecipe`, `RecipeSaveChoice` across all files
- **Primary action flush** — removing RecipeSaveChoice does NOT remove the need for `commitTargetTimeInputs()` before "Brew This" — that flush is separate
- **Terminal state as formal phase** — PhaseIndicator removal simplifies the phase list but the phase state machine itself must not change
- **UI state separate from domain data** — content indicators in BrewForm should be computed from form state, not stored in the brew/recipe entity
- **Nullish coalescing** — when computing content indicators, use `??` not `||` for numeric fields (e.g., rating could be 0)

## References

- Audit plan: `docs/plans/2026-03-06-ui-audit.md`
- Phase 1 PR: #35
- Relevant learnings:
  - `docs/solutions/react-patterns/subtractive-refactor-leaves-dead-prop-halo.md`
  - `docs/solutions/react-patterns/primary-action-must-flush-pending-edits.md`
  - `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`
  - `docs/solutions/react-patterns/ui-state-in-data-objects-leaks-to-persistence.md`
  - `docs/solutions/react-patterns/immediate-save-then-rate-brew-flow.md`
  - `docs/solutions/logic-errors/nullish-coalescing-required-for-numeric-form-state.md`
