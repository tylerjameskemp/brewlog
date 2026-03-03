---
title: "Dual brew format unification via schema V2 migration"
category: logic-errors
module: data layer
tags: [migration, schema, localStorage, data-unification, normalizeSteps]
severity: P2
symptoms:
  - "Two coexisting brew record formats cause rendering inconsistencies"
  - "Legacy field names (label, startTime, targetWater) mixed with new format (name, time, waterTo)"
  - "Edit form overwrites fields it doesn't manage"
date_fixed: 2026-03-03
pr: null
related: [edit-form-overwrites-fields-it-doesnt-manage]
---

# Dual brew format unification via schema V2 migration

## Problem

The app had two coexisting brew record formats that required every consumer to handle both:

1. **Legacy BrewForm format** -- steps stored as `{ label, startTime, targetWater, note }`. No `stepResults`, `timeStatus`, or `nextBrewChanges` fields.
2. **BrewScreen format** (`brewScreenVersion: 1`) -- steps stored as `{ id, name, waterTo, time, duration, note }`. Includes `stepResults`, `timeStatus`, `nextBrewChanges`, `pourTemplateId`.

This caused three classes of bugs:

- **Rendering inconsistencies**: BrewHistory had to branch on format detection to display steps. A local `normalizeSteps()` copy diverged from the canonical version in storage.js.
- **Silent data loss on edit**: BrewForm spread `...form` on save, overwriting BrewScreen-only fields (`stepResults`, `timeStatus`) with initialized defaults. See `edit-form-overwrites-fields-it-doesnt-manage.md`.
- **Consumer complexity**: Every component reading steps had to check for both `label`/`name` and `startTime`/`time` field names, with fallback chains that were easy to get wrong.

## Investigation

Grepping for both field name sets revealed the split:

- `step.label` / `step.startTime` / `step.targetWater` -- used in StepEditor, BrewForm, BrewHistory (legacy path)
- `step.name` / `step.time` / `step.waterTo` -- used in BrewScreen, ActiveBrew, PostBrewCommit

BrewHistory had its own local `normalizeSteps()` that only validated the array shape but did not convert field names -- a copy that diverged from the canonical version in `storage.js` (documented in `duplicated-computation-diverges-over-time.md`).

## Root Cause

BrewScreen was added as a new guided flow alongside the existing BrewForm, using better field names for its step model. No migration was written to unify the two formats, so the data layer accumulated brews in both schemas. Each new consumer had to decide which format to support or handle both, compounding the maintenance burden.

## Solution

Four coordinated changes, applied as a single phase:

### 1. `migrateToSchemaV2()` in `src/data/storage.js`

Idempotent migration that runs once per brew record. Follows the existing migration pattern (synchronous, in App.jsx lazy initializer).

```js
export function migrateToSchemaV2() {
  const raw = localStorage.getItem(STORAGE_KEYS.BREWS)
  if (!raw) return getBrews()
  const brews = JSON.parse(raw)

  // Pre-migration backup (write-once)
  if (!localStorage.getItem('brewlog_brews_backup_v1')) {
    localStorage.setItem('brewlog_brews_backup_v1', raw)
  }

  brews.forEach(b => {
    if (b.schemaVersion >= 2) return  // idempotency guard

    if (b.brewScreenVersion === 1) {
      // BrewScreen brews -- already in new step format
      b.isManualEntry = false
      b.recipeSnapshot = b.recipeSnapshot ?? null
      b.schemaVersion = 2
      delete b.brewScreenVersion
    } else {
      // Legacy BrewForm brews -- convert steps, set null placeholders
      b.recipeSteps = normalizeSteps(b.recipeSteps)
      b.steps = normalizeSteps(b.steps)
      b.stepResults = null
      b.timeStatus = null
      b.nextBrewChanges = null
      b.pourTemplateId = null
      b.isManualEntry = true
      b.recipeSnapshot = null
      b.schemaVersion = 2
    }
  })
  // ... write back, return getBrews()
}
```

Key design decisions:

- **`schemaVersion: 2`** as idempotency guard -- safe to re-run, skips already-migrated records.
- **Pre-migration backup** in `brewlog_brews_backup_v1` -- write-once (does not overwrite an existing backup). Provides rollback path.
- **`isManualEntry` flag** -- replaces `brewScreenVersion` as the discriminator between BrewForm and BrewScreen brews. Boolean is clearer than checking for the absence of a version number.
- **Null placeholders** for V2-only fields on legacy brews (`stepResults`, `timeStatus`, etc.) -- consumers can check for null without worrying about `undefined` vs missing key.
- **Migration chain order**: `migrateGrindSettings()` -> `seedDefaultPourTemplates()` -> `migrateBloomToSteps()` -> `migrateToSchemaV2()`. The V2 migration runs last so it can operate on brews that `migrateBloomToSteps()` already processed.

### 2. Consolidated `normalizeSteps()`

Removed the local copy from BrewHistory.jsx. All consumers now import the canonical version from `storage.js`, which handles:

- Null/undefined/empty array -> returns `[]`
- Non-array input -> returns `[]`
- Already in new format (detected by `steps[0].name !== undefined`) -> returns as-is
- Legacy format -> maps `label` -> `name`, `startTime` -> `time`, `targetWater` -> `waterTo`, computes `duration` from adjacent step times

### 3. Unified rendering in BrewHistory

BrewHistory now reads only unified field names (`step.name`, `step.waterTo`, `step.time`) since all brews pass through `normalizeSteps()` at migration time. No more format-branching in the render path.

### 4. BrewForm edit save preserves V2 fields

When editing an existing brew, BrewForm explicitly carries forward all V2 fields it does not manage:

```js
updateBrew(editBrew.id, {
  // ... form fields ...
  stepResults: editBrew.stepResults,
  timeStatus: editBrew.timeStatus,
  schemaVersion: editBrew.schemaVersion,
  isManualEntry: editBrew.isManualEntry,
  pourTemplateId: editBrew.pourTemplateId,
  nextBrewChanges: editBrew.nextBrewChanges,
  recipeSnapshot: editBrew.recipeSnapshot,
})
```

New brews created via BrewForm also get full V2 fields:

```js
const brew = {
  // ... form fields ...
  schemaVersion: 2,
  isManualEntry: true,
  stepResults: null,
  timeStatus: null,
  nextBrewChanges: null,
  pourTemplateId: null,
  recipeSnapshot: null,
}
```

## Prevention

1. **Single schema, one migration.** When introducing new fields, write a migration that backfills existing records with sensible defaults (usually `null`). Do not leave consumers to handle both "field exists" and "field missing" cases indefinitely.
2. **One canonical normalizer.** Format conversion logic must live in exactly one place (storage layer). If a consumer needs format detection, import the function -- never copy it.
3. **Explicit field preservation on edit save.** When an edit form does not manage certain fields, the save path must explicitly carry forward the original values. Use refs to track which fields were actually modified (see `edit-form-overwrites-fields-it-doesnt-manage.md`).
4. **Idempotency via version field.** Use a monotonic `schemaVersion` integer as the migration guard. Checking for the absence of legacy fields is fragile -- a version number is unambiguous.
5. **Pre-migration backup.** Write-once backup keyed by version (e.g., `brewlog_brews_backup_v1`) gives users a rollback path without complicating the migration logic.

## Affected Files

| File | Change |
|------|--------|
| `src/data/storage.js` | Added `migrateToSchemaV2()`. `normalizeSteps()` is now the single canonical source. |
| `src/App.jsx` | Added `migrateToSchemaV2` to import and to the lazy initializer migration chain. |
| `src/components/BrewHistory.jsx` | Removed local `normalizeSteps()`. Imports canonical version from storage.js. Rendering uses unified field names. |
| `src/components/BrewForm.jsx` | Edit save explicitly preserves V2 fields. New brew save includes full V2 field set. Imports `normalizeSteps` from storage.js. |
| `src/components/StepEditor.jsx` | Uses unified field names (`name`, `time`, `waterTo`) throughout. |
| `src/data/__tests__/migration.test.js` | 9 test cases covering: legacy brew migration, BrewScreen migration, idempotency, hybrid brews, edge cases (empty array, missing key, bloom-only), backup creation/preservation, mixed-format batch. |
