---
status: complete
priority: p2
issue_id: "011"
tags: [code-review, react, performance, brew-phases]
dependencies: []
---

# Consolidate double setForm in handleBeanNameChange

## Problem Statement

`handleBeanNameChange` calls `update('beanName', newName)` (which calls `setForm`) and then immediately calls `setForm` again with the pre-fill values. While React 18 batches these within event handlers, the second `setForm` overwrites the first — making the `update()` call redundant and confusing.

## Findings

- **Source**: pattern-recognition-specialist, code-simplicity-reviewer agents
- **Location**: `src/components/BrewForm.jsx` — `handleBeanNameChange` function
- **Impact**: Wasteful double state update, confusing code intent
- **Severity**: P2 — correctness is fine due to batching, but code clarity suffers

## Proposed Solutions

### Option A: Single setForm call (Recommended)
- Remove the `update('beanName', newName)` call
- Include `beanName: newName` in the single `setForm` call
- For the no-match path, call `setForm(prev => ({ ...prev, beanName: newName }))` directly
- **Pros**: Clearer intent, single state update
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] `handleBeanNameChange` only calls `setForm` once per invocation
- [ ] Bean name updates correctly in both match and no-match paths
- [ ] Pre-fill still works when a matching bean is found
