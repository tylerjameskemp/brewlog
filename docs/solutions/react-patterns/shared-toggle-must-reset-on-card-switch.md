---
title: "Shared toggle state must reset when switching cards"
category: react-patterns
tags: [accordion, toggle, state-reset, single-expanded, progressive-disclosure]
module: BrewHistory.jsx
symptoms:
  - "Expanding a new card shows the previous card's detail toggle state"
  - "Details section is pre-opened on a card the user just expanded"
  - "Sub-toggles leak across accordion items"
date: 2026-03-06
---

# Shared toggle state must reset when switching cards

## Problem

When a list uses single-expanded-card (accordion) behavior with a shared `showDetails` toggle, switching from one card to another preserves the toggle state. Card B appears with its details open because the user had toggled details on Card A.

## Root Cause

`showDetails` is component-level, not per-card. When `expandedId` changes, `showDetails` retains its previous value. This is a specific case of the "reset handler must clear all related state" pattern, easy to miss because the toggle feels like a separate interaction.

## Fix

Reset the detail toggle unconditionally when any card is clicked:

```jsx
const handleCardClick = (brew) => {
  const newId = expandedId === brew.id ? null : brew.id
  setExpandedId(newId)
  setShowDetails(false)
}
```

## Lesson

Whenever you add sub-state (toggles, tabs, scroll position) to an accordion item, add a reset for that sub-state in the card-switch handler. Think of card expansion as a context switch: all secondary state should start fresh.

## Related

- `docs/solutions/react-patterns/reset-handler-must-clear-all-related-state.md`
