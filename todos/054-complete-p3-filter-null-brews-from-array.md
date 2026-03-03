---
status: complete
priority: p3
issue_id: "054"
tags: [code-review, data-integrity, storage]
dependencies: []
---

# Filter null elements from brews array in getBrews()

## Problem Statement

Null elements can exist in the brews array (from corrupted data or import issues). The migration preserves them, and `getBrews()` does not filter them out. Downstream consumers could encounter null items and crash on property access.

## Findings

**Agents:** Data Integrity Guardian (LOW, 1.2), Architecture Strategist (Medium, 5.3)

## Proposed Solutions

Add `.filter(b => b != null)` to `getBrews()`:

```js
brews = JSON.parse(data).filter(b => b != null)
```

- **Effort:** Small (1 line)

## Acceptance Criteria

- [ ] `getBrews()` never returns null elements
- [ ] Null elements in localStorage are silently stripped on read
