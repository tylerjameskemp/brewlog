---
status: pending
priority: p3
issue_id: "087"
tags: [code-review, performance, recipe-entity]
dependencies: ["083"]
---

# Hoist getRecipeDefaults() in onRecipeSelect

## Problem Statement

The `onRecipeSelect` inline handler calls `getRecipeDefaults()` 4 separate times for fallback values. Each call creates a new object and scans `BREW_METHODS` array. One call suffices.

## Findings

- BrewScreen.jsx ~lines 1738-1747: `getRecipeDefaults().targetTime`, `.method`, `.grinder`, `.dripper`, `.filterType`
- Each call allocates new object + Array.find scan
- Trivially fixable with `const defaults = getRecipeDefaults()` at top of handler

## Proposed Solutions

### Option A: Hoist to local variable
`const defaults = getRecipeDefaults()` at top of handler, reference `defaults.targetTime`, etc.
- **Effort:** Small (1-line variable, 4-line references)
