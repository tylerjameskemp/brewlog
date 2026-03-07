---
title: "Progressive disclosure: summary vs details split"
category: react-patterns
tags: [progressive-disclosure, collapsible, summary, details, ui-density, information-hierarchy]
module: BrewHistory.jsx
symptoms:
  - "Expanded cards show too much information at once"
  - "Users must scroll through irrelevant fields to find Edit/Delete buttons"
  - "Actionable buttons buried below a wall of data"
  - "Card expansion feels heavy — users avoid expanding"
date: 2026-03-06
---

# Progressive disclosure: summary vs details split

## Problem

BrewHistory expanded cards showed every field at once: dose, water, grind, time, flavors, notes, equipment, recipe snapshot, pour steps, step results, issues, and diffs. Edit and Delete buttons were at the bottom, after all content. Users had to scroll past data they rarely needed just to reach the primary actions.

## Root Cause

The expanded card was designed as a flat dump of all brew fields. There was no distinction between "fields you need to identify and act on this brew" and "fields you occasionally want to inspect."

## Fix

Split the expanded card into two tiers with a nested `Collapsible`:

**Summary tier (always visible on expand):**
- Core brew parameters: dose, water, grind, time
- Flavor tags (quick visual fingerprint)
- Notes preview (truncated to ~80 chars)
- Edit and Delete buttons
- "Show details" toggle

**Details tier (behind toggle):**
- Water temperature, target time range
- Equipment (method, grinder, dripper, filter)
- Full pour step table with planned-vs-actual
- Issues, diffs from previous brew

### Decision framework

1. **Summary identifies the record.** Include the minimum fields to answer "which brew is this?"
2. **Actionable elements go in summary.** Edit/Delete must be reachable without expanding details.
3. **Visual fingerprints go in summary.** Flavor tags and truncated notes give a quick sense of the brew.
4. **Reference data goes in details.** Equipment specs, step-by-step breakdowns, and secondary metadata.

## Lesson

If an expanded section requires scrolling on mobile, it probably needs a summary/details split. Place action buttons at the boundary between summary and details, not at the bottom of all content. Start by asking: "what does the user need to decide what to do next?" That goes in summary. Everything else goes in details.

## Related

- `docs/solutions/react-patterns/unconstrained-flex-causes-scrollintoview-to-scroll-document.md`
