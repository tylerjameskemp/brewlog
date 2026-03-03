---
status: complete
priority: p3
issue_id: "057"
tags: [code-review, duplication, defaults]
dependencies: []
---

# Add equipment display name lookup helpers to defaults.js

## Problem Statement

`BREW_METHODS.find(m => m.id === ...)?.name` and `GRINDERS.find(g => g.id === ...)?.name` appear 5+ times each across 3 files (BrewScreen, BrewHistory, BrewForm).

## Findings

**Agent:** Pattern Recognition (Medium, finding 2.3)

## Proposed Solutions

Add helpers to defaults.js:

```js
export const getMethodName = (id) => BREW_METHODS.find(m => m.id === id)?.name || id
export const getGrinderName = (id) => GRINDERS.find(g => g.id === id)?.name || id
```

- **Effort:** Small (2 new lines + ~10 lines of imports/replacements)

## Acceptance Criteria

- [ ] Lookup helpers exist in defaults.js
- [ ] All `BREW_METHODS.find(...)?.name` replaced with `getMethodName()`
