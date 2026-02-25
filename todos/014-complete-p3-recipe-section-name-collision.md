---
status: complete
priority: p3
issue_id: "014"
tags: [code-review, ux, brew-phases]
dependencies: []
---

# Rename "Recipe" section to avoid collision with "Recipe" phase header

## Problem Statement

The Phase 1 header says "1. Recipe" and one of the collapsible sections underneath it is also named "Recipe". This creates a visual redundancy: "Recipe > Recipe".

## Findings

- **Source**: architecture-strategist, code-simplicity-reviewer agents
- **Location**: `src/components/BrewForm.jsx` — Phase 1 sections
- **Impact**: UX confusion — users see "Recipe" twice in the hierarchy
- **Severity**: P3 — cosmetic, but easy to fix

## Proposed Solutions

### Option A: Rename section to "Brew Parameters" or "Ratios"
- Change the collapsible section title from "Recipe" to something more specific
- **Pros**: Clearer hierarchy
- **Cons**: Minor naming bikeshed
- **Effort**: Small
- **Risk**: None

## Acceptance Criteria

- [ ] No duplicate "Recipe" labels in the form hierarchy
- [ ] Section name clearly describes its contents (dose, water, grind, temp, bloom)
