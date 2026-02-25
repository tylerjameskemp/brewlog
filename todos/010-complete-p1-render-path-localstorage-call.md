---
status: complete
priority: p1
issue_id: "010"
tags: [code-review, performance, react, brew-phases]
dependencies: []
---

# Fix getLastBrewOfBean() called in JSX render path

## Problem Statement

In `BrewForm.jsx`, `getLastBrewOfBean()` is called inside an IIFE in the JSX render path (the "last brew" summary section near the save button). This parses localStorage JSON on every single render cycle — any state change triggers a re-render, which triggers a localStorage read.

## Findings

- **Source**: performance-oracle, architecture-strategist agents
- **Location**: `src/components/BrewForm.jsx` — the last-brew summary section near save button
- **Impact**: Performance degradation on every keystroke, toggle, or state change. localStorage.getItem + JSON.parse is synchronous and blocks the main thread.
- **Severity**: P1 — this is a hot path that fires on every render

## Proposed Solutions

### Option A: Cache in state via handleBeanNameChange (Recommended)
- Store the bean-specific brew object in a state variable (e.g., `lastBeanBrew`)
- Update it inside `handleBeanNameChange` when the bean name changes
- Reference the state variable in JSX instead of calling the function
- **Pros**: Zero render-path overhead, simple
- **Cons**: Need to clear it when bean name is emptied
- **Effort**: Small
- **Risk**: Low

### Option B: useMemo with beanName dependency
- Wrap the call in `useMemo(() => getLastBrewOfBean(form.beanName), [form.beanName])`
- **Pros**: Only recalculates when beanName changes
- **Cons**: Still calls localStorage on beanName changes (but that's acceptable)
- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] `getLastBrewOfBean` is NOT called during render
- [ ] Bean-specific last brew info still displays correctly near save button
- [ ] No localStorage reads in the JSX return path
