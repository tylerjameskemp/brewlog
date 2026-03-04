# Timeline Step Editor — Brainstorm

**Date:** 2026-03-04
**Status:** Ready for planning

## What We're Building

A complete redesign of the pour step input and display experience. The current StepEditor shows raw numbers (`45 sec 0:00 @ 50 g`) that force users to mentally calculate timelines and decode cryptic labels. The new design uses a **visual timeline with human-readable time ranges**, making it as natural to input a recipe as it is to read one.

### The Problem

When a user has a recipe like this (from ChatGPT, a friend, or a blog):

```
1. 0:00–0:10 | Bloom to 45g — spiral pour, gentle stir
2. 0:45–0:55 | Second bloom to 90g — keep it gentle
3. 1:15–2:45 | Pulse pours to 270g (3 sub-pours at 1:15, 1:45, 2:15)
```

The current app forces them to translate that into:
- Duration: `10` (seconds) / Start: `0` / Water: `45`
- Duration: `10` / Start: `45` / Water: `90`

This is cognitively expensive, error-prone, and discouraging.

### The Solution

A "Timeline Recipe Builder" that:
1. Accepts time input as humans think about it (seconds in, MM:SS displayed)
2. Shows a vertical timeline connecting steps visually
3. Supports both casual (3-step) and granular (10-step) recipes equally well
4. Uses consistent visual language across recipe planning AND live brew execution

## Why This Approach

We chose a **lean card-based timeline** (evolved from Approach A) over alternatives:

- **Rejected: Sentence-style inline rows** — too cramped on mobile for editing, hard to accommodate technique notes
- **Rejected: Draggable visual builder** — complex to build, finicky on mobile touch, precise value entry is harder
- **Chosen: Compact timeline cards** — closest to how recipes are written/read, practical to build from existing StepEditor structure, supports the expand-for-detail pattern the app already uses

## Key Decisions

### 1. Smart Time Input
- User types raw seconds: `45` → displays as `0:45`
- Handles larger values naturally: `130` → displays as `2:10`
- Always treated as total seconds (unambiguous)
- Under the hood, data model stays the same (`time` and `duration` in seconds)
- Display layer always formats as MM:SS

### 2. Time Range Display (not duration)
- Steps show `0:00 → 0:45` instead of `45 sec at 0:00`
- This matches how every recipe in the wild is written
- Duration is derived (end - start), not a primary input
- User can edit either start, end, or duration — the others auto-calculate

### 3. Vertical Timeline Bar
- Thin line on the left edge connecting step markers
- Proportional segment heights hint at relative duration
- Step markers (dots) at each step's start time
- Time labels on the left of the timeline
- Gives at-a-glance understanding of brew pacing

### 4. Compact Toggle (Read vs. Edit)
- **Compact/read mode (default):** One-line per step — `0:00 → 0:45 · Bloom · pour to 45g`
- **Expanded/edit mode:** Tap to expand — shows name, start/end time inputs, water target, technique note, split/delete controls
- Keeps the screen clean even with 8-10 granular steps
- Follows existing app principle: "Collapsible sections — show detail on demand"

### 5. Granularity Flexibility
- **Quick-add:** `+ Add Step` button at bottom, pre-fills start time from previous step's end
- **Split step:** Tap an existing step → "Split" button divides it at midpoint into two sub-steps
- Casual users: 3-4 steps, done in 30 seconds
- Detailed users: 10+ steps with sub-pours, technique notes on each
- Both paths produce clean structured data that's LLM-indexable for future AI brewing coach features

### 6. ActiveBrew Teleprompter Gets Timeline Treatment
Same visual timeline language carries into the live brew screen:
- **Playhead** moves down the timeline in real-time as timer runs
- **Past steps:** Collapse to one-liner with checkmark + tapped time
- **Current step:** Expanded with technique note, mini progress bar showing time remaining in step, prominent water target
- **Next step:** Semi-expanded (name + water target) for mental preparation
- **Future steps:** Compact, dimmed
- Consistent visual language between planning and execution reduces cognitive load

### 7. Recipe Reference Strip in ActiveBrew
- Show **coffee grams**, **grind setting**, and **total water target** at top of ActiveBrew screen
- Pinned below the timer, above the step teleprompter
- Small, non-intrusive — just a reference line like: `18g · Ode 5-2 · 270g target`
- Solves the "I forgot my dose/grind" problem once you're mid-brew

### 8. Data Model — No Changes
The step format stays: `{ id, name, time, duration, waterTo, note }`
- `time` = start time in seconds
- `duration` = step length in seconds
- End time is derived: `time + duration`
- All existing recipe snapshots, diffs, imports/exports, templates remain compatible
- This is purely a UI/display improvement

## Scope

### In Scope (Phase 1 — StepEditor Redesign)
- Redesigned StepEditor component with timeline bar + compact/expand cards
- Smart time input (seconds in → MM:SS display)
- Time range display (`start → end` instead of `duration @ start`)
- Quick-add and split-step functionality
- Clear labels on all fields (no more cryptic `@` separator)

### In Scope (Phase 2 — ActiveBrew Timeline)
- Vertical timeline with playhead in ActiveBrew
- Recipe reference strip (dose, grind, water target)
- Consistent visual treatment: compact past → expanded current → dimmed future

### Out of Scope (Future)
- LLM-powered recipe import (paste a recipe, AI parses it into steps)
- Drag-to-reorder steps
- Step templates (reusable sub-sequences like "3-pulse pour")
- AI brewing coach integration (uses step data as context)

## Open Questions

1. **BrewForm (post-brew editing):** The diff annotations (planned vs. actual) currently show inline amber tags. Should the timeline view preserve this, or should diffs get their own visual treatment? (Likely a planning-phase decision.)
2. **Pour templates:** The existing template chip strip works well. Should template selection also show a preview of the timeline? (Nice-to-have, not essential for Phase 1.)
3. **Mobile scroll behavior:** With proportional timeline spacing, very long steps (e.g., 90s drawdown) could take lots of vertical space. May need a minimum/maximum height constraint. (Implementation detail for planning phase.)
