---
status: pending
priority: p3
issue_id: "088"
tags: [code-review, performance, recipe-entity]
dependencies: []
---

# Double recipes.find() in BrewHistory

## Problem Statement

BrewHistory.jsx calls `recipes.find(r => r.id === brew.recipeId)` twice for the same brew — once in the conditional check and once to extract `.name`. The guard result is discarded.

## Findings

- BrewHistory.jsx ~lines 614-619: guard `recipes?.find(...)` then display `recipes.find(...).name`
- Only runs for expanded cards (guarded by `isExpanded`), so impact is minimal
- Easy fix: extract to variable

## Proposed Solutions

### Option A: Extract to variable
```js
const recipeName = recipes?.find(r => r.id === brew.recipeId)?.name
{recipeName && (<div>...</div>)}
```
- **Effort:** Small (3 lines)
