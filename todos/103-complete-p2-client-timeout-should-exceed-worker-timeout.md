---
status: complete
priority: p2
issue_id: "103"
tags: [code-review, performance, reliability]
dependencies: []
---

# Client Timeout Should Exceed Worker Timeout

## Problem Statement
Both client and worker use 30s timeouts. If the worker's Claude call takes 29s and response transit takes 2s, the client aborts a successful extraction. The client should have margin for network round-trip.

## Findings
- **Location:** `src/components/RecipeImportModal.jsx:46-48` — 30s client timeout
- **Location:** `worker/src/index.js:280` — 30s worker AbortSignal.timeout
- **Agent:** performance-oracle

## Proposed Solutions
Set client timeout to 35s (30s worker + 5s network margin).
- **Effort:** Trivial (change `30000` to `35000`)

## Acceptance Criteria
- [ ] Client timeout > worker timeout
