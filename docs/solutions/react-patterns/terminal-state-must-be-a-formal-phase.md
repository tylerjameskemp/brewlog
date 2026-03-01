---
title: "Terminal states in phase machines must be formal phases, not boolean flags"
category: react-patterns
tags: [phase-machine, state-management, navigation, mobilenav, brewscreen]
module: BrewScreen, PostBrewCommit, App
symptoms:
  - "MobileNav disappears after completing a flow and never reappears"
  - "Navigation is trapped on a success/completion screen"
  - "onFlowChange called from two separate paths (effect + imperative)"
  - "Same boolean state duplicated across parent and child components"
  - "PhaseIndicator shows during a terminal state when it should be hidden"
date: 2026-03-01
severity: P1
---

# Terminal states in phase machines must be formal phases, not boolean flags

## Problem

BrewScreen uses a phase machine (`pick -> recipe -> brew -> commit`) with an `onFlowChange` effect that hides MobileNav during active phases:

```jsx
useEffect(() => {
  onFlowChange(phase !== 'pick')
}, [phase, onFlowChange])
```

After the user commits a brew, `PostBrewCommit` renders a success screen using a local `committed` boolean — but `phase` stays `'commit'`. Since `'commit' !== 'pick'` is still `true`, MobileNav stays hidden. On mobile, the user is trapped with only a "View in History" link.

## Wrong Fix (What We Did First)

Passed `onFlowChange` into `PostBrewCommit` and called `onFlowChange(false)` directly alongside `setCommitted(true)`:

```jsx
// Inside PostBrewCommit.handleCommit
clearActiveBrew()
setCommitted(true)        // local state — shows success screen
onFlowChange(false)       // imperative call — restores MobileNav
onCommitted()             // callback — tells parent to hide PhaseIndicator
```

This worked but created three problems:

1. **Dual `committed` state** — Both PostBrewCommit and BrewScreen held `committed` booleans that had to stay in sync via an `onCommitted` callback.
2. **Dual-path onFlowChange** — The effect owned `onFlowChange` reactively, but `handleCommit` also called it imperatively. The safety depended on `committed` not being in the effect's dependency array — a fragile invariant.
3. **Prop explosion** — PostBrewCommit grew from 7 to 10 props, three of which existed only to work around the missing phase.

## Right Fix

Promote `committed` to a formal phase in the state machine:

```
pick -> recipe -> brew -> commit -> committed
```

The existing `onFlowChange` effect handles it naturally:

```jsx
useEffect(() => {
  onFlowChange(phase !== 'pick' && phase !== 'committed')
}, [phase, onFlowChange])
```

PostBrewCommit calls a single `onCommit` callback:

```jsx
// Inside PostBrewCommit.handleCommit
clearActiveBrew()
onCommit()  // parent sets phase = 'committed'
```

BrewScreen renders the success screen for `phase === 'committed'`:

```jsx
{phase === 'committed' && (
  <div className="...">
    <button onClick={handleStartNewBrew}>Start New Brew</button>
    <button onClick={() => onNavigate('history')}>View in History</button>
  </div>
)}
```

## What This Eliminated

- `committed` state in BrewScreen (1 useState)
- `committed` state in PostBrewCommit (1 useState)
- `onCommitted` callback prop
- `onFlowChange` prop on PostBrewCommit
- `onStartNewBrew` inline 5-setter (replaced with named `handleStartNewBrew`)
- Direct `onFlowChange(false)` call (the effect handles it)
- PostBrewCommit props: 10 -> 7

## Rule

**If a component's phase machine has a terminal state that affects parent behavior (navigation, layout, visibility), that terminal state must be a value in the phase enum — not a boolean layered on top of the last active phase.**

Signs you need a formal phase:
- A parent checks `phase !== X && !someFlag` (compound boolean = missing phase)
- A child calls a parent callback that the phase effect should own
- The same boolean exists in both parent and child

## Related

- `todos/036-complete-p2-flow-change-cleanup-thrash.md` — Prior onFlowChange effect cleanup issue
- PR #20 — The fix that introduced and then corrected this pattern
