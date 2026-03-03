---
status: complete
priority: p3
issue_id: "073"
tags: [code-review, duplication, utility]
dependencies: []
---

# Duplicate Ratio Computation Across Components

## Problem Statement

The brew ratio calculation (`waterGrams / coffeeGrams` formatted as "1:X.X") appears in BrewHistory, BrewScreen (RecipeAssembly), and BrewForm. Each does the same math inline. Should be a shared helper.

## Proposed Solutions

### Option A: Extract `formatRatio(coffeeGrams, waterGrams)` helper
- **Effort:** Small
- **Risk:** Low
