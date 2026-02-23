---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, security, resilience]
dependencies: []
---

# Add try/catch to getUIPref and setUIPref JSON.parse calls

## Problem Statement

The new `getUIPref` and `setUIPref` functions call `JSON.parse(data)` without error handling. If localStorage contains malformed JSON under the `brewlog_ui_prefs` key (manual tampering, corruption, browser extension), `JSON.parse` will throw an unhandled exception. Since `getUIPref` is called during `useState` initialization in BrewHistory, this would crash the entire History tab with no recovery path.

## Findings

- **Security reviewer**: Low severity but only actionable finding -- unguarded JSON.parse can crash the History tab
- **Note**: The same pattern (unguarded JSON.parse) exists in pre-existing `getBrews()`, `getEquipment()`, `getBeans()` but those are outside this PR's scope

**Location**: `src/data/storage.js`, lines 111-122

## Proposed Solutions

### Solution A: Wrap in try/catch with fallback (Recommended)

```js
export function getUIPref(key) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UI_PREFS)
    const prefs = data ? JSON.parse(data) : {}
    return prefs[key] ?? null
  } catch {
    return null
  }
}

export function setUIPref(key, value) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UI_PREFS)
    const prefs = data ? JSON.parse(data) : {}
    prefs[key] = value
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify(prefs))
  } catch {
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify({ [key]: value }))
  }
}
```

- Effort: Small (5 min)
- Risk: None
- Pros: Prevents crash, self-heals corrupted data
- Cons: None

## Recommended Action

Solution A.

## Technical Details

**Affected files:**
- `src/data/storage.js` (lines 111-122)

## Acceptance Criteria

- [ ] Corrupted JSON in `brewlog_ui_prefs` does not crash any component
- [ ] `getUIPref` returns `null` on parse failure
- [ ] `setUIPref` resets corrupted prefs and writes the new value

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by security reviewer |

## Resources

- PR #7: feat(ux): Improve empty states and first-time experience
