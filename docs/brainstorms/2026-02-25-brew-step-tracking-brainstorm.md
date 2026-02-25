# Brainstorm: Brew Step Tracking

**Date:** 2026-02-25
**Status:** Ready for planning

---

## What We're Building

Modular pour-stage tracking for each brew. Instead of burying "0:00 pour to 80g, gentle swirl" in a free-text note, each pour/stage is a structured step with timing, water target, and technique notes. Steps live in both the Recipe phase (the plan) and the Brew phase (what actually happened), following a copy-on-write pattern.

Bloom becomes step 0. Existing bloom fields (`bloomTime`, `bloomWater`, `actualBloomTime`, `actualBloomWater`) are migrated into the steps array and removed from the flat data model.

---

## Why This Approach

### Copy-on-write from Recipe to Brew

The core insight: **the recipe IS the brew log unless you say otherwise.**

1. **Recipe phase** — define your pour plan (bloom, first pour, second pour, drawdown, etc.)
2. **Brew phase** — planned steps auto-populate as editable rows
3. **Modify a field** — that becomes the actual; the recipe version is preserved
4. **Delete a step** — you skipped it
5. **Don't touch anything** — it went as planned, zero effort
6. **Add a step** — you improvised

This mirrors the existing planned/actual split pattern (bloom planned in Recipe, actual in Brew) and scales it to the full pour sequence.

### Bloom as step 0

Bloom is conceptually the first step of any pour sequence. Keeping it as separate scalar fields while also having a steps array creates redundancy. Migrating bloom into steps gives a single, consistent model. The existing `migrateGrindSettings()` pattern in `storage.js` provides a proven template for idempotent data migration.

### Inline rows for mobile

Steps render as compact inline rows (time | water | note) — no modals, no expand/collapse. This is critical for brew-station use: hands wet, glancing at phone, you need "0:40 → 160g" visible without tapping anything.

---

## Key Decisions

1. **Phase placement: Both** — Steps are defined in Recipe (the plan) and auto-populated in Brew (the execution log). Mirrors the existing bloom planned/actual split.

2. **Bloom migration: Replace** — Bloom becomes step 0. Existing bloom fields are migrated to steps via an idempotent migration function. Cleanest data model going forward.

3. **Data model: `recipeSteps` + `steps`** — Each brew stores two arrays:
   - `recipeSteps` — snapshot of the plan at time of brewing
   - `steps` — the final actual state (starts as copy of recipe, user modifies)
   - Diffing is trivial: compare arrays field-by-field

4. **Step shape:**
   ```json
   {
     "label": "First pour",
     "startTime": 40,
     "targetWater": 160,
     "note": "Calm circular pour, keep stream low"
   }
   ```
   - `label`: short name (Bloom, First pour, Final pour, Drawdown)
   - `startTime`: seconds from brew start (0, 40, 80, etc.)
   - `targetWater`: cumulative grams target (null for drawdown/post-pour steps)
   - `note`: technique cue (optional)

5. **Input UX: Inline rows** — Each step is a compact row in the form. "Add Step" button appends a new row. No modals.

6. **Pre-fill: Choice between recipe and actual** — When pre-filling from the last brew of the same bean, user chooses between the last brew's `recipeSteps` (the plan) or `steps` (what actually happened). Supports the dial-in pattern: "use what I planned" vs "use what actually worked."

7. **Sub-component: `StepEditor`** — Modeled after FlavorPicker's prop interface (`steps`, `onChange`). Manages its own UI state, delegates list state upward to BrewForm.

8. **Backwards compatibility** — Old brews without steps display normally. Steps are `undefined` on legacy records. No UI changes for stepless brews.

---

## Open Questions

- **Step reordering** — Spec excludes drag-to-reorder. Is simple up/down arrow reordering also excluded, or just drag? (Safest: exclude all reordering for MVP, add steps in order.)
- **Max steps** — Should there be a cap? Most V60 recipes are 3-5 steps. Probably no hard limit needed, but worth noting.
- **History diff badges** — How to summarize step changes in the collapsed history card? Likely a simple "Pour plan changed" badge rather than per-step diffs.
- **Comparison view** — Two-brew comparison currently shows field-level diffs. Steps comparison could be complex. MVP approach: show each brew's steps side by side without field-level highlighting.

---

## Out of Scope (per spec)

- Pre-filled step options (swirl, pour type dropdowns)
- Drag-to-reorder steps
- Step templates or defaults per brew method
- AI parsing or analysis of step data
- Timer/stopwatch integration with steps
- Per-step actual vs target tracking (handled by copy-on-write instead)

---

## Dependencies

- Tweak 1 (editable brews) should land first
- Data persistence fix should land first
- Mobile scroll/visibility fix (Tweak 7) improves step viewing experience
