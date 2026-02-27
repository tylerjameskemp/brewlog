---
status: complete
priority: p3
issue_id: "033"
tags: [code-review, brewscreen, accessibility]
---

# Missing `motion-reduce` Guards on BrewScreen Transitions

## Problem Statement

BrewScreen uses CSS transitions extensively (`transition-all`, `transition-colors`, `transition-transform`) but only one instance (line 759, success screen) has `motion-reduce:animate-none`. The project convention per CLAUDE.md requires all animations to respect `prefers-reduced-motion`.

Affected locations: SwipeCards (line 57), dot indicators (line 71), PhaseIndicator (line 89), step cards (line 580), ActiveBrew background (line 502).

## Work Log

- 2026-02-27: Identified during code review
