---
status: pending
priority: p3
issue_id: "070"
tags: [code-review, security, input-validation]
dependencies: []
---

# No maxLength on Free-Text Inputs

## Problem Statement

Text inputs and textareas for notes, "what to try next", bean names, etc. have no `maxLength` attribute. While localStorage has a ~5MB limit that provides a natural ceiling, excessively long inputs could bloat storage and degrade performance of JSON.parse on the brews array.

## Proposed Solutions

### Option A: Add maxLength to all text inputs
Reasonable limits: bean name (100), notes (2000), "what to try next" (500), custom flavor (50).
- **Effort:** Small
- **Risk:** Low
