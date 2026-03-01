---
title: "fix: BrewScreen navigation bugs — MobileNav hidden after commit + back button invisible"
type: fix
date: 2026-03-01
---

# fix: BrewScreen navigation bugs

## Problem

Two navigation failures trap users on mobile:

**Bug A — MobileNav disappears after brew commit.** After committing a brew, the success screen (PostBrewCommit, line 844) renders, but `phase` stays `'commit'`. The `onFlowChange` effect (line 1093) keeps reporting `phase !== 'pick'` → `true`, so `brewFlowActive` stays `true` in App.jsx and MobileNav remains unmounted (line 180). The success screen offers only a "View in History" button — no way to start a new brew or navigate to other tabs on mobile.

**Bug B — Back button in Phase 1 too subtle.** The RecipeAssembly back button (lines 404-412) is a 20×20px gray SVG chevron in `text-brew-400`. The touch target is correct (44×44px) but the visual affordance is too weak — users don't see it and feel trapped after selecting a bean.

## Fix

### Bug A: Restore MobileNav after commit

**Approach:** Pass `onFlowChange` to `PostBrewCommit`. Call `onFlowChange(false)` alongside `setCommitted(true)` in `handleCommit`. This restores MobileNav on the success screen. Also add a "Start New Brew" button that resets BrewScreen state.

**Changes in `src/components/BrewScreen.jsx`:**

1. **PostBrewCommit props** (line 759): Add `onFlowChange` and `onStartNewBrew` to destructured props.

2. **handleCommit** (line 838): After `setCommitted(true)`, add `onFlowChange(false)`.

3. **Success screen** (lines 844-864): Add a "Start New Brew" button that calls `onStartNewBrew()`. Change container from `min-h-screen` to account for MobileNav padding (`pb-32`). Keep "View in History" as the secondary action.

4. **BrewScreen render** (lines 1181-1191): Pass `onFlowChange` and a new `onStartNewBrew` callback to PostBrewCommit. The callback resets: `setSelectedBean(null)`, `setBrewData(null)`, `setSavedBrewState(null)`, `setPhase('pick')`.

5. **PhaseIndicator** (line 1149): Hide during committed state. Add a `committed` state variable to BrewScreen (set via an `onCommitted` callback passed to PostBrewCommit), and conditionally hide: `{phase !== 'pick' && !committed && <PhaseIndicator ... />}`.

**Changes in `src/App.jsx`:** None. The existing `onFlowChange={setBrewFlowActive}` at line 131 handles it.

### Bug B: Make back button prominent

**Changes in `src/components/BrewScreen.jsx`** (RecipeAssembly, lines 404-412):

1. Add "Back" text label next to the chevron arrow.
2. Increase icon contrast from `text-brew-400` to `text-brew-500`.
3. Add visible text: `<span className="text-sm font-medium">Back</span>` after the SVG.

Result: `← Back` visible in the top-left corner of the Recipe phase, clearly actionable.

## Acceptance Criteria

- [x] Complete a full brew through commit on mobile viewport. MobileNav is visible on the success screen.
- [x] Success screen shows both "Start New Brew" and "View in History" buttons.
- [x] Tap "Start New Brew" → returns to bean picker with clean state. Select a bean → recipe pre-fills correctly.
- [x] Tap "View in History" → navigates to history tab, MobileNav visible.
- [x] In Phase 1 (recipe), back button shows "← Back" text and navigates to bean picker.
- [x] Select bean A → recipe → tap Back → select bean B → recipe shows bean B's data.
- [x] Enter from BeanLibrary "Brew" button → recipe → Back → bean picker renders (expected behavior).
- [x] PhaseIndicator hidden on success screen.
- [x] No layout shift/flash when MobileNav reappears on success screen.
- [x] Desktop: Header tabs still work throughout the flow (no regression).

## MVP

### src/components/BrewScreen.jsx — PostBrewCommit props (line 759)

```jsx
function PostBrewCommit({ recipe, bean, brewData, equipment, onBrewSaved, setBeans, onNavigate, onFlowChange, onStartNewBrew }) {
```

### src/components/BrewScreen.jsx — handleCommit (after line 838)

```jsx
clearActiveBrew()
setCommitted(true)
onFlowChange(false)
```

### src/components/BrewScreen.jsx — Success screen (lines 844-864)

```jsx
if (committed) {
  return (
    <div className="flex flex-col items-center justify-center p-10 pb-32 text-center
                    animate-fade-in motion-reduce:animate-none" style={{ minHeight: 'calc(100vh - 3rem)' }}>
      <div className="w-20 h-20 rounded-full bg-brew-50 flex items-center justify-center
                      text-4xl text-brew-500 mb-5">
        ✓
      </div>
      <h2 className="text-2xl font-semibold text-brew-800 mb-2">Brew Committed</h2>
      <p className="text-sm text-brew-400 leading-relaxed max-w-[260px]">
        Your brew report is saved. You can edit it anytime from your brew history.
      </p>
      <div className="flex flex-col gap-3 mt-6 w-full max-w-[260px]">
        <button
          onClick={onStartNewBrew}
          className="bg-brew-800 text-white rounded-xl px-8 py-3.5 text-sm font-semibold
                     hover:bg-brew-700 active:scale-[0.98] transition-all min-h-[44px]"
        >
          Start New Brew
        </button>
        <button
          onClick={() => onNavigate('history')}
          className="border border-brew-200 text-brew-600 rounded-xl px-8 py-3.5 text-sm font-semibold
                     hover:bg-brew-50 active:scale-[0.98] transition-all min-h-[44px]"
        >
          View in History
        </button>
      </div>
    </div>
  )
}
```

### src/components/BrewScreen.jsx — RecipeAssembly back button (lines 404-412)

```jsx
<button
  onClick={onBack}
  className="text-brew-500 hover:text-brew-700 min-h-[44px] flex items-center gap-1 -ml-2 px-2"
  aria-label="Back to bean selection"
>
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4l-6 6 6 6" />
  </svg>
  <span className="text-sm font-medium">Back</span>
</button>
```

### src/components/BrewScreen.jsx — BrewScreen render, PostBrewCommit call (lines 1181-1191)

```jsx
{phase === 'commit' && brewData && selectedBean && (
  <PostBrewCommit
    recipe={recipe}
    bean={selectedBean}
    brewData={brewData}
    equipment={equipment}
    onBrewSaved={onBrewSaved}
    setBeans={setBeans}
    onNavigate={onNavigate}
    onFlowChange={onFlowChange}
    onStartNewBrew={() => {
      setSelectedBean(null)
      setBrewData(null)
      setSavedBrewState(null)
      setPhase('pick')
    }}
  />
)}
```

### src/components/BrewScreen.jsx — PhaseIndicator conditional (line 1149)

Track committed state in BrewScreen to hide PhaseIndicator:

```jsx
const [committed, setCommitted] = useState(false)
```

Pass `onCommitted={() => setCommitted(true)}` to PostBrewCommit, call it alongside `setCommitted(true)` inside PostBrewCommit. Then:

```jsx
{phase !== 'pick' && !committed && <PhaseIndicator phase={phase} />}
```

## References

- Related todo: `todos/036-complete-p2-flow-change-cleanup-thrash.md` (onFlowChange effect cleanup)
- Lesson: `docs/solutions/react-patterns/unconstrained-flex-causes-scrollintoview-to-scroll-document.md` (min-h-screen layout issues)
