---
status: complete
priority: p1
issue_id: "099"
tags: [code-review, security, worker]
dependencies: []
---

# Auth Check Fails Open When WORKER_AUTH_TOKEN Is Unset

## Problem Statement
If `WORKER_AUTH_TOKEN` is not configured in the worker environment, the auth check is completely skipped. The worker becomes an open proxy to the Anthropic API — anyone can call `/extract` and consume the API key's quota.

## Findings
- **Location:** `worker/src/index.js:194-195` — `if (env.WORKER_AUTH_TOKEN && token !== env.WORKER_AUTH_TOKEN)`
- **Agent:** security-sentinel (MEDIUM severity, HIGH exploitability)

## Proposed Solutions

### Option A: Fail closed
Change condition to reject all requests when token is unset:
```js
if (!env.WORKER_AUTH_TOKEN || token !== env.WORKER_AUTH_TOKEN) {
  return jsonResponse({ error: 'Unauthorized' }, 401, origin, allowedOrigin)
}
```
- **Pros:** One-line fix, prevents accidental open proxy
- **Cons:** None
- **Effort:** Trivial
- **Risk:** None — if token is unset, the worker should not operate

## Recommended Action
Option A — always fail closed.

## Technical Details
- **Affected files:** `worker/src/index.js`

## Acceptance Criteria
- [ ] Worker returns 401 when WORKER_AUTH_TOKEN env var is missing
- [ ] Worker returns 401 when token doesn't match
- [ ] Normal auth flow still works when token is configured correctly
