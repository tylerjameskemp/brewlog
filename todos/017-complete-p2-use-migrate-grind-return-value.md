---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, performance, storage]
dependencies: []
---

# Use `migrateGrindSettings()` Return Value

## Problem Statement

In `App.jsx`, `migrateGrindSettings()` already reads, migrates, and saves brews — then the return value is discarded. Immediately after, `getBrews()` re-reads the same data from localStorage. This is a redundant parse of potentially large JSON data.

Found by 3/5 review agents (architecture, performance, simplicity).

## Findings

- `App.jsx:30-33` — `migrateGrindSettings()` is called inside the lazy initializer for brews state, but its return value is ignored
- `migrateGrindSettings()` in `storage.js` returns the (possibly migrated) brews array
- `getBrews()` is then called separately, re-parsing the same localStorage key

```jsx
// Current (wasteful):
const [brews, setBrews] = useState(() => {
  migrateGrindSettings()
  return getBrews()
})

// Fixed:
const [brews, setBrews] = useState(() => {
  return migrateGrindSettings()
})
```

## Proposed Solutions

### Solution A: Use return value directly (Recommended)

Replace `migrateGrindSettings(); return getBrews()` with `return migrateGrindSettings()`.

**Pros:** Eliminates redundant localStorage parse, 1-line fix
**Cons:** Couples init to migration function's return type
**Effort:** Small (< 5 min)
**Risk:** None — both return sorted brews array

## Technical Details

**Affected files:** `src/App.jsx`
**Location:** Lines 30-33, brews state lazy initializer

## Acceptance Criteria

- [ ] `getBrews()` no longer called separately after `migrateGrindSettings()`
- [ ] Brews state still correctly initialized with sorted array
- [ ] App loads correctly with and without migration-eligible data

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-25 | Found during code review | Migration function already returns what we need |

## Resources

- `src/App.jsx:30-33`
- `src/data/storage.js` — `migrateGrindSettings()` implementation
