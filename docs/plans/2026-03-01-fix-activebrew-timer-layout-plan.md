---
title: "fix: Pin ActiveBrew timer to top with high-contrast left-aligned layout"
type: fix
date: 2026-03-01
---

# fix: Pin ActiveBrew timer to top with high-contrast left-aligned layout

## Overview

The ActiveBrew timer (Phase 2 of BrewScreen) moves when steps auto-scroll, is hard to read at arm's length due to dark color scheme and thin font weight, and absorbs too much screen real estate with heavy step cards. This fix pins the timer to the top of the viewport, increases readability, and creates a clear visual hierarchy between the timer and the scrolling step list.

## Problem Statement

From Feb 28 testing:
1. Timer moves when steps auto-advance — `scrollIntoView` scrolls the entire page because the flex container isn't height-constrained (`min-h-screen` allows growth instead of internal scrolling)
2. `font-light` (weight 300) reduces legibility at 2+ feet despite 72px size
3. `text-brew-800` (#3d2718) on transitioning background is lower contrast than pure dark-on-white
4. Timer is centered (`text-center`) — LTR readers look left first
5. Step cards use `p-4` padding and dark `bg-brew-800` fill on current step — too visually heavy

## Root Cause

The ActiveBrew root uses `min-h-screen flex flex-col`. Since `min-h-screen` sets a minimum but no maximum height, the `flex-1` steps container expands to fit all content rather than scrolling internally. When `scrollIntoView({ block: 'center' })` fires on step transitions, the browser scrolls the document (the nearest scrollable ancestor), which moves the timer.

## Proposed Solution

Convert ActiveBrew to a **fixed viewport overlay** below the Header. This constrains the flex container to exact available viewport height, making the steps container scroll internally while the timer stays pinned at the top.

### Layout Structure

```
┌─────────────────────────────────┐
│ Header (sticky, unchanged)       │  ← h-12 / md:h-14
├─────────────────────────────────┤
│ 3:42          Target: 3:00-3:30 │  ← Timer: left-aligned, 72px, medium weight
│ ━━━━━━━━━░░░░░        [Pause]   │  ← Progress bar + control
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌ shadow ╌╌╌╌╌╌╌╌╌┤  ← Visual separator
│ ✓ Bloom — 0:00          → 60g  │  ← Past step (dimmed, compact)
│ ▶ First Pour — 0:45    → 160g  │  ← Current step (highlighted)
│   Second Pour — 1:30   → 240g  │  ← Future step (dimmed)
│   Final Pour — 2:15    → 320g  │
│   Drawdown — 2:45               │  ← Steps scroll in this zone
│                                  │
├─────────────────────────────────┤
│         [Finish Brew]            │  ← Fixed bottom (unchanged)
└─────────────────────────────────┘
```

## Technical Approach

All changes in `src/components/BrewScreen.jsx`, function `ActiveBrew` (line 513+). No changes to Phase 0, 1, or 3.

### Change 1: Fixed viewport overlay on ActiveBrew root

**Lines 596-598** — Replace `min-h-screen flex flex-col` with fixed positioning:

```jsx
// BEFORE
<div className={`min-h-screen flex flex-col transition-colors duration-700 ...`}>

// AFTER
<div className={`fixed top-12 md:top-14 left-0 right-0 bottom-0 flex flex-col
                 transition-colors duration-700 motion-reduce:transition-none z-10 ${
  timer.running ? 'bg-white' : 'bg-brew-50'
}`}>
```

Why `fixed` on the root instead of `sticky` on the timer:
- `fixed top-12` positions ActiveBrew directly below the Header (`h-12` mobile, `h-14` desktop)
- The flex column is now height-constrained to the remaining viewport
- `flex-1 overflow-y-auto` on the steps container works correctly — steps scroll internally
- Timer stays at top naturally as the first flex child — no sticky/fixed needed on the timer itself
- PhaseIndicator (rendered by parent BrewScreen) is naturally behind the overlay during Phase 2
- MobileNav is already hidden during brew flow

### Change 2: Left-aligned timer with higher contrast

**Lines 600-617** — Restructure timer section:

```jsx
<div className="px-5 pt-6 pb-3">
  {/* Timer row: time left, target right */}
  <div className="flex items-baseline justify-between">
    <div className="font-mono text-7xl font-medium text-gray-900 leading-none tabular-nums tracking-tight">
      {formatTime(timer.elapsed)}
    </div>
    <div className="text-sm text-brew-400 tabular-nums">
      Target: {recipe.targetTimeRange || formatTime(recipe.targetTime)}
    </div>
  </div>

  {/* Progress bar — full width */}
  <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-1000 linear ${
        overTime ? 'bg-red-500' : 'bg-brew-500'
      }`}
      style={{ width: `${progress * 100}%` }}
    />
  </div>
</div>
```

Key changes:
- **`text-center` → flex row**: Timer digits left, target time right
- **`font-light` → `font-medium`**: Weight 500 instead of 300 — much more legible at distance
- **`text-brew-800` → `text-gray-900`**: Maximum contrast (#111827 on white)
- **Padding reduced**: `pt-10 pb-5` → `pt-6 pb-3` — less vertical space consumed
- **Progress bar**: Taller (`h-1` vs `h-0.5`), full width (remove `max-w-[200px] mx-auto`), neutral track (`bg-gray-200`)
- **Overtime indicator**: Add `${overTime ? 'text-red-600' : 'text-gray-900'}` to timer digits so overtime is visible at distance (not just the thin progress bar)

### Change 3: Compact controls with fixed-height container

**Lines 620-657** — Wrap all control states in a fixed-height container to prevent layout shifts when switching between Start/Pause/Resume:

```jsx
{/* Controls — fixed height container prevents layout shift */}
<div className="flex items-center justify-center h-20 shrink-0">
  {!hasStarted && (
    <div className="text-center">
      <button onClick={() => timer.play()}
        className="w-[72px] h-[72px] rounded-full bg-brew-800 text-white text-2xl
                   shadow-xl flex items-center justify-center mx-auto
                   hover:bg-brew-700 active:scale-95 transition-all min-h-[44px]"
        aria-label="Start brew">
        ▶
      </button>
    </div>
  )}
  {timer.running && (
    <button onClick={() => timer.pause()}
      className="border border-brew-200 rounded-full px-5 py-1.5 text-xs text-brew-400
                 hover:bg-brew-50 min-h-[44px] min-w-[44px]">
      Pause
    </button>
  )}
  {!timer.running && hasStarted && (
    <button onClick={() => timer.play()}
      className="bg-brew-800 text-white rounded-full px-6 py-2 text-sm font-semibold
                 hover:bg-brew-700 active:scale-95 transition-all min-h-[44px]">
      Resume
    </button>
  )}
</div>
```

Key changes:
- **Fixed `h-20` container** (80px): Holds the 72px Start button at max, stays same height for smaller Pause/Resume buttons
- **`shrink-0`**: Prevents flex shrink on small screens
- Remove "Tap to start brewing" hint text (the giant play button is self-evident)
- Remove wrapping `<div className="text-center pb-5">` / `pb-3` — the fixed-height container handles spacing

### Change 4: Shadow separator between timer and steps

Add `shadow-md` to the timer+controls wrapper to visually separate pinned area from scrolling steps:

```jsx
{/* Pinned timer area */}
<div className="bg-white shadow-md">
  {/* Timer display (Change 2) */}
  {/* Controls (Change 3) */}
</div>

{/* Step Teleprompter */}
<div ref={stepsContainerRef} className="flex-1 px-4 pb-36 overflow-y-auto">
```

The shadow creates a clear visual boundary between the fixed timer and scrolling content, preventing white-on-white merging.

### Change 5: Lighter step cards

**Lines 670-735** — Reduce step card visual weight:

```jsx
<div
  key={step.id}
  ref={el => (stepRefs.current[step.id] = el)}
  onClick={() => timer.running && !isPast && !skipped && handleTapStep(step)}
  className={`p-3 mb-1.5 rounded-lg relative transition-all duration-400 min-h-[44px]
              motion-reduce:transition-none ${
    skipped
      ? 'bg-gray-50 text-gray-300 line-through opacity-40'
      : isCurrent
        ? 'bg-brew-50 border-l-4 border-l-brew-600 text-brew-900'
        : isPast
          ? 'bg-gray-50 text-gray-400'
          : 'bg-white border border-gray-100'
  } ${timer.running && isFuture ? 'opacity-40' : ''} ${
    timer.running && !isPast && !skipped ? 'cursor-pointer' : ''
  }`}
>
```

Key changes:
- **Padding**: `p-4` → `p-3` (12px vs 16px) — saves 8px per card
- **Margin**: `mb-2` → `mb-1.5` — tighter spacing
- **Border radius**: `rounded-xl` → `rounded-lg` — slightly less rounded
- **`min-h-[44px]`**: Explicitly enforce 44px touch target (CLAUDE.md pattern)
- **Current step**: `bg-brew-800 text-white` → `bg-brew-50 border-l-4 border-l-brew-600 text-brew-900` — left-accent highlight instead of dark fill. Much lighter visual weight while still clearly marking the active step.
- **Past steps**: `bg-brew-50 text-brew-400` → `bg-gray-50 text-gray-400` — neutral gray instead of warm tint
- **Future steps**: `border-brew-100` → `border-gray-100` — lighter borders
- **Skipped steps**: Use gray tones for consistency

Also update the **current step's inner elements** to match the new light background:
- Water badge: remove the dark-bg variant (`isCurrent ? 'text-amber-200 bg-white/10'`), keep only the light variant
- Variance text: use `text-green-600` / `text-amber-500` (no need for light-on-dark variants)
- Tap prompt: `text-white/50` → `text-brew-400` (dark prompt on light bg)
- Skip button: `text-white/40` → `text-brew-300` for current step

### Change 6: Fix auto-scroll to work within steps container

**Lines 547-554** — Replace `scrollIntoView` with manual scroll calculation that targets the steps container, not the document:

```jsx
useEffect(() => {
  if (!timer.running) return
  const currentStep = steps[currentStepIdx]
  const ref = stepRefs.current[currentStep?.id]
  const container = stepsContainerRef.current
  if (ref && container) {
    const stepTop = ref.offsetTop - container.offsetTop
    container.scrollTo({
      top: Math.max(0, stepTop - 16),
      behavior: 'smooth'
    })
  }
}, [currentStepIdx, timer.running, steps])
```

Key changes:
- **`ref.scrollIntoView()`** → **`container.scrollTo()`**: Scroll within the steps container, not the document
- **`block: 'center'`** → **scroll to top with 16px padding**: Step appears just below the shadow separator
- This eliminates the root cause of the timer movement bug

### Change 7: Adjust Finish button z-index

The Finish button (line 742) is already `fixed bottom-0 ... z-10`. Since ActiveBrew is now also `z-10`, and the Finish button renders after the steps container in the DOM, it naturally layers above. No z-index change needed, but verify stacking visually.

## Acceptance Criteria

- [x] Timer is pinned to the top of the viewport during active brew — never moves when steps change
- [x] Timer text is left-aligned, `font-medium` weight, `text-gray-900` color
- [x] Timer is readable from 2 feet away (72px monospace, weight 500, max contrast)
- [x] Timer digits turn red when brew exceeds target time
- [x] Steps scroll independently beneath the timer in their own scroll container
- [x] Current step is highlighted with left-accent border (not dark fill)
- [x] Step cards maintain `min-h-[44px]` touch targets
- [x] Shadow separator clearly divides timer from steps
- [x] Start/Pause/Resume buttons are in a fixed-height container — no layout shift on state change
- [x] Wake lock remains active during timer running (`useWakeLock(timer.running)` — unchanged)
- [x] `prefers-reduced-motion` respected on all transitions (`motion-reduce:transition-none`)
- [x] Phases 0, 1, and 3 are unchanged
- [x] Header remains visible above ActiveBrew

## Pixel Budget (iPhone SE worst case)

| Element | Height |
|---|---|
| Header | 48px |
| Timer section (digits + target + progress) | ~80px |
| Controls container | 80px |
| **Available for steps** | **~379px** |
| Finish button overlay | 80px |

379px fits 4-5 compact step cards (60-70px each). Adequate for typical V60 recipes (3-5 steps).

## Out of Scope

- Landscape orientation handling
- Screen reader `aria-live` regions for timer updates
- User-scroll vs auto-scroll conflict detection (debounce)
- PhaseIndicator visibility changes (naturally hidden behind overlay)
- Changes to useTimer or useWakeLock hooks
- Changes to any phase other than Phase 2 (ActiveBrew)

## References

- ActiveBrew component: `src/components/BrewScreen.jsx:513`
- useWakeLock hook: `src/hooks/useWakeLock.js`
- useTimer hook: `src/hooks/useTimer.js`
- Header sticky pattern: `src/components/Header.jsx:16`
- MobileNav fixed pattern: `src/components/MobileNav.jsx:53`
- Tailwind config (brew palette): `tailwind.config.js:11`
- Institutional learning — persist/restore: `docs/solutions/react-patterns/persist-and-restore-must-be-end-to-end.md`
