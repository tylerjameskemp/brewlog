---
title: "Related cards should merge using internal dividers"
category: react-patterns
tags: [card-layout, information-architecture, visual-hierarchy, Tailwind]
module: BrewScreen
symptoms:
  - "Too many small cards create scroll fatigue"
  - "A card heading color drifts because the card feels secondary"
  - "Two adjacent cards are always visible at the same time"
created: 2026-03-06
---

# Related cards should merge using internal dividers

## Problem

RateThisBrew had 5 separate cards: Step Timing, Correct Actuals (2 fields), Brew Notes (1 textarea), Changes for Next Brew (1 textarea), and Tasting. The 3 middle cards shared the same lifecycle (all editable, all visible at once, all part of "describe what happened this brew") but each had its own card border, heading, and shadow — adding scroll depth without meaningful information separation.

A symptom: the "Changes for Next Brew" heading was `text-brew-500` instead of the standard `text-brew-800`. The author instinctively styled it as secondary because it didn't feel important enough for its own card. The correct fix is to merge it into a parent card, not to normalize the heading color.

## Symptoms

- Excessive vertical scroll on a single-phase screen.
- Card heading color drifts to "secondary" shades because the card feels like it shouldn't be a card.
- Adjacent cards share the same visibility lifecycle (always shown/hidden together).
- A card contains only 1-2 fields.

## Root Cause

Card boundaries were drawn per-field-group during initial development without revisiting whether the groupings still made sense after the full screen was built. Each field group got its own card for visual separation, but the separation wasn't meaningful — the groups share a workflow step and lifecycle.

## Solution

Merge cards that share lifecycle and workflow step. Replace card headings with internal dividers:

```jsx
{/* Merged "Brew Details" card */}
<div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">
  <h3 className="text-lg font-semibold text-brew-800 mb-1">Brew Details</h3>

  {/* Primary fields at top — no divider needed */}
  <div className="grid grid-cols-2 gap-3">
    <div>...</div>
    <div>...</div>
  </div>

  {/* Section divider + label */}
  <div className="border-t border-brew-100 mt-4 pt-4">
    <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Notes</div>
    <textarea ... />
  </div>

  {/* Tinted inset for semantically distinct sub-section */}
  <div className="bg-amber-50 rounded-xl border border-amber-200 mt-4 p-4">
    <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Try Next Time</div>
    <textarea ... />
  </div>
</div>
```

**Internal separation tools (lightest to heaviest):**
1. Whitespace only (`mt-4`) — for closely related fields
2. `border-t border-brew-100 mt-4 pt-4` + section label — for distinct sub-sections within the same lifecycle
3. Tinted inset (`bg-amber-50 rounded-xl border`) — for sub-sections with special semantic weight (e.g., forward-looking suggestions vs backward-looking notes)

## Decision Framework

**Merge when:**
- Cards share the same visibility lifecycle (always shown/hidden together)
- Cards serve the same workflow step ("describe this brew")
- A card has only 1-2 fields
- Card heading color is drifting to "secondary" shades

**Keep separate when:**
- One card is conditionally absent (e.g., Step Timing hidden for manual brews)
- Cards represent different data sources (timer recordings vs user input)
- Cards have different interaction models (read-only vs editable)
- A card is independently collapsible

## Result

RateThisBrew went from 5 cards to 3 (2 for manual brews). All fields preserved, scroll depth reduced, and the "secondary heading color" symptom disappeared because the merged sub-sections use section labels instead of card headings.

## References

- Phase 3 plan: `docs/plans/2026-03-06-refactor-phase3-polish-plan.md` (section 3.6)
- Related pattern: `docs/solutions/react-patterns/progressive-disclosure-summary-vs-details-split.md` (addresses show/hide within a card, not card boundary decisions)
