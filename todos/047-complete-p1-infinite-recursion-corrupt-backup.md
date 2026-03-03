---
status: complete
priority: p1
issue_id: "047"
tags: [code-review, data-integrity, migration, storage]
dependencies: []
---

# Infinite recursion in migrateToSchemaV2 when backup is corrupt

## Problem Statement

If both the main brews data AND the backup (`brewlog_brews_backup_v1`) contain corrupted JSON, `migrateToSchemaV2()` enters an infinite recursion loop that crashes the app with a stack overflow. The app becomes permanently unusable until the user manually clears localStorage.

## Findings

In `src/data/storage.js` lines 246-249, the corrupted JSON recovery path:

```js
} catch {
  const backup = localStorage.getItem(STORAGE_KEYS.BACKUP_V1)
  if (backup) {
    localStorage.setItem(STORAGE_KEYS.BREWS, backup)
    return migrateToSchemaV2()  // recursive call
  }
  return getBrews()
}
```

The flow: parse fails → backup exists → restore backup to BREWS key → call self recursively → parse fails again on same corrupt data → backup still exists → infinite loop.

**Agents that flagged this:** Data Integrity Guardian (HIGH), Architecture Strategist (noted)

## Proposed Solutions

### Option A: Validate backup before restoring + remove after use
```js
} catch {
  const backup = localStorage.getItem(STORAGE_KEYS.BACKUP_V1)
  if (backup) {
    try {
      JSON.parse(backup) // validate it parses
      localStorage.setItem(STORAGE_KEYS.BREWS, backup)
      localStorage.removeItem(STORAGE_KEYS.BACKUP_V1) // prevent re-entry
      return migrateToSchemaV2()
    } catch {
      // Backup also corrupt — fall through
    }
  }
  return getBrews()
}
```
- **Pros:** Eliminates recursion risk entirely. Also cleans up stale backup.
- **Cons:** None.
- **Effort:** Small (5 lines changed)

## Technical Details

- **Affected files:** `src/data/storage.js`
- **Test needed:** Add test case for both main + backup corrupt JSON

## Acceptance Criteria

- [ ] No infinite recursion when both brews and backup contain invalid JSON
- [ ] Test covers the double-corruption scenario
- [ ] App gracefully returns empty brews array on total data loss
