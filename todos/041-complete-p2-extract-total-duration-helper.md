---
status: complete
priority: p2
issue_id: "041"
tags: [code-review, duplication, brewscreen]
dependencies: []
---

# Extract totalDuration computation helper (3x duplication)

## Problem Statement

The same 3-line formula for computing total recipe duration appears in three places with a hardcoded magic number fallback (210):

```javascript
const totalDuration = steps.length > 0
  ? steps[steps.length - 1].time + steps[steps.length - 1].duration
  : 210
```

**Locations:**
- `src/components/BrewScreen.jsx` ActiveBrew (~line 614)
- `src/components/BrewScreen.jsx` RateThisBrew (~line 883)
- `src/components/BrewScreen.jsx` handleFinishBrew (~line 1242)

## Findings

- **Pattern Recognition**: Identified as the most actionable duplication (3x3 = 9 duplicated lines).
- **Simplicity Reviewer**: Recommended extraction to a helper at file scope.

## Proposed Solutions

Extract to a file-scope helper in BrewScreen.jsx:

```javascript
const getTotalDuration = (steps) =>
  steps.length > 0
    ? steps[steps.length - 1].time + steps[steps.length - 1].duration
    : 210
```

Replace all three call sites with `getTotalDuration(steps)`.

- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] `totalDuration` computation appears in exactly one place
- [ ] All three call sites use the extracted helper
- [ ] Tests pass, build clean

## Work Log

- 2026-03-03: Created from Phase 3 code review
