---
status: complete
priority: p2
issue_id: "065"
tags: [code-review, data-integrity, migration, import]
dependencies: []
---

# Import Doesn't Run Full Migration Chain After Import

## Problem Statement

`importData` and `mergeData` in `storage.js` write directly to localStorage without running the migration chain (`migrateGrindSettings → seedDefaultPourTemplates → migrateBloomToSteps → migrateToSchemaV2`). If a user imports a V1-format export file, the imported brews will have legacy format and never get migrated until the app is restarted (migrations run in App.jsx init).

## Findings

- `importData` (replace mode): overwrites all localStorage keys, invalidates cache, but doesn't run migrations
- `mergeData` (merge mode): same — no migration call
- Migrations only run in `App.jsx` lazy initializer: `useState(() => { ... migrateToSchemaV2() ... })`
- After import, the user sees the imported data immediately (from cache invalidation) — but legacy-format brews won't have `schemaVersion: 2` until next app restart
- BrewHistory and BrewScreen use `normalizeSteps` to handle both formats, so rendering works — but `getDiff` and other logic may behave differently with unmigrated data

## Proposed Solutions

### Option A: Run migration chain after import/merge
After `localStorage.setItem`, call `migrateToSchemaV2()` which chains through all migrations.
- **Pros:** Imported data is immediately in latest format
- **Cons:** Slight delay on large imports
- **Effort:** Small
- **Risk:** Low (migrations are idempotent)

### Option B: Trigger page reload after import
`window.location.reload()` — migrations run on init.
- **Pros:** Simplest fix, guaranteed fresh state
- **Cons:** Disruptive UX
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A.

## Technical Details

**Affected files:** `src/data/storage.js` (importData, mergeData)

## Acceptance Criteria

- [ ] Importing a V1-format export results in V2-format brews
- [ ] Importing a V2-format export still works correctly
- [ ] Existing tests pass
