---
status: complete
priority: p2
issue_id: "048"
tags: [code-review, security, storage, resilience]
dependencies: []
---

# Unguarded JSON.parse in getEquipment() and getBeans()

## Problem Statement

`getEquipment()` and `getBeans()` in storage.js lack try/catch around `JSON.parse()`. If localStorage data becomes corrupted, these functions throw unhandled exceptions that crash the entire React render tree (white screen). Other storage functions (`getBrews`, `getUIPref`, `getPourTemplates`, `getActiveBrew`) already have try/catch guards.

## Findings

```js
// Line 72 — no try/catch
export function getEquipment() {
  const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT)
  return data ? JSON.parse(data) : null
}

// Line 84 — no try/catch
export function getBeans() {
  const data = localStorage.getItem(STORAGE_KEYS.BEANS)
  return data ? JSON.parse(data) : []
}
```

**Agents that flagged this:** Security Sentinel (Medium)

## Proposed Solutions

Wrap both in try/catch, returning safe defaults on failure:

```js
export function getEquipment() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export function getBeans() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BEANS)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}
```

- **Effort:** Small (4 lines changed)

## Acceptance Criteria

- [ ] Both functions wrapped in try/catch
- [ ] App continues to work if equipment or beans localStorage is corrupted
