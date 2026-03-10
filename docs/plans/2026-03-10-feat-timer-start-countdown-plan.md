---
title: "feat: Add 3-second countdown before brew timer starts"
type: feat
date: 2026-03-10
---

# Add 3-Second Countdown Before Brew Timer Starts

## Overview

When the brewer taps the play button in ActiveBrew, show a 3→2→1 countdown before the timer starts. This gives the brewer time to get their hands in position (kettle ready, scale tared) before the clock begins.

## Proposed Solution

Add a `countdown` local state inside the ActiveBrew sub-component. When the play button is tapped, instead of calling `timer.play()` directly, start a 3-second countdown. On reaching 0, call `timer.play()`. The countdown replaces the play button UI with large animated numbers.

### Insertion Point

`src/components/BrewScreen.jsx`, ActiveBrew sub-component, lines ~806-820 — the `!hasStarted` control block where the play button currently lives.

**Current flow:** Tap play → `timer.play()` immediately

**New flow:** Tap play → countdown 3→2→1 → `timer.play()`

## Technical Considerations

### State Management

```jsx
// Inside ActiveBrew
const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1
```

- `countdown !== null` renders the countdown UI instead of the play button
- On reaching 0, call `timer.play()` and set `countdown` back to `null`
- Add `countdown` to the cancel/cleanup path

### Countdown Logic

```jsx
// src/components/BrewScreen.jsx — ActiveBrew
useEffect(() => {
  if (countdown === null || countdown <= 0) return;
  const id = setTimeout(() => {
    if (countdown === 1) {
      timer.play();
      setCountdown(null);
    } else {
      setCountdown(countdown - 1);
    }
  }, 1000);
  return () => clearTimeout(id);
}, [countdown]);
```

Use `setTimeout` (not `setInterval`) — one tick per render, cleanup on unmount. This avoids stale closure issues.

### Countdown UI

Replace the play button with a large centered number using `font-display` (Fraunces) for the emotional moment. Each number gets a scale+fade animation via a new Tailwind keyframe.

```jsx
// Render block when countdown is active
{countdown !== null && (
  <div className="flex flex-col items-center justify-center gap-3">
    <div
      key={countdown}
      className="text-8xl font-display font-bold text-crema-500 animate-countdown-tick motion-reduce:animate-none"
    >
      {countdown}
    </div>
    <p className="text-brew-400 text-sm tracking-wide">Get ready...</p>
  </div>
)}
```

The `key={countdown}` forces React to remount the element on each tick, re-triggering the CSS animation.

### New Tailwind Keyframe

```js
// tailwind.config.js
'countdown-tick': {
  '0%': { opacity: '0', transform: 'scale(1.5)' },
  '20%': { opacity: '1', transform: 'scale(1)' },
  '80%': { opacity: '1', transform: 'scale(1)' },
  '100%': { opacity: '0.3', transform: 'scale(0.8)' },
},
// animation
'countdown-tick': 'countdown-tick 1s ease-out forwards',
```

### Cancel During Countdown

Add a "Cancel" button below the countdown number. Tapping it sets `countdown` back to `null`, returning to the play button.

### Skip Countdown on Crash Recovery

The `savedBrewState` prop signals crash recovery. When restoring, `timer.restore()` is called directly — the countdown must NOT appear. The countdown only triggers from the play button tap in the `!hasStarted && countdown === null` state.

### Reset Handler

Per documented learnings (`docs/solutions/react-patterns/reset-handler-must-clear-all-related-state.md`): if a `handleStartNewBrew` or similar reset runs, `countdown` must be cleared. Since `countdown` is local to ActiveBrew and ActiveBrew unmounts on phase change, this is handled automatically by React.

### No Persistence Needed

A 3-second countdown does not need crash recovery persistence. If the app crashes during countdown, the user simply taps play again.

## Acceptance Criteria

- [x] Tapping play in ActiveBrew shows 3→2→1 countdown with animated numbers
- [x] Timer starts automatically after countdown reaches 0
- [x] "Cancel" button returns to play button during countdown
- [x] Crash recovery (`savedBrewState`) skips countdown entirely
- [x] Animation respects `prefers-reduced-motion` via `motion-reduce:animate-none`
- [x] `npm run build` passes

## Files to Modify

1. `src/components/BrewScreen.jsx` — ActiveBrew: countdown state, effect, UI
2. `tailwind.config.js` — New `countdown-tick` keyframe and animation

## References

- Timer hook: `src/hooks/useTimer.js`
- ActiveBrew play button: `src/components/BrewScreen.jsx:806-820`
- Animation patterns: `tailwind.config.js:84-136`
- Learnings: `docs/solutions/react-patterns/reset-handler-must-clear-all-related-state.md`
- Learnings: `docs/solutions/react-patterns/timer-stop-must-flush-pause-gap.md`
