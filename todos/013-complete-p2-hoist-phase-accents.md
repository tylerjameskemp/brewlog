---
status: complete
priority: p2
issue_id: "013"
tags: [code-review, performance, react, brew-phases]
dependencies: []
---

# Hoist PhaseHeader accents object to module scope

## Problem Statement

The `accents` object inside `PhaseHeader` is recreated on every render. Since these are static Tailwind class mappings, they should be a module-level constant.

## Findings

- **Source**: performance-oracle, pattern-recognition-specialist agents
- **Location**: `src/components/BrewForm.jsx` — `PhaseHeader` component
- **Impact**: Minor — object allocation per render of PhaseHeader (rendered 3x per BrewForm render)
- **Severity**: P2 — easy fix, good practice

## Proposed Solutions

### Option A: Module-level constant (Recommended)
- Move `const PHASE_ACCENTS = { recipe: '...', brew: '...', tasting: '...' }` to module scope
- Reference it inside PhaseHeader
- **Pros**: Zero allocation per render, idiomatic
- **Cons**: None
- **Effort**: Small
- **Risk**: None

## Acceptance Criteria

- [ ] PhaseHeader accents object is defined once at module scope
- [ ] PhaseHeader still renders correct border colors per phase
