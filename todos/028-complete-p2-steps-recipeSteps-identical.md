---
status: complete
priority: p2
issue_id: "028"
tags: [code-review, brewscreen, data-integrity]
---

# `steps` and `recipeSteps` Always Identical on BrewScreen Brews

## Problem Statement

BrewScreen commits save `recipeSteps: recipe.steps` and `steps: recipe.steps` — both identical. The existing codebase uses `steps` for "what actually happened" and `recipeSteps` for "the plan" (copy-on-write pattern). BrewHistory's diff view relies on differences between these fields to show step-level changes. BrewScreen brews will never show step diffs.

## Proposed Solutions

Either omit `steps` from BrewScreen brews (let consumers fall back to `recipeSteps`), or compute actual-execution steps from `stepResults` (filtering skipped, adjusting by variance).

## Acceptance Criteria

- [ ] BrewHistory comparison mode shows meaningful step diffs for BrewScreen brews

## Work Log

- 2026-02-27: Identified during code review
