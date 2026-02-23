---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, consistency, css]
dependencies: []
---

# Standardize active:scale values across buttons

## Problem Statement

The PR introduces two different press-feedback intensities for buttons with similar visual weight:
- `active:scale-95` (5% shrink) on 3 buttons -- noticeably jumpy
- `active:scale-[0.98]` (2% shrink) on 5+ buttons -- subtle and polished

Some buttons with `active:scale-95` are also missing `transition-all`, causing the scale to snap instead of easing.

## Findings

- **Pattern reviewer**: Medium severity inconsistency
- Identified specific locations for both variants

**`active:scale-95` (without transition):**
- `src/App.jsx` line 81 -- "Set Up My Gear"
- `src/components/BrewHistory.jsx` line 177 -- "Log Your First Brew"
- `src/components/EquipmentSetup.jsx` line 96 -- "Start Brewing"

**`active:scale-[0.98]` (with transition):**
- `src/components/EquipmentSetup.jsx` lines 261, 272, 280 -- wizard navigation
- `src/components/BeanLibrary.jsx` lines 113, 474

## Proposed Solutions

### Solution A: Standardize to active:scale-[0.98] with transition-all (Recommended)
Replace all `active:scale-95` with `active:scale-[0.98]` and ensure `transition-all` is present.

- Effort: Small (5 min)
- Risk: None

## Acceptance Criteria

- [ ] All buttons use the same active:scale value
- [ ] All buttons with active:scale also have transition-all

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by pattern reviewer |
