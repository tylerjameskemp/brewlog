---
date: 2026-02-25
topic: demo-ux-tweaks
---

# Demo UX Tweaks — Brainstorm

## What We're Building
Five UX tweaks to get BrewLog to a demoable state where the full brew flow works without leaving the app. No new features — just completing the existing flow.

## Key Decisions

- **Edit brews (Tweak 1):** "Edit" button in expanded BrewHistory card navigates to BrewForm with `editBrew` prop. Reuses entire BrewForm — no duplicate UI. Save calls `updateBrew()`, preserves original ID and `brewedAt`. Returns to history after save.

- **Auto-fill roaster/date (Tweak 2-1):** When bean name matches a known bean, also fill `roaster` from bean library and `roastDate` from last brew of that bean. Two-line addition to existing `handleBeanNameChange`.

- **Auto-fill brew params (Tweak 2-2):** Already working. No changes needed.

- **Grind notation (Tweak 3):** Replace numeric slider with selector showing Fellow Ode positions: `1, 1-1, 1-2, 2, 2-1, 2-2, ... 11` (31 total positions — 2 micro-clicks between each main number). Store as string display value. Convert to numeric for BrewTrends charts (e.g., `6-1` = 6.33, `6-2` = 6.67). Migrate existing numeric grindSetting values to closest notation.

- **Target brew time (Tweak 4):** Add `targetTime` field to Recipe phase (Phase 1). Mirrors the bloom pattern: `targetTime` (planned) → `totalTime` (actual, "leave blank if went as planned"). Pre-fills from last brew like other recipe fields.

- **Scrollable notes (Tweak 7):** Add `max-h-40 overflow-y-auto` to notes display in BrewHistory expanded view. Allow textarea resize in BrewForm.

## Open Questions (Future)
- Multiple bags of same bean need bag-level tracking eventually (roast date as differentiator, but can collide). Not in scope today.

## Next Steps
→ `/workflows:plan` for implementation details
