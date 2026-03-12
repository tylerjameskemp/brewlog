---
status: complete
priority: p3
issue_id: "105"
tags: [code-review, quality, dead-code]
dependencies: []
---

# Dead GRIND_TIERS Export in grindCalibration.js

## Problem Statement
`GRIND_TIERS` array is exported from `grindCalibration.js` but never imported anywhere. Dead code with a YAGNI "Phase 2" comment.

## Findings
- **Location:** `src/data/grindCalibration.js:9-11`
- **Agent:** code-simplicity-reviewer

## Proposed Solutions
Remove the export and constant. If needed later, add it then.
- **Effort:** Trivial

## Acceptance Criteria
- [ ] `GRIND_TIERS` removed from grindCalibration.js
