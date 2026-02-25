---
status: complete
priority: p3
issue_id: "015"
tags: [code-review, consistency, brew-phases]
dependencies: []
---

# Fix grindSetting fallback operator inconsistency

## Problem Statement

`grindSetting` uses `??` (nullish coalescing) in the bean pre-fill path but `||` (logical OR) in the initial state. `??` only falls back on null/undefined, while `||` falls back on any falsy value (including 0). If grindSetting is 0, the two paths behave differently.

## Findings

- **Source**: pattern-recognition-specialist agent
- **Location**: `src/components/BrewForm.jsx` — initial state vs `handleBeanNameChange`
- **Impact**: Edge case — grindSetting of 0 would be treated as "no value" by `||` but preserved by `??`
- **Severity**: P3 — unlikely to hit in practice (grind settings are typically 1+)

## Proposed Solutions

### Option A: Use `??` consistently (Recommended)
- Change `lastBrew?.grindSetting || 6` to `lastBrew?.grindSetting ?? 6` in the initial state
- **Pros**: Consistent behavior, correct for numeric fields
- **Cons**: None
- **Effort**: Trivial
- **Risk**: None

## Acceptance Criteria

- [ ] `grindSetting` uses `??` in both initial state and pre-fill paths
