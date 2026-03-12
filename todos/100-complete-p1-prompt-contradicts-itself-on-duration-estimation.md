---
status: complete
priority: p1
issue_id: "100"
tags: [code-review, worker, quality]
dependencies: []
---

# Worker Prompt Contradicts Itself on Duration Estimation

## Problem Statement
The STEP RULES section (line 65) says "set duration to 0 (do NOT invent or estimate timing)" but the TIMING RULES section (lines 75-76) says "estimate if not explicit" and "estimate based on common pour-over practice." The LLM receives conflicting instructions, leading to unpredictable behavior on steps without explicit timing.

## Findings
- **Location:** `worker/src/index.js:65` — STEP RULES: "set duration to 0, do NOT estimate"
- **Location:** `worker/src/index.js:75-76` — TIMING RULES: "estimate if not explicit"
- **Agents:** Multiple agents noted prompt engineering as a hotspot

## Proposed Solutions

### Option A: Align TIMING RULES with STEP RULES
Remove the estimation instructions from TIMING RULES:
```
TIMING RULES:
- All durations in seconds
- Each step's timing should be sequential when durations are known
- If a step has no clear duration, set duration to 0
- targetTime must be a MM:SS string...
```
- **Pros:** Consistent, honest representation of source data
- **Cons:** None
- **Effort:** Trivial
- **Risk:** None

## Recommended Action
Option A — the user explicitly requested no invented timing.

## Technical Details
- **Affected files:** `worker/src/index.js`

## Acceptance Criteria
- [ ] STEP RULES and TIMING RULES agree on duration handling
- [ ] Steps without explicit timing get duration: 0
