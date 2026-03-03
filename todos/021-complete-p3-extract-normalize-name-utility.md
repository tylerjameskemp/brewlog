---
status: pending
priority: p3
issue_id: "021"
tags: [code-review, duplication, utility]
dependencies: []
---

# Extract `normalizeName()` Utility

## Problem Statement

The pattern `name.trim().toLowerCase()` appears at 19 call sites across `storage.js`, `BrewForm.jsx`, and `BeanLibrary.jsx`. While each individual call is trivial, the repeated inline pattern risks inconsistency (e.g., someone forgetting `.trim()` or adding `.normalize()`).

## Proposed Solutions

### Solution A: Extract to storage.js

Add `export function normalizeName(name) { return (name || '').trim().toLowerCase() }` to `storage.js` (where most call sites live).

**Pros:** Single source of truth, null-safe, easy to enhance later
**Cons:** Many call sites to update
**Effort:** Medium (mechanical but many files)
**Risk:** None

### Solution B: Leave as-is

The pattern is simple and well-established. 19 call sites isn't a crisis.

**Pros:** No churn
**Cons:** Slight inconsistency risk
**Effort:** None
**Risk:** Low

## Technical Details

**Affected files:** `src/data/storage.js`, `src/components/BrewForm.jsx`, `src/components/BeanLibrary.jsx`

## Acceptance Criteria

- [ ] Single `normalizeName()` function exported from `storage.js`
- [ ] All `trim().toLowerCase()` call sites updated
- [ ] Bean deduplication and rename cascade still work correctly
