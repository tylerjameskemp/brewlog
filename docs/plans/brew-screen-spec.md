# Brew Screen Feature — Specification

## Overview

The Brew Screen is a new guided brewing experience for BrewLog, a Vite + React web app deployed on Vercel (https://brewlog-eight.vercel.app, repo: tylerjameskemp/brewlog). It replaces the current workflow where users bounce between ChatGPT for recipes and the app for logging. The feature is a three-phase flow — Recipe Assembly → Active Brew → Post-Brew Commit — designed for mobile-first use at a physical brew station.

This is the app's key differentiating feature and serves as a Proof of Concept (POC).

---

## Product Context

- **User**: Specialty coffee enthusiasts using pour-over methods (primarily V60) at home
- **Device**: Mobile phone propped at brew station — hands are busy pouring water
- **Problem**: No existing app provides a guided, immersive, in-app brewing experience that tracks variance and feeds learnings back into the next brew. Users currently rely on external tools (ChatGPT, paper notes) for recipes, then manually log afterwards
- **Stack**: Vite + React, browser localStorage for persistence, deployed on Vercel via GitHub auto-deploy
- **Design philosophy**: The user has articulated a "Moog Grandmother" approach — intentional, limited, purposeful UI. Every element should serve a function. Information should be pleasant and digestible, easy to dig into without leaving the interface or losing your place

---

## Phase 1: Recipe Assembly (Pre-Brew)

### Purpose
Prepare for the brew. Review recipe, incorporate learnings from last time, select or modify pour structure.

### Recipe Card — Swipeable Cards
Three horizontally swipeable cards with dot indicator navigation. No vertical scrolling for primary info.

**Card 1 — Essentials:**
- Coffee name, roaster, roast date
- Roaster's tasting notes (as tags)
- Coffee amount (g), water amount (g), calculated ratio
- Grind setting, water temperature
- Target time range

**Card 2 — Brew Steps:**
- Ordered list of steps, each showing:
  - Step number, name (e.g., "Bloom", "First Pour")
  - Target time window (start → end)
  - Water target (e.g., "→ 42g")
  - Brief instruction note

**Card 3 — Origin Details:**
- Process (washed, natural, etc.)
- Origin country/region
- Grower name
- Variety
- Elevation

### Recipe Auto-Fill (POC Scope)
When the user selects a bean to brew, the recipe auto-populates from the last brew of that same bean. Fields are editable before starting.

### "Changes for Next Brew" Prompt System (POC Scope)
If the user wrote "changes for next brew" notes on their last session with this bean, those notes appear as a prompt card above the recipe cards with Apply/Skip buttons per note. Applying a note is an acknowledgment (doesn't auto-modify fields — user applies the change manually). Skipping dims the note.

### Pour Structure Templates (POC Scope)
Horizontal scrollable row of saved pour templates (e.g., "Standard 3-Pour V60", "Tetsu 4:6 Method"). Selecting a template swaps the brew steps on Card 2. User can have templates that work across different beans.

Data model for a pour template:
```
{
  id: string,
  name: string,
  steps: [
    {
      id: number,
      name: string,
      waterTo: number | null,       // target cumulative water weight in grams
      timeOffset: number,           // seconds from brew start
      duration: number,             // expected duration in seconds
      note: string
    }
  ]
}
```

### "Brew This" CTA
Fixed at bottom of screen. Transitions to Phase 2.

---

## Phase 2: Active Brew (Guided Experience)

### Purpose
Real-time guided brewing with step-by-step instructions, timing, and optional variance tracking.

### Core UX Concept: "Teleprompter for Brewing"
The screen transitions to a clean white background. The timer is the dominant element. Steps appear as cards below the timer, with the current step visually prominent and future steps dimmed.

### Timer
- Large, centered, monospaced/tabular-nums display (e.g., "2:35")
- Target time range shown below
- Linear progress bar showing elapsed vs. total expected brew duration
- Progress bar changes color if brew exceeds target time range

### Screen Wake Lock
Use the Screen Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent the phone from sleeping during an active brew. Progressive enhancement — fail silently on unsupported browsers.

### Step Display & Interaction

**Visual States:**
| State | Appearance |
|-------|------------|
| Current step | Dark background (#1A1714), white text, full opacity |
| Future step | White background, light border, 50% opacity |
| Completed step | Light gray background, muted text |
| Skipped step | Struck-through, 40% opacity |

**Auto-advance behavior:**
- Timer runs continuously from play
- Steps auto-highlight when their target time arrives
- User taps a step to confirm they actually started it → records `tappedAt` timestamp
- If user doesn't tap, the system assumes they followed the plan ("as planned")
- The delta between `step.time` (planned) and `tappedAt` (actual) = variance

**Step modification during brew:**
- ✕ button on each step to skip/kill (e.g., user decides to skip the swirl)
- No mid-brew step insertion (too high cognitive load). Step additions are a post-brew action or done by editing the recipe before next brew

**Auto-scroll:**
- When a new step becomes current, the view auto-scrolls to center that step

### Controls
- Play button (large, centered) to start brew — only shown before timer starts
- Pause button appears once timer is running
- Resume button appears when paused
- "Finish Brew" button — always visible at bottom once brew has started. Stops timer and transitions to Phase 3

### Data Captured During Brew
```
{
  elapsed: number,           // total seconds
  tappedSteps: {             // step.id → timestamp when user tapped
    [stepId]: number         // seconds from brew start
  },
  skippedSteps: {            // step.id → true
    [stepId]: boolean
  }
}
```

---

## Phase 3: Post-Brew Commit

### Purpose
Document what happened, capture observations, and seed improvements for the next brew.

### Brew Report Summary
- Total brew time (large, prominent) vs. target time range
- Step-by-step timing breakdown:
  - For each step: planned time, actual time (if tapped), variance (+/- seconds)
  - Steps not tapped show "as planned"
  - Skipped steps marked and struck-through

### Brew Notes (Retro)
Textarea for observations during the brew:
- "What happened during this brew?"
- Placeholder: "Bed looked uneven after bloom, water temp dropped fast..."
- These notes attach to this specific brew report

### Changes for Next Brew
Separate, visually distinct textarea (warm-toned background to differentiate from brew notes):
- "These notes will appear as suggestions next time you brew this bean"
- Placeholder: "Try coarser grind, extend bloom to 45s..."
- These notes are associated with the **bean**, not the brew, and surface in Phase 1 next time

### Tasting Notes (Placeholder)
A dashed-border placeholder card indicating this section is coming soon. The tasting notes feature will be developed separately but will attach to the brew report.

### Commit Brew
- "Commit Brew" button — locks the brew report
- Success state: confirmation message, "Back to Start" button
- Brew report remains editable after commit from brew history, but the commit is the intentional "done" moment

---

## Data Model Additions

### Recipe
```
{
  id: string,
  beanId: string,
  coffeeAmount: number,        // grams
  waterAmount: number,         // grams
  grindSetting: string,        // free text (e.g., "5 (first click after)")
  waterTemp: number,           // °F
  targetTimeRange: string,     // e.g., "3:00–3:30"
  steps: BrewStep[],
  pourTemplateId: string | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### BrewStep
```
{
  id: number,
  name: string,
  waterTo: number | null,
  time: number,                // seconds from start
  duration: number,            // seconds
  note: string
}
```

### PourTemplate
```
{
  id: string,
  name: string,
  steps: BrewStep[],
  createdAt: timestamp
}
```

### BrewSession (new entity — the brew report)
```
{
  id: string,
  recipeId: string,
  beanId: string,
  totalTime: number,           // actual elapsed seconds
  stepResults: {
    [stepId]: {
      tappedAt: number | null, // seconds from start, null = "as planned"
      skipped: boolean,
      variance: number | null  // tappedAt - step.time
    }
  },
  brewNotes: string,           // retro observations
  nextBrewChanges: string,     // surfaces in Phase 1 next time
  committed: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Bean (additions to existing)
```
{
  // ... existing bean fields ...
  lastBrewChanges: string[],   // from most recent BrewSession.nextBrewChanges
}
```

---

## Routing & Navigation

Suggested route structure (to integrate with existing app routing):

- `/brew/:beanId` — Phase 1 (Recipe Assembly)
- `/brew/:beanId/active` — Phase 2 (Active Brew) — or handle as in-component state
- `/brew/:beanId/report/:sessionId` — Phase 3 (Post-Brew Commit)

**Critical**: During Phase 2 (Active Brew), back navigation / swipe-back must be intercepted. The user should not accidentally navigate away mid-brew and lose their session. Use `beforeunload` event and/or route guards.

---

## Technical Requirements

### Screen Wake Lock
```javascript
// Progressive enhancement pattern
useEffect(() => {
  let wakeLock = null;
  const request = async () => {
    try {
      if ('wakeLock' in navigator && isBrewActive) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) { /* silent fail */ }
  };
  request();
  return () => { if (wakeLock) wakeLock.release(); };
}, [isBrewActive]);
```

### localStorage Persistence
All brew session data must be written to localStorage at each significant state change (step tap, skip, pause) to survive accidental page refreshes — this has been identified as a critical existing issue where data is lost on refresh.

### Mobile-First
- Touch targets minimum 44x44px
- Timer text should be readable from arm's length (~72px)
- Swipe gestures for card navigation
- No hover-dependent interactions
- Consider haptic feedback (`navigator.vibrate`) on step transitions if supported

---

## Design Tokens

The prototype uses these design values which should be adapted to match BrewLog's existing design system:

```
Background:     #FAFAF7
Surface:        #FFFFFF
Surface Warm:   #F5F0EB
Surface Dark:   #1A1714  (used for active step and primary CTAs)
Text:           #1A1714
Text Muted:     #8A8478
Accent:         #C4703E  (warm copper — the "coffee" accent)
Accent Light:   #E8C9AD
Accent Soft:    #F5EDE4
Success:        #5A8A6A
Warning:        #D4913B
Danger:         #C45B4A
Border:         #E8E4DE

Typography:
  Display:  'Instrument Serif' (or match existing app serif)
  Body:     'DM Sans' (or match existing app sans)
```

---

## Interactive Prototype

An interactive React prototype (brewscreen.jsx) has been built and validated. It demonstrates:
- All three phases with working transitions
- Swipeable recipe cards with dot navigation
- "Changes from last brew" prompt system with Apply/Skip
- Pour template selector
- Full timer with play/pause/resume
- Step teleprompter with tap-to-confirm, skip, auto-advance, and variance tracking
- Screen Wake Lock API integration
- Post-brew report with step-by-step variance data
- Separate brew notes and "changes for next brew" fields
- Commit flow with success state

The prototype is a single JSX file intended as a UX reference, not production code. The Conductor workspace should implement the feature using the existing app's component patterns, state management, and routing conventions.

---

## Out of Scope (Icebox)

These are documented for future sprints but should NOT be built in this POC:

- AI recipe suggestions / generation
- Tasting notes (placeholder card only in this build)
- Flavor discovery tools (flash cards, thumbs up/down on roaster descriptors)
- Equipment setup wizard
- Bean inventory / gram tracking
- Recipe sharing / import from roasters
- Multi-device sync
- Circular timer visualization (linear progress bar for POC)
- Mid-brew step insertion
- Adaptive coaching based on user expertise
