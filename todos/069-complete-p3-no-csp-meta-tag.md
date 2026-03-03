---
status: pending
priority: p3
issue_id: "069"
tags: [code-review, security, hardening]
dependencies: []
---

# No Content Security Policy Meta Tag

## Problem Statement

The app has no CSP meta tag in `index.html`. While this is a client-side-only app with no backend, a CSP would provide defense-in-depth against XSS if a vulnerability were ever introduced (e.g., via a compromised dependency).

## Proposed Solutions

### Option A: Add restrictive CSP meta tag
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```
- **Effort:** Small
- **Risk:** Low (may need `unsafe-inline` for Tailwind)
