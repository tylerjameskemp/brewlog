---
status: complete
priority: p2
issue_id: "029"
tags: [code-review, brewscreen, dead-code]
---

# `onCommit` Prop Passed to PostBrewCommit But Never Called

## Problem Statement

`PostBrewCommit` receives `onCommit` in its props (line 668) and the parent passes a cleanup callback (line 1088), but `onCommit` is never invoked. The cleanup logic (`setPhase('pick')`, `setBrewData(null)`, `setSelectedBean(null)`) never runs.

## Proposed Solutions

Either call `onCommit()` after successful commit (before or after showing success screen), or remove the prop entirely.

## Acceptance Criteria

- [ ] `onCommit` is either called or removed from the prop interface

## Work Log

- 2026-02-27: Identified during code review
