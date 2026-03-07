---
status: complete
priority: p3
issue_id: "097"
tags: [code-review, color-branding, documentation, phase3-polish]
dependencies: []
---

# text-gray-900 Timer Exception Lacks Code Comment

## Problem Statement

The Phase 3 plan explicitly documents that `gray-900` on the ActiveBrew timer is intentionally kept for maximum contrast during glanceability. However, the code has no comment explaining this exception, making it look like a missed conversion.

## Findings

- ActiveBrew timer uses `text-gray-900` (intentional per plan)
- Plan section 3.4: "Keep gray-900 timer default as-is (highest contrast for glanceability during brewing)"
- No inline comment in code explaining the exception

## Proposed Solutions

### Option A: Add brief inline comment
Add `{/* gray-900 intentional — max contrast for glanceability */}` near the timer element.
- **Effort:** Small (1 comment)
- **Risk:** None

## Acceptance Criteria

- [ ] Timer `text-gray-900` has a brief explanatory comment
