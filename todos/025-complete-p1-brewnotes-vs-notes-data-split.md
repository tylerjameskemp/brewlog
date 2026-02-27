---
status: complete
priority: p1
issue_id: "025"
tags: [code-review, brewscreen, data-integrity]
---

# `notes: ''` vs `brewNotes` Creates Silent Data Inconsistency

## Problem Statement

In PostBrewCommit's `handleCommit`, the brew record sets `notes: ''` (empty string) AND `brewNotes` (user's actual notes). BrewHistory and other consumers read `brew.notes` to display notes — so BrewScreen brews will always show empty notes in history, while the actual content lives in `brewNotes` which nothing reads.

## Findings

- BrewScreen.jsx:719-720: `notes: ''` alongside `brewNotes`
- BrewHistory.jsx displays `brew.notes` in the expanded brew card
- BrewForm edit mode reads `brew.notes` to pre-populate

## Proposed Solutions

### Option A: Set `notes: brewNotes` and drop `brewNotes` field
- Simplest fix — one line change
- Pros: Backwards compatible with all existing consumers
- Cons: Loses the semantic distinction (but `brewNotes` isn't read anywhere)
- Effort: Trivial

### Option B: Update all consumers to check both fields
- Read `brew.brewNotes || brew.notes`
- Pros: Preserves field separation
- Cons: Must update every consumer; more complexity for no benefit
- Effort: Medium

## Acceptance Criteria

- [ ] BrewScreen brews show their notes in BrewHistory
- [ ] BrewForm edit mode can read notes from BrewScreen-created brews

## Work Log

- 2026-02-27: Identified during code review
