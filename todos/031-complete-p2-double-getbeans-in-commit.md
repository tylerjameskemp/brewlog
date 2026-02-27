---
status: complete
priority: p2
issue_id: "031"
tags: [code-review, brewscreen, performance]
---

# Double `getBeans()` Parse in handleCommit

## Problem Statement

`PostBrewCommit.handleCommit` calls `setBeans(getBeans())` twice (lines 742, 746) — once after `saveBean()` and once after `updateBean()`. Each call triggers `localStorage.getItem` + `JSON.parse`. Combined with internal parses in `saveBean()`/`updateBean()`, this is 4 total localStorage parses of the beans array in one commit.

## Proposed Solutions

Use return values from `saveBean`/`updateBean` if available, or defer `setBeans(getBeans())` to after all mutations complete. Single call at the end.

## Acceptance Criteria

- [ ] Only one `setBeans(getBeans())` call per commit

## Work Log

- 2026-02-27: Identified during code review
