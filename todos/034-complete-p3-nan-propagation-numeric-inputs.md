---
status: complete
priority: p3
issue_id: "034"
tags: [code-review, brewscreen, input-validation]
---

# NaN Propagation from Recipe Numeric Inputs

## Problem Statement

RecipeAssembly's `updateField` uses `Number(e.target.value)` without NaN guard. If pasted non-numeric text reaches the input, `NaN` propagates into the recipe state, ratio display, and committed brew record. Could break trend charts.

## Proposed Solutions

Guard with: `const num = Number(value); setRecipe(prev => ({ ...prev, [field]: isNaN(num) ? prev[field] : num }))`

## Work Log

- 2026-02-27: Identified during code review
