---
status: complete
priority: p1
issue_id: "098"
tags: [code-review, security, worker]
dependencies: []
---

# SSRF Redirect Bypass in Worker URL Fetching

## Problem Statement
The worker's `fetchAndExtractText()` uses `redirect: 'follow'`, but `isPrivateUrl()` only validates the user-supplied URL before the fetch. An attacker can supply a public URL that 302-redirects to an internal resource (e.g., cloud metadata endpoint). The SSRF check never validates the final destination after redirects.

**Mitigating factor:** Cloudflare Workers runtime restricts some of these scenarios (no `file://` support, different metadata behavior than AWS/GCP). But this is a defense-in-depth failure.

## Findings
- **Location:** `worker/src/index.js:147-152` — `redirect: 'follow'` follows redirects unchecked
- **Location:** `worker/src/index.js:119-142` — `isPrivateUrl()` only called on initial URL
- **Agent:** security-sentinel (HIGH severity)

## Proposed Solutions

### Option A: Disable redirects entirely
Change `redirect: 'follow'` to `redirect: 'error'`. Any redirect returns an error to the user suggesting they paste text directly.
- **Pros:** Simplest fix, eliminates entire attack surface
- **Cons:** Some legitimate recipe URLs may use redirects (URL shorteners, www/non-www)
- **Effort:** Trivial (1 line)
- **Risk:** Low — users can always paste text

### Option B: Manual redirect following with validation
Use `redirect: 'manual'`, check response status, extract Location header, validate with `isPrivateUrl()`, follow up to 3 hops.
- **Pros:** Supports legitimate redirects while blocking SSRF
- **Cons:** More code, bounded loop logic
- **Effort:** Small (~15 lines)
- **Risk:** Low

## Recommended Action
Option A for now — the "paste text directly" fallback already exists.

## Technical Details
- **Affected files:** `worker/src/index.js`

## Acceptance Criteria
- [ ] Worker does not follow HTTP redirects to private/internal URLs
- [ ] Legitimate recipe URLs that redirect return a clear error message
