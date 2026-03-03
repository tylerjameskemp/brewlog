---
title: "refactor: Phase 5 — Polish & Acceptance Testing"
type: refactor
date: 2026-03-03
parent: docs/plans/2026-03-02-refactor-foundation-stabilization-plan.md
brainstorm: docs/brainstorms/2026-03-02-foundation-stabilization-brainstorm.md
---

# Phase 5 — Polish & Acceptance Testing

## Overview

Final phase of Foundation Stabilization. Phases 1–4 delivered: test harness, unified schema V2, recipe snapshots, merged post-brew flow, per-recipe equipment, skip-timer mode, and code review fixes. Phase 5 verifies everything works end-to-end, updates CLAUDE.md to reflect the current app, and fixes edge cases found during SpecFlow analysis.

**Scope:** Acceptance testing, CLAUDE.md update, targeted edge case fixes.

**Out of scope:** Dead code removal (already completed in Phases 1–4).

## Research Findings

### Dead Code Audit (Already Complete)

These items from the original Phase 5.2 task list were verified as done during Phases 1–4:

| Item | Status | Phase |
|------|--------|-------|
| `PostBrewCommit` sub-component removed | Done | Phase 3 |
| `committed` boolean → `success` phase | Done | Phase 3 |
| Duplicate `normalizeSteps` in BrewHistory removed | Done | Phase 2 |
| BrewForm scoped to edit-only | Done | Phase 4 |
| Legacy bloom fields removed from form init | Done | Phase 2 migration |
| Dead `getLastBrew()` removed from storage.js | Done | Review fixes |

**No dead code removal tasks remain for Phase 5.**

### SpecFlow Gap Analysis (30 Gaps Identified)

Critical gaps from the acceptance flow analysis, prioritized by impact:

**Must Fix (affects acceptance tests):**

1. **Gap 10 — `brew.steps` never written by BrewScreen.** `handleFinishBrew` writes `recipeSteps` (the planned steps) and `stepResults` (timing data), but never writes `steps` (actual pour steps). BrewHistory renders `brew.steps` in the expanded view as "Actual Pour Steps." Currently shows empty for all BrewScreen-created brews.

2. **Gap 8 — History auto-diff is cross-bean.** `getDiff()` compares each brew to the *previous brew in the sorted list*, not the *previous brew of the same bean*. The brainstorm specifies same-bean comparison. This affects Test B acceptance criteria ("History shows correct same-bean comparison").

3. **Gap 11 — BrewForm rating initialized to 0 instead of null.** When editing a brew that has `rating: null` (unrated), BrewForm initializes rating state to `0`. On save, this writes `rating: 0` — corrupting the "no rating" state.

**Should Fix (robustness):**

4. **Gap 5 — saveBrew/updateBrew have no try/catch for localStorage quota.** If localStorage is full, `JSON.stringify` + `setItem` throws. The storage layer catches parse errors on reads but not write errors.

5. **Gap 14 — No navigation guard during rate phase.** `isBrewActive` in App.jsx controls the `window.confirm` + `beforeunload` guard. After "Finish Brew" the brew is saved, but rate-phase data (tasting notes in progress) would be lost on navigation. Lower severity since the brew record itself is safe.

6. **Gap 3 — parseTime returns null for malformed input.** `parseTime("abc")` → `null`. Callers don't guard against this. The `totalTime` field could silently become null if user types garbage in the manual time input.

**Defer (P3, not blocking acceptance):**

7. Gap 17 — Rate phase crash recovery has no confirm dialog (auto-resumes silently)
8. Gap 12 — No grinder-aware trend filtering in BrewTrends
9. Gap 15 — No data export format version marker

## Implementation

### Commit 1: CLAUDE.md — Update to final state

**File:** `CLAUDE.md`

Update these sections to match current codebase reality:

**Phase state machine:** Update from `pick → recipe → brew → commit → committed` to `pick → recipe → brew → rate → success`.

**Sub-components:** Replace the 5-component list `(BeanPicker, RecipeAssembly, ActiveBrew, PostBrewCommit, SwipeCards)` with current: `BeanPicker, RecipeAssembly, ActiveBrew, RateThisBrew, SwipeCards, PhaseIndicator`.

**Key Files / BrewScreen.jsx entry:** Update line count (now 1,621 lines). Document RateThisBrew sub-component. Document equipment section in RecipeAssembly. Document skip-timer mode (`handleLogWithoutTimer`). Document `buildBrewRecord` helper.

**Data Models / Brew:** Replace "two formats coexist" with unified schema V2. Document `recipeSnapshot` field. Document `isManualEntry` field. Document `schemaVersion: 2`. Remove `brewScreenVersion` from docs (deleted by migration). Remove legacy step format from primary docs (only mention in migration context).

**Data Models / Active Brew:** Document `phase` field (`'brew'` | `'rate'`). Document `brewId` field (present when `phase === 'rate'`).

**Storage.js entry:** Update export count. Document `getMethodName`/`getGrinderName` helpers in defaults.js. Document `getBrews()` caching pattern. Document `_invalidateBrewsCache()` contract. Remove `getLastBrew()` from function list.

**Patterns & Conventions:** Add:
- `buildBrewRecord` extraction pattern (useCallback helper that both `handleFinishBrew` and `handleLogWithoutTimer` call)
- `clearActiveBrew()` before `saveBrew()` ordering (race window prevention)
- `getBrews()` module-level cache with invalidation on all write paths
- Equipment lookup helpers (`getMethodName`/`getGrinderName`) for display names

**Bugs & Lessons Learned:** Update todo counts, solution counts.

### Commit 2: Fix `brew.steps` field (Gap 10)

**File:** `src/components/BrewScreen.jsx`

In `buildBrewRecord`, the brew record includes `recipeSteps: recipe.steps` but no `steps` field. BrewHistory.jsx renders `brew.steps` as "Actual Pour Steps" in the expanded view.

**Fix:** Add `steps: recipe.steps` to the `buildBrewRecord` return object. For timed brews, `steps` = `recipeSteps` at brew creation (the recipe steps ARE the actual steps — the variance is captured in `stepResults`). Users can correct actuals in the rate phase via `updateBrew`.

```javascript
// In buildBrewRecord, add to the return object:
steps: recipe.steps,
```

This is a one-line addition. The `steps` field already exists on legacy/migrated brews, so BrewHistory already knows how to render it.

### Commit 3: Fix same-bean diff in History (Gap 8)

**File:** `src/components/BrewHistory.jsx`

Currently `getDiff` (now `diffsMap` via useMemo) compares `brews[index]` to `brews[index + 1]` — the next brew in the globally sorted list, regardless of bean. The brainstorm specifies same-bean comparison.

**Fix:** Build a lookup of "previous brew of same bean" before computing diffs:

```javascript
const diffsMap = useMemo(() => {
  // Build same-bean previous-brew index
  const lastSeenByBean = {}
  const prevBrewByBean = {}
  // brews are sorted by brewedAt descending (newest first)
  for (const brew of brews) {
    if (lastSeenByBean[brew.beanName]) {
      prevBrewByBean[brew.id] = lastSeenByBean[brew.beanName]
    }
    lastSeenByBean[brew.beanName] = brew
  }

  const map = {}
  for (const brew of brews) {
    const prev = prevBrewByBean[brew.id]
    if (!prev) continue
    // ... existing diff logic, but comparing brew to prev instead of brews[index+1]
  }
  return map
}, [brews])
```

The diff badges ("grind: 6-1 → 6-2") will now only appear when comparing brews of the same bean. Cross-bean diffs (which were noise) disappear.

### Commit 4: Fix BrewForm rating initialization (Gap 11)

**File:** `src/components/BrewForm.jsx`

Find the rating state initialization and change from `editBrew.rating || 0` to `editBrew.rating ?? null`. This preserves `null` for unrated brews instead of coercing to `0`.

```javascript
// Before:
rating: editBrew.rating || 0,
// After:
rating: editBrew.rating ?? null,
```

Also verify the rating UI handles `null` gracefully (shows "No rating" rather than 0 stars).

### Commit 5: Add localStorage write error handling (Gap 5)

**File:** `src/data/storage.js`

Wrap `localStorage.setItem` calls in `saveBrew`, `updateBrew`, `deleteBrew`, and `renameBrewBean` with try/catch. On quota error, log a warning and return the current brews (read-only fallback).

```javascript
export function saveBrew(brew) {
  _invalidateBrewsCache()
  const brews = getBrews()
  brews.unshift(brew)
  try {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  } catch (e) {
    console.warn('Failed to save brew (storage quota?):', e)
  }
  return getBrews()
}
```

Same pattern for `updateBrew`, `deleteBrew`, `renameBrewBean`.

### Commit 6: Acceptance tests + edge case verification

**Manual verification script (documented, not automated):**

**Test A — New bean flow:**
1. Open app → Brew tab
2. Add a new bean ("Test Bean A") via bean library or inline
3. Pick "Test Bean A" in BeanPicker
4. RecipeAssembly: verify template picker appears (no prior brew for this bean)
5. Select a pour template, verify steps populate
6. Verify equipment section shows defaults (compact view)
7. Click "Brew This"
8. Timer runs → tap each step → click "Finish Brew"
9. Verify brew appears in History immediately (check via another tab or refresh)
10. Rate: add flavors, body, rating, notes, "what to try next"
11. Click "Done"
12. Verify History shows all data including tasting notes
13. Verify `brew.steps` shows actual pour steps in expanded view
14. Pass criteria: no data loss, no console errors

**Test B — Returning bean flow:**
1. Pick "Test Bean A" again
2. Verify recipe pre-fills from last brew's actual values (grind, dose, temp)
3. Verify "Notes from last brew" section shows previous "what to try next" text
4. Tweak grind setting
5. Brew → Finish → Rate → Done
6. Verify History diff badges compare to previous "Test Bean A" brew (same-bean), not any other bean
7. Verify grind diff badge shows the change
8. Pass criteria: same-bean diff, correct pre-fill

**Test C — Edit past brew:**
1. Open History → expand a BrewScreen-created brew → Edit
2. Modify a field (e.g., notes)
3. Save
4. Verify: `recipeSnapshot` preserved, `stepResults` preserved, `rating` not corrupted to 0, `method`/`grinder`/`dripper`/`filterType` preserved
5. Pass criteria: no field loss on edit

**Test D — Skip-timer flow:**
1. Pick a bean → RecipeAssembly → "Log without timer"
2. Verify transitions to rate phase
3. Enter tasting notes, rating
4. Click "Done"
5. Verify History shows brew with `isManualEntry: true`, no step timing data
6. Pass criteria: clean manual entry

**Test E — Crash recovery during rating:**
1. Start brew → run timer → Finish Brew
2. While on rate screen, close the tab
3. Reopen app
4. Verify: prompted to resume rating (not timer)
5. Verify: brew record already exists in History (saved on Finish Brew)
6. Complete rating → Done
7. Pass criteria: no data loss, correct phase recovery

**Automated tests:**
- `npm test` — all 74+ tests pass
- `npm run build` — no errors

### Commit 7: Update stabilization plan checkboxes

**File:** `docs/plans/2026-03-02-refactor-foundation-stabilization-plan.md`

Check off all Phase 5 tasks (5.1–5.4). Mark the overall plan as complete.

---

## Acceptance Criteria

- [x] Tests A–E all pass without data loss or navigation dead-ends
- [x] `npm test` passes all unit tests (74 tests)
- [x] `npm run build` succeeds with no errors
- [x] CLAUDE.md accurately describes the final app state
- [x] History auto-diff compares same-bean brews (not cross-bean)
- [x] `brew.steps` populated for all BrewScreen-created brews
- [x] BrewForm edit preserves `rating: null` (not coerced to 0)
- [x] localStorage write failures don't crash the app

## Critical Files

| File | Commits | Changes |
|------|---------|---------|
| `CLAUDE.md` | 1 | Full update to final state |
| `src/components/BrewScreen.jsx` | 2 | Add `steps` field to buildBrewRecord |
| `src/components/BrewHistory.jsx` | 3 | Same-bean diff comparison |
| `src/components/BrewForm.jsx` | 4 | Fix rating null handling |
| `src/data/storage.js` | 5 | Write error handling |
| `docs/plans/2026-03-02-refactor-foundation-stabilization-plan.md` | 7 | Mark Phase 5 complete |

## Deferred Items (Not in Scope)

These SpecFlow gaps are real but not blocking for acceptance. They should become standalone todos:

- **Rate phase navigation guard (Gap 14)** — Low severity since brew is already saved
- **Rate phase crash recovery UX — no confirm dialog (Gap 17)** — Works correctly, just silently
- **Grinder-aware trend filtering (Gap 12)** — BrewTrends enhancement, not a bug
- **Export format versioning (Gap 15)** — Nice-to-have for future import compatibility
- **parseTime malformed input (Gap 3)** — Edge case in manual time entry, low probability

## References

- Parent plan: `docs/plans/2026-03-02-refactor-foundation-stabilization-plan.md`
- Brainstorm: `docs/brainstorms/2026-03-02-foundation-stabilization-brainstorm.md`
- Review findings (resolved): `todos/047-complete-p1-*.md` through `todos/058-complete-p3-*.md`
- 8 pre-existing P3 todos remain in `todos/` (unrelated to Phase 5)
