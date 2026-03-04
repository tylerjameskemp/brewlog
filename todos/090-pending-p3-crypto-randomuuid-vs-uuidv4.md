---
status: pending
priority: p3
issue_id: "090"
tags: [code-review, consistency, recipe-entity]
dependencies: []
---

# crypto.randomUUID() vs uuidv4() Inconsistency

## Problem Statement

Recipe code uses `crypto.randomUUID()` for ID generation while the rest of the codebase uses `uuidv4()` from the `uuid` package. Both produce valid v4 UUIDs but the inconsistency is a style concern.

## Findings

- storage.js ~line 239 and ~line 491: `crypto.randomUUID()`
- BrewScreen.jsx buildBrewRecord ~line 1527: `uuidv4()`
- `uuid` package is already a dependency

## Proposed Solutions

### Option A: Switch to uuidv4() for consistency
Replace `crypto.randomUUID()` with `uuidv4()` in recipe functions.
- **Effort:** Small (2-line change)

### Option B: Switch everything to crypto.randomUUID()
Remove `uuid` dependency, use native API everywhere. Supported in all modern browsers.
- **Effort:** Medium (find-and-replace across codebase)
