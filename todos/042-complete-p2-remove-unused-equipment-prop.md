---
status: complete
priority: p2
issue_id: "042"
tags: [code-review, dead-code, brewscreen]
dependencies: []
---

# Remove unused `equipment` prop from RateThisBrew

## Problem Statement

`RateThisBrew` accepts `equipment` in its props signature but never references it in the function body. The grind setting correction reads from `brew.grindSetting`, not from equipment. Equipment fields are already baked into the brew record by `handleFinishBrew`.

**Locations:**
- `src/components/BrewScreen.jsx` RateThisBrew function signature (~line 868)
- `src/components/BrewScreen.jsx` JSX call site (~line 1415)

## Findings

- **Pattern Recognition**: "Dead prop threading. Adds confusion about the component's contract."
- **Architecture Strategist**: "Currently unused. Creates a false dependency."
- **Simplicity Reviewer**: Confirmed unused.

## Proposed Solutions

Remove `equipment` from both the destructured props and the JSX call site.

- **Effort**: Small (2-line change)
- **Risk**: Low

**Note**: If Phase 4 adds grinder-aware grind input to the rating screen, this prop may be needed again. Add it back at that point with a clear consumer.

## Acceptance Criteria

- [ ] `equipment` removed from `RateThisBrew` function signature
- [ ] `equipment` removed from RateThisBrew JSX call site
- [ ] Tests pass, build clean

## Work Log

- 2026-03-03: Created from Phase 3 code review
