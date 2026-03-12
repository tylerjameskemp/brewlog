---
status: complete
priority: p2
issue_id: "102"
tags: [code-review, performance, worker]
dependencies: []
---

# Cap Raw HTML Before Regex Chain in Worker

## Problem Statement
`fetchAndExtractText()` applies 7 regex replacements on the full HTML body before slicing to 10KB. On large pages (5MB+), this could cause CPU pressure within the worker's time budget.

## Findings
- **Location:** `worker/src/index.js:155-168`
- **Agent:** performance-oracle

## Proposed Solutions
Truncate raw HTML to ~100KB before regex chain:
```js
const truncatedHtml = html.slice(0, 102400)
```
- **Effort:** Trivial (1 line)

## Acceptance Criteria
- [ ] Raw HTML truncated before regex processing
- [ ] Final output still capped at 10KB
