---
status: complete
priority: p1
issue_id: "061"
tags: [code-review, data-integrity, migration, error-handling]
dependencies: []
---

# Backup Write in migrateToSchemaV2 Not Wrapped in try/catch

## Problem Statement

In `migrateToSchemaV2()` at ~line 302, the backup write `localStorage.setItem(STORAGE_KEYS.BACKUP_V1, raw)` is outside the try/catch block. If localStorage is near quota when migration runs (app startup), this line throws an unhandled exception and crashes the app before any brews can load.

## Findings

- The backup is written before migration begins, as a safety net
- If quota is exceeded at backup time, the entire migration throws and `getBrews()` never returns
- App.jsx init calls this synchronously — an unhandled throw here means the app renders with no brews and possibly a white screen
- The actual migration writes (line ~320) are also not in try/catch but are less likely to fail since they overwrite existing data (same key, similar size)

## Proposed Solutions

### Option A: Wrap backup write in try/catch, skip backup if it fails
```javascript
try {
  localStorage.setItem(STORAGE_KEYS.BACKUP_V1, raw)
} catch {
  console.warn('Could not create V1 backup (storage quota?)')
}
```
Migration proceeds without backup. Acceptable because migration is idempotent.
- **Pros:** Simple, migration still runs
- **Cons:** No backup on failure (acceptable since migration is idempotent)
- **Effort:** Small
- **Risk:** Low

### Option B: Wrap entire migration in try/catch, return original brews on failure
- **Pros:** Bulletproof — migration failure never crashes the app
- **Cons:** User stays on V1 format forever if migration keeps failing
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A + Option B combined — wrap backup in its own try/catch, AND wrap the full migration in an outer try/catch that returns the original parsed brews on failure.

## Technical Details

**Affected files:** `src/data/storage.js` (migrateToSchemaV2, ~line 300-330)

## Acceptance Criteria

- [ ] App does not crash if localStorage is full when migration runs
- [ ] Migration still completes when backup write fails
- [ ] Existing migration tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-03 | Created from Phase 5 code review | Data integrity agent flagged this |

## Resources

- Migration function: `src/data/storage.js:~300`
