---
status: pending
priority: p3
issue_id: "089"
tags: [code-review, react-patterns, recipe-entity]
dependencies: ["076"]
---

# IIFE in JSX for Save to Recipe Button

## Problem Statement

The "Save changes to recipe" button visibility in RecipeAssembly uses an immediately-invoked function expression (IIFE) inside JSX. No other component in the codebase uses this pattern. The idiomatic approach is to compute visibility before the JSX return.

## Findings

- BrewScreen.jsx RecipeAssembly ~lines 773-796: IIFE `(() => { ... })()`
- Runs on every render (no memoization)
- Could be a derived boolean computed before JSX return

## Proposed Solutions

### Option A: Extract to derived variable before return
Compute `recipeHasChanges` boolean before JSX, render conditionally.
- **Effort:** Small
