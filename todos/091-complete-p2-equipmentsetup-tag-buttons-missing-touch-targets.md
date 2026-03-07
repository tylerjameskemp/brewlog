---
status: complete
priority: p2
issue_id: "091"
tags: [code-review, touch-targets, accessibility, phase3-polish]
dependencies: []
---

# EquipmentSetup Tag Buttons Missing min-h-[44px] Touch Targets

## Problem Statement

Phase 3 touch target audit missed EquipmentSetup tag-select buttons. These interactive elements are below the 44px mobile minimum, inconsistent with the same pattern applied to BeanLibrary and BrewForm tag buttons.

## Findings

- `EquipmentSetup.jsx` lines ~153, ~198: tag-select buttons use `py-2.5` (~38px) without `min-h-[44px]`
- Same button pattern in BeanLibrary and BrewForm was fixed in Phase 3
- EquipmentSetup was listed in Phase 3 plan for label normalization but tag buttons were not in the touch target table

## Proposed Solutions

### Option A: Add min-h-[44px] to EquipmentSetup tag buttons
Add `min-h-[44px] flex items-center justify-center` to match the pattern used in BeanLibrary and BrewForm.
- **Effort:** Small (2 elements)
- **Risk:** None

## Acceptance Criteria

- [ ] All tag-select buttons in EquipmentSetup have `min-h-[44px]`
- [ ] Pattern matches BeanLibrary/BrewForm tag buttons
