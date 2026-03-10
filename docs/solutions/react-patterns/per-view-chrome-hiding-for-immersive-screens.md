---
title: Per-View Chrome Hiding for Immersive Screens
category: react-patterns
module: App, Header, BrewScreen, BeanLibrary
tags: [navigation, header, conditional-rendering, immersive-ui, layout]
symptoms:
  - White header bar breaks full-page dark theme
  - Logo/settings chrome clashes with immersive view aesthetic
  - Need different chrome levels for different views
date: 2026-03-10
---

# Per-View Chrome Hiding for Immersive Screens

## Problem

Some views need the full app chrome (header with logo, nav tabs, settings) while others are immersive full-page experiences that clash with the standard header. Hiding the header globally breaks navigation for views that need it.

## Symptom

After applying a dark felt-board aesthetic to BeanLibrary and BeanPicker (BrewScreen), the white header bar with logo and settings gear visually clashed with the full-page dark theme. But History and Trends views still needed the header for desktop navigation and settings access.

## Root Cause

The Header was rendered unconditionally in App.jsx. There was no mechanism to suppress it for specific views.

## Solution

Conditionally render the Header based on the current view:

```jsx
// App.jsx
{!(view === 'brew' && !editingBrew) && view !== 'beans' && (
  <Header
    view={view}
    setView={setView}
    onSettingsClick={...}
    settingsMenu={...}
  />
)}
```

The immersive views (brew, beans) manage their own headers inside their felt-board containers with letterpress-styled titles.

## Key Decisions

1. **Condition at the render site, not inside Header.** The Header component stays unaware of which views want it — the parent decides. This keeps Header reusable.
2. **BrewScreen edit mode keeps the header.** `editingBrew` is a different context (BrewForm) that still needs standard chrome, so the condition is `view === 'brew' && !editingBrew`.
3. **Bottom MobileNav stays visible.** Only the top header is hidden — the bottom nav is needed for switching between views. It was separately restyled to match.

## Prevention

When adding immersive/full-page views:

1. **Don't modify the shared Header component.** Add the condition in the parent that renders it.
2. **Keep the condition expression readable.** If it grows beyond 2–3 view checks, extract a `const showHeader = ...` variable.
3. **Ensure navigation remains accessible.** If the header is hidden, the bottom nav or an in-page back button must still allow view switching.
4. **Test settings access.** The settings menu lives in the Header — ensure it's still reachable from other views or via an alternate path.
