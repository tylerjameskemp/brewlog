---
status: pending
priority: p3
issue_id: "093"
tags: [code-review, typography, consistency, phase3-polish]
dependencies: []
---

# Rating Label text-[10px] in BrewScreen vs text-xs in BrewForm

## Problem Statement

The rating number labels (1-5) use `text-[10px]` in BrewScreen's RateThisBrew section but `text-xs` in BrewForm. The Phase 3 plan normalized BrewForm rating labels to `text-xs` but the same labels in BrewScreen were left at `text-[10px]`.

## Findings

- `BrewScreen.jsx` line ~1326: rating labels use `text-[10px]`
- `BrewForm.jsx` line ~498: rating labels use `text-xs` (fixed in Phase 3)
- Phase 3 typography rules: `text-[10px]` only for badges, diff tags, and MobileNav

## Proposed Solutions

### Option A: Update BrewScreen rating labels to text-xs
Change `text-[10px]` → `text-xs` on the rating number labels in RateThisBrew.
- **Effort:** Small (1 line)
- **Risk:** None

## Acceptance Criteria

- [ ] Rating number labels in BrewScreen match BrewForm (`text-xs`)
