---
status: complete
priority: p2
issue_id: "030"
tags: [code-review, brewscreen, resilience]
---

# Unguarded `JSON.parse` in `getPourTemplates()` Can Crash App

## Problem Statement

`getPourTemplates()` (storage.js:232-234) calls `JSON.parse` without try/catch. If the `brewlog_pour_templates` localStorage key contains corrupted data, the entire BrewScreen component crashes on mount. The similar `getActiveBrew()` function already has try/catch protection — the inconsistency makes this easy to miss.

## Proposed Solutions

Wrap in try/catch returning `[]` on error, consistent with `getActiveBrew()`. Also add try/catch to `saveActiveBrew()` to handle `QuotaExceededError`.

## Acceptance Criteria

- [ ] `getPourTemplates()` returns `[]` on corrupted data instead of crashing
- [ ] `saveActiveBrew()` handles storage quota errors gracefully

## Work Log

- 2026-02-27: Identified during code review
