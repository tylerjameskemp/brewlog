---
status: complete
priority: p2
issue_id: "052"
tags: [code-review, bug, brewscreen]
dependencies: []
---

# buildRecipeFromBean hardcodes 210 instead of method.defaultTotalTime

## Problem Statement

In `buildRecipeFromBean()` (BrewScreen.jsx), the first return path (no bean selected, line ~1349) hardcodes `targetTime: 210` while the third return path (bean selected but no prior brew, line ~1377) uses `method.defaultTotalTime`. These should be the same value.

For V60, `defaultTotalTime` is 210, so the bug is invisible today. But if a user's default method is AeroPress (`defaultTotalTime: 120`), the no-bean path would still show 210 (3:30) as target time.

## Findings

**Agent:** Code Simplicity Reviewer (finding #9)

The two paths produce near-identical objects. Merging them into a shared defaults object fixes the bug and removes ~10 lines.

## Proposed Solutions

```js
const defaults = {
  coffeeGrams: 15, waterGrams: 240, grindSetting: '',
  waterTemp: 200, targetTime: method.defaultTotalTime,
  targetTimeRange: '', targetTimeMin: null, targetTimeMax: null,
  steps: [], pourTemplateId: null, ...equipDefaults,
}

if (!beanName) return defaults
const lastBrew = getLastBrewOfBean(beanName)
if (!lastBrew) return defaults
// ... returning-bean path ...
```

- **Effort:** Small (10 lines changed)

## Acceptance Criteria

- [ ] No-bean and no-prior-brew paths use same `method.defaultTotalTime`
- [ ] Non-V60 default methods get correct target time
