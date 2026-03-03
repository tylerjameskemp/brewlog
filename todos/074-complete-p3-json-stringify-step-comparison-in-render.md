---
status: complete
priority: p3
issue_id: "074"
tags: [code-review, performance, render-path]
dependencies: []
---

# JSON.stringify Step Comparison in RecipeAssembly Render Path

## Problem Statement

RecipeAssembly uses `JSON.stringify` to compare step arrays for detecting recipe changes (showing "recipe changed" indicator). This runs on every render, serializing the full steps array. For typical recipes (3-5 steps) this is negligible, but it's an anti-pattern that could become a problem with complex recipes.

## Proposed Solutions

### Option A: Use useMemo with field-level comparison
Same pattern as the stepsChanged optimization already done in BrewHistory (Phase 4 review fix).
- **Effort:** Small
- **Risk:** Low
