---
status: complete
priority: p3
issue_id: "106"
tags: [code-review, security, worker]
dependencies: []
---

# Gate Localhost CORS on Environment Flag

## Problem Statement
Any `http://localhost:*` origin gets CORS access in production. Should be gated behind an explicit env flag.

## Findings
- **Location:** `worker/src/index.js:96-97`
- **Agent:** security-sentinel

## Proposed Solutions
```js
const isLocalDev = env.ALLOW_LOCAL_DEV && origin && origin.startsWith('http://localhost:')
```
- **Effort:** Trivial

## Acceptance Criteria
- [ ] Localhost CORS only allowed when ALLOW_LOCAL_DEV env var is set
