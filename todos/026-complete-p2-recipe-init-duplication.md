---
status: complete
priority: p2
issue_id: "026"
tags: [code-review, brewscreen, duplication]
---

# Recipe Initialization Logic Duplicated in Two Places

## Problem Statement

The recipe-building logic (fetching last brew, normalizing steps, building recipe object with defaults) is duplicated between the `useState` lazy initializer (lines 963-979) and the `handleBeanSelect` callback (lines 991-1007). Any change to defaults or fields must be made in two places.

## Proposed Solutions

Extract a `buildRecipeFromBean(beanName, equipment, templates)` function and call from both sites.

## Acceptance Criteria

- [ ] Single function builds recipe from bean name
- [ ] Both init path and bean-select path use same function

## Work Log

- 2026-02-27: Identified during code review
