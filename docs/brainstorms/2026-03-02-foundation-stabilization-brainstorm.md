# BrewLog Foundation Stabilization — Brainstorm

**Date:** 2026-03-02
**Status:** Ready for planning
**Next step:** `/workflows:plan`

---

## What We're Building

A moderate restructuring of BrewLog that fixes the current bugs and data inconsistencies while establishing a clean separation between "what you planned" (recipe) and "what actually happened" (brew session). Not a rewrite — targeted structural improvements to the existing working codebase.

## Why This Approach

The codebase is in better shape than initial diagnosis suggested. The storage layer is centralized (28 functions, no direct localStorage access from components). BrewScreen already has crash recovery, auto-save during brewing, navigation guards, and a guided flow. The problems are specific and fixable:

- Two brew creation paths produce different data shapes into the same array
- Two step formats coexist with no clean write-time conversion
- "Finish Brew" doesn't actually save — requires a separate "Commit" step that creates a data-loss window
- CLAUDE.md documents ~60% of the app (BrewScreen era is missing)
- Equipment is global but should be per-recipe
- No tests exist

A full 4-entity TypeScript rewrite (as proposed in the external stabilization plan) would rebuild working code to match a spec written without seeing the actual codebase. Too much risk, too much scope. A targeted fix-only approach would leave the root structural issue (plan vs. reality mixed in one record) unsolved. This middle path fixes the bugs AND establishes the right data boundaries.

## Key Decisions

### 1. Plan vs. Reality Separation

Every brew stores two layers:
- **Recipe snapshot** — what you intended (grind, dose, water, temp, target time, step plan, equipment)
- **Actual session** — what happened (actual grind, actual time, step results, deviations)

The snapshot is captured when the brew starts. Post-brew, the user can correct actuals without losing what was planned. History can show planned vs. actual comparisons.

### 2. Post-Brew Flow

**Finish Brew** auto-saves the record immediately (no more Commit step). Then transitions to a dedicated "Rate This Brew" screen with three sections:

1. **Correct the record** — edit grind, time, steps if reality deviated from plan
2. **Tasting notes** — flavors, body, rating, issues, notes (exists today)
3. **What to try next** — separate field, saved as a note that surfaces next time you brew this bean

### 3. Recipe Pre-fill

- New brew of same bean pre-fills from last brew's **actual** values (current behavior continues)
- New option: "Revert to template" loads the original pour template instead of last brew
- "What to try next" notes from last brew surface on recipe screen as a reminder

### 4. Equipment = Inventory + Per-Recipe Selection

- **Equipment setup** becomes an inventory of what you own (multiple drippers, grinders, etc.)
- **Each recipe** includes which equipment from the inventory is being used
- **Default UX**: compact equipment summary in recipe assembly. Tap to expand and change.
- **Per-brew tracking**: equipment choice is stored on each brew record for future analysis (e.g., compare V60 vs Kalita Wave for the same bean)

### 5. Single Brew Creation Path

- All new brews go through BrewScreen (guided flow)
- Add a "skip timer" option for logging past brews without the timer
- BrewForm becomes edit-only (for editing old brews from History)

### 6. Data Unification

- One canonical brew record shape (not two divergent shapes from BrewForm vs BrewScreen)
- One step format: `{ id, name, waterTo, time, duration, note }` (the BrewScreen format wins)
- Migration function converts existing legacy brews to the unified format
- `normalizeSteps()` runs on write (not just on read) to prevent format drift

### 7. Acceptance Criteria

Binary test — both must pass:
1. Brew a full cup with a **new bean**: bean selection → recipe → brew with timer → finish → rate → appears correctly in history
2. Brew a full cup with a **returning bean**: pre-fills from last brew → recipe tweaks → brew → finish → rate → history shows correct same-bean comparison
3. **Edit a past brew** from History: open → edit fields → save → no data loss or corruption

## Open Questions

1. **Equipment inventory scope**: Does the inventory need to support multiple items per category now (e.g., two grinders), or is "one per category, changeable per-recipe" enough for this sprint?
2. **Water documentation**: Tyler mentioned tracking water changes. What level of detail? Just "filtered/unfiltered" or specific mineral content?
3. **Skip-timer UX**: When logging a past brew without the timer, which fields are required vs. optional? (You won't have step-by-step timing data.)
4. **Legacy BrewForm brews in history**: After migration, should old brews (created via BrewForm, no step results) display differently in history, or just show what data they have?

## What This Does NOT Include

- TypeScript conversion (not needed — the data boundaries can be enforced with good conventions and tests)
- Backend / database (future concern — localStorage is fine for single-user)
- Roaster platform / social sharing / recipe requests (future vision — don't block, don't build)
- AI brewing coach (future feature)
- PWA conversion (future feature)

## Context for Planning

### Current Codebase State (from repo analysis)
- 13 components, 2 hooks, ~5,500 lines total
- BrewScreen.jsx is 1,348 lines with 5 inline sub-components
- storage.js has 28 exported functions, all localStorage access centralized
- 6 localStorage keys (not 4 as CLAUDE.md states)
- 39 tracked todos (33 complete, 6 pending P3s)
- 18 plan documents, 15 solution documents
- No tests, no test framework configured

### CLAUDE.md Gaps (must be updated before implementation)
- BrewScreen.jsx not documented (largest component)
- useTimer.js and useWakeLock.js hooks not documented
- Pour Template entity not documented
- Active Brew persistence not documented
- Dual step formats not documented
- Dual brew creation paths not documented
- Equipment field name mismatch (docs say `method`, code says `brewMethod`)
- localStorage key count wrong (says 4, actually 6)
- Todo count wrong (says 9, actually 39)

### Files Most Likely to Change
- `src/data/storage.js` — add recipeSnapshot logic, unify brew shapes, step format migration
- `src/components/BrewScreen.jsx` — merge Finish/Commit, add skip-timer mode, equipment per-recipe
- `src/components/BrewForm.jsx` — scope down to edit-only
- `src/components/BrewHistory.jsx` — support planned-vs-actual display, same-bean filtering
- `src/components/EquipmentSetup.jsx` — evolve toward inventory model
- `src/data/defaults.js` — equipment inventory structure
- `CLAUDE.md` — full update to document current app
