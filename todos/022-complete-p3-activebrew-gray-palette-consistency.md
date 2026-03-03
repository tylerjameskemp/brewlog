---
status: pending
priority: p3
issue_id: "022"
tags: [code-review, design, brewscreen]
dependencies: []
---

# Evaluate gray-* vs brew-* palette consistency in ActiveBrew

## Problem Statement

ActiveBrew introduces `text-gray-900`, `bg-gray-200`, `bg-gray-50`, `text-gray-300`, `text-gray-400`, and `border-gray-100` — the first usage of Tailwind's default gray palette in the codebase. Every other component uses the custom `brew-*` palette exclusively. CLAUDE.md documents "Warm coffee palette — Custom brew-* colors from amber/brown range."

## Findings

- Pattern recognition review flagged this as a palette convention break
- The gray usage was intentional: `text-gray-900` (#111827) provides higher contrast than `text-brew-800` (#3d2718) for distance readability
- User explicitly requested "high contrast — dark text on light background"
- For step cards, `bg-gray-50`/`text-gray-400` replaces `bg-brew-50`/`text-brew-400` for neutral appearance

## Proposed Solutions

### Option A: Extend brew palette (future)
Add `brew-950` as near-black for maximum contrast, use existing `brew-50`/`brew-100` for neutral backgrounds
- Pros: Maintains palette consistency
- Cons: May not achieve the same neutral/cool contrast user wanted
- Effort: Small

### Option B: Accept gray-* for ActiveBrew (current)
The brewing timer has different readability requirements than the rest of the app
- Pros: Maximum readability at distance, clean visual separation from warm UI
- Cons: Palette inconsistency
- Effort: None

## Technical Details

- Affected files: `src/components/BrewScreen.jsx` (ActiveBrew only)
- 5 gray-* class usages total
