---
status: complete
priority: p3
issue_id: "092"
tags: [code-review, typography, consistency, phase3-polish]
dependencies: []
---

# tracking-wider vs tracking-widest Inconsistency in Section Labels

## Problem Statement

Section labels in BrewScreen use a mix of `tracking-wider` and `tracking-widest`. The Phase 3 typography scale specifies `tracking-wider` for section labels, but some instances use `tracking-widest`.

## Findings

- `BrewScreen.jsx` lines ~506, 515, 1135: use `tracking-widest`
- `BrewScreen.jsx` lines ~1288, 1293, 1313: use `tracking-wider` (matches plan)
- Phase 3 plan defines section labels as `text-xs text-brew-400 uppercase tracking-wider`

## Proposed Solutions

### Option A: Normalize all to tracking-wider
Replace `tracking-widest` with `tracking-wider` to match the documented typography scale.
- **Effort:** Small (3 occurrences)
- **Risk:** None — subtle visual difference

## Acceptance Criteria

- [ ] All uppercase section labels use `tracking-wider` consistently
