---
status: complete
priority: p1
issue_id: "024"
tags: [code-review, brewscreen, bug]
---

# "Changes for Next Brew" Notes Never Show for Picker-Selected Beans

## Problem Statement

The `changes` state in BrewScreen (line 983-988) is computed once via `useState` lazy initializer. When a user selects a bean from the BeanPicker (Phase 0), `handleBeanSelect` updates `selectedBean` and `recipe` but does NOT update `changes`. The "Notes from last brew" card in RecipeAssembly will always be empty for beans selected through the in-flow picker.

This only works when navigating from BeanLibrary's "Brew this bean" button (which passes `initialBean`).

## Findings

- BrewScreen.jsx:983-988: `const [changes] = useState(() => { ... })` — lazy init, never updated
- BrewScreen.jsx:991-1008: `handleBeanSelect` updates `selectedBean` and `recipe` but not `changes`
- The "changes for next brew" feature is a key differentiator per the spec

## Proposed Solutions

### Option A: Use useMemo keyed on selectedBean
```js
const changes = useMemo(() => {
  if (!selectedBean) return []
  const changesStr = getChangesForBean(selectedBean.name)
  if (!changesStr) return []
  return changesStr.split('\n').filter(s => s.trim())
}, [selectedBean])
```
- Pros: Clean, reactive, minimal code
- Cons: None
- Effort: Small

### Option B: Set changes inside handleBeanSelect
- Add `setChanges(...)` call inside `handleBeanSelect`
- Pros: Explicit
- Cons: Requires converting `changes` from `useState(() => ...)` to `useState([])`
- Effort: Small

## Acceptance Criteria

- [ ] Selecting a bean from BeanPicker shows "Notes from last brew" if the previous brew had `nextBrewChanges`
- [ ] Selecting a bean via "Brew this bean" from BeanLibrary still works

## Work Log

- 2026-02-27: Identified during code review
