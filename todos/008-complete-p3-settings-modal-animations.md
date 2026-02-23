---
status: complete
priority: p3
issue_id: "008"
tags: [code-review, consistency, animation]
dependencies: []
---

# Add entrance animations to SettingsMenu import modal

## Problem Statement

The EquipmentSetup and BeanFormModal both received `animate-fade-in` / `animate-scale-in` entrance animations, but the import confirmation modal in SettingsMenu was not updated, creating an inconsistency.

## Findings

- **Architecture reviewer**: P3 -- noted as follow-up for consistency
- **Pattern reviewer**: Low severity -- modal pattern inconsistency

**Location:** `src/components/SettingsMenu.jsx`, line 160

## Proposed Solutions

Add `animate-fade-in motion-reduce:animate-none` to the backdrop div and `animate-scale-in motion-reduce:animate-none` to the card div in SettingsMenu.

- Effort: Small (2 min)
- Risk: None

## Acceptance Criteria

- [ ] SettingsMenu import modal fades/scales in like other modals
- [ ] Animation respects prefers-reduced-motion

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-23 | Created | Identified by architecture and pattern reviewers |
