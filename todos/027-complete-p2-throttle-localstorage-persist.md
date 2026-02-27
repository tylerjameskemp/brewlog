---
status: complete
priority: p2
issue_id: "027"
tags: [code-review, brewscreen, performance]
---

# Throttle localStorage Persistence During Active Brew

## Problem Statement

The `persistState` effect fires every second during an active brew (keyed on `timer.elapsed`), producing ~210 synchronous `JSON.stringify` + `localStorage.setItem` calls per brew. The spec called for writes every 10 seconds. On low-end mobile devices this can cause frame drops during the timer display + step animation cycle.

Additionally, `timer.restore()` is not wired up (see #023), so these writes are currently pure waste.

## Proposed Solutions

Throttle to every 5-10 seconds using a `useRef` timestamp guard, plus immediate writes on user actions (tap, skip, pause).

## Acceptance Criteria

- [ ] localStorage writes during active brew reduced by at least 80%
- [ ] State is still persisted on meaningful user actions (tap, skip, pause)

## Work Log

- 2026-02-27: Identified during code review
