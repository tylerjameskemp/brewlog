---
title: "feat: Timeline Step Editor Redesign"
type: feat
date: 2026-03-04
brainstorm: docs/brainstorms/2026-03-04-timeline-step-editor-brainstorm.md
---

# feat: Timeline Step Editor Redesign

## Overview

Replace the confusing step input UI (`45 sec 0:00 @ 50 g`) with a vertical timeline-based editor that shows human-readable time ranges (`0:00 → 0:45 · Bloom · pour to 45g`). Smart time input accepts raw seconds and displays MM:SS. Compact/expand cards keep the interface clean. The same timeline visual language carries into the ActiveBrew teleprompter with a real-time playhead and a recipe reference strip.

**No data model changes.** Steps remain `{ id, name, time, duration, waterTo, note }`. This is purely a UI/display improvement.

## Problem Statement

When a user has a recipe like:
```
1. 0:00–0:10 | Bloom to 45g — spiral pour, gentle stir
2. 0:45–0:55 | Second bloom to 90g
3. 1:15–2:45 | Pulse pours to 270g
```

The current UI forces them to translate this into raw fields: `Duration: 10 / Start: 0 / Water: 45`. The labels are cryptic (`sec`, `@`, `g` with no context), there's no visual timeline, and users must mentally calculate seconds.

## Proposed Solution

Two-phase redesign:
- **Phase 1:** Redesigned StepEditor with timeline bar, smart time input, compact/expand cards, split-step
- **Phase 2:** ActiveBrew timeline with playhead, recipe reference strip

---

## Technical Approach

### Architecture

**Components affected:**

| Component | Change Type | Description |
|---|---|---|
| `StepEditor.jsx` | **Major rewrite** | New timeline layout, compact/expand, smart time input, split-step |
| `BrewScreen.jsx` (ActiveBrew) | **Significant modification** | Timeline teleprompter with playhead, recipe reference strip |
| `BrewScreen.jsx` (RecipeAssembly) | **Minor** | No prop changes — StepEditor API stays the same |
| `BrewForm.jsx` | **Minor** | No prop changes — StepEditor API stays the same |
| `storage.js` | **No changes** | Data model unchanged |
| `tailwind.config.js` | **Minor** | New keyframe for playhead pulse animation |

**Key architectural constraint:** StepEditor's external API (`steps`, `onChange`, `disabled`, `hint`, `cascadeTime`, `plannedSteps`) does NOT change. All redesign is internal to StepEditor and ActiveBrew. Consumers don't need modifications.

### Critical Design Decisions (Resolving Spec-Flow Gaps)

#### D1: Accordion Pattern (Single Expanded Step)
- One step expanded at a time, tracked via `expandedStepId` state (`string | null`) inside StepEditor
- Tapping a collapsed step expands it and collapses the previous
- Tapping an expanded step's header collapses it
- Matches existing patterns: BeanLibrary (`expandedBeanId`), BrewHistory (`expandedId`)
- **Initial state on mount:** All collapsed. Exception: when `handleAdd` or split creates a new step, auto-expand it

#### D2: Diff Annotations in Collapsed View
- Steps with diffs show a **colored left border**: `border-l-2 border-amber-400` on the collapsed one-liner
- Steps marked "added" show a **green left border**: `border-l-2 border-green-400`
- Removed steps render as strikethrough one-liners (no expand) — same as current `RemovedStepRow` but in one-line format
- **Auto-expand on mount in BrewForm:** No. The colored border is sufficient to draw attention. User taps to see details.

#### D3: Collapsed One-Liner Format

Format: `{timeRange} · {name} · {waterTarget}`

| Field | Null/Empty Rendering |
|---|---|
| `time` null | Show `0:00` (step starts at beginning) |
| `duration` null | Hide end time: show `0:00 →` with no end |
| `name` empty | Show `Step {index+1}` as fallback |
| `waterTo` null | Hide "pour to Xg" segment entirely (e.g., Drawdown steps) |

Examples:
- `0:00 → 0:40 · Bloom · pour to 42g`
- `1:30 → 2:00 · Final Pour · pour to 240g`
- `2:00 → 3:30 · Drawdown` (no water target)
- `0:00 → · Step 1` (duration unknown, name empty)

#### D4: Smart Time Input
- Input fields use `type="text"` with `inputMode="numeric"` (mobile number keyboard without restrictions)
- **Display state:** Show formatted MM:SS (e.g., "0:45")
- **Edit state:** On focus, show raw seconds (e.g., "45") for easy typing
- **On blur:** Parse input → if valid number, store as seconds, display as MM:SS. If invalid, revert to previous value
- Uses a local `displayValue` state per input (two-variable pattern from existing `targetTimeInput` in RecipeAssembly)
- Avoids the paired-input blur race: blur normalizes only its own field; cascade fires from `onChange` callback, not from blur

#### D5: Split-Step Rules
- **Availability:** Only when `!disabled` AND `cascadeTime` is true (RecipeAssembly planning context only). Not available in BrewForm.
- **Duration:** Split 50/50, rounded down for first half, remainder for second: `d1 = Math.floor(duration/2)`, `d2 = duration - d1`
- **waterTo:** First half keeps original `waterTo`. Second half gets `null` (user must set it — splitting a "pour to 90g" into two steps doesn't automatically mean "pour to 45g then 90g")
- **name:** First half: `"{name} (1)"`. Second half: `"{name} (2)"`. Empty name: `"Step {n} (1)"`, `"Step {n} (2)"`
- **note:** First half keeps the original note. Second half gets empty string.
- **id:** New step gets `Math.max(...steps.map(s => s.id || 0)) + 1` (same pattern as `handleAdd`)
- **Post-split:** `recascade()` runs immediately (since `cascadeTime` is true). The new step auto-expands.

#### D6: ActiveBrew Playhead
- **1Hz movement** matching existing timer tick — no `requestAnimationFrame` needed
- Mini progress bar within current step uses `transition-[width] duration-1000 linear` (same pattern as existing header progress bar) for smooth visual fill between ticks
- Playhead is a visual indicator on the timeline bar (pulsing dot at current step position)
- When all steps are past and timer still running: all steps collapsed with checkmarks, pulsing dot at bottom of timeline, main timer shows red "over time" styling (existing behavior preserved)

#### D7: Recipe Reference Strip
- Single line pinned below progress bar, above controls: `{coffeeGrams}g · {grindSetting} · {waterGrams}g target`
- Uses `text-xs text-brew-400 font-mono` styling (matches existing compact summary patterns)
- Fields with null/empty values are omitted (segments joined by ` · `)
- `grindSetting` shown as raw stored value (already display-ready)
- Inside the existing `shrink-0` header div — adds ~24px height (one text-xs line + padding)
- On very narrow screens (<320px), `truncate` prevents overflow

#### D8: Step Reordering — Explicitly Excluded
Not part of this redesign. The brainstorm explicitly listed drag-to-reorder as "Out of Scope (Future)".

---

### Implementation Phases

#### Phase 1: StepEditor Redesign

##### Step 1.1: Smart Time Input Helper

Create a reusable time input pattern inside StepEditor.

**File:** `src/components/StepEditor.jsx` (internal to the component, not a new file)

```jsx
// Smart time input: displays MM:SS, edits as raw seconds
// Uses two-variable pattern: displayValue (string) + canonical value (number)
function TimeInput({ value, onChange, disabled, placeholder, label }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const display = formatTimeDisplay(value)

  const handleFocus = () => {
    setEditing(true)
    setDraft(value != null ? String(value) : '')
  }

  const handleBlur = () => {
    setEditing(false)
    const parsed = parseInt(draft, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed)
    }
    // else: revert (display snaps back to formatted canonical value)
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-brew-400">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={editing ? draft : display}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="w-14 px-2 py-1.5 rounded-lg border border-brew-200 text-sm
                   font-mono text-brew-800 text-center ..."
      />
    </div>
  )
}
```

**Acceptance criteria:**
- [ ] Displays MM:SS when not focused (`formatTimeDisplay`)
- [ ] Shows raw seconds when focused for easy editing
- [ ] Parses on blur; reverts on invalid input
- [ ] `inputMode="numeric"` for mobile number keyboard
- [ ] Never calls onChange during typing (only on blur commit)

##### Step 1.2: Collapsed One-Liner Component

**File:** `src/components/StepEditor.jsx`

```jsx
function StepOneLiner({ step, index, diff, onClick, disabled }) {
  const timeRange = `${formatTimeDisplay(step.time || 0)} → ${
    step.duration != null ? formatTimeDisplay((step.time || 0) + step.duration) : ''
  }`
  const name = step.name || `Step ${index + 1}`
  const water = step.waterTo != null ? `pour to ${step.waterTo}g` : null

  const borderClass = diff?.isAdded
    ? 'border-l-2 border-green-400'
    : diff?.fields ? 'border-l-2 border-amber-400'
    : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2.5 rounded-lg bg-brew-50/50
                  border border-brew-100 ${borderClass}
                  flex items-center gap-2 min-h-[44px] ...`}
    >
      {/* Timeline dot */}
      <span className="w-2 h-2 rounded-full bg-brew-300 flex-shrink-0" />
      {/* Content */}
      <span className="text-sm text-brew-700 truncate">
        <span className="font-mono text-brew-500">{timeRange}</span>
        <span className="text-brew-300 mx-1">·</span>
        <span className="font-medium">{name}</span>
        {water && (
          <>
            <span className="text-brew-300 mx-1">·</span>
            <span className="text-brew-400">{water}</span>
          </>
        )}
      </span>
      {/* Expand chevron */}
      {!disabled && <span className="text-brew-400 text-xs ml-auto flex-shrink-0">▾</span>}
    </button>
  )
}
```

**Acceptance criteria:**
- [ ] Shows time range in MM:SS → MM:SS format
- [ ] Shows step name (fallback to "Step N")
- [ ] Shows water target (hidden when null)
- [ ] Colored left border for diff (amber) and added (green) steps
- [ ] 44px min touch target
- [ ] Truncates gracefully on narrow screens

##### Step 1.3: Expanded Step Card

Refactor existing `StepRow` into an expanded card that appears when a step is selected.

**File:** `src/components/StepEditor.jsx`

```jsx
function StepExpanded({ step, index, onChange, onRemove, onSplit, onCollapse,
                        disabled, cascadeTime, diff }) {
  return (
    <div className="p-3 rounded-xl border bg-white border-brew-200 shadow-sm
                    animate-fade-in motion-reduce:animate-none">
      {/* Header: step number + name + collapse/remove buttons */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold text-brew-400 uppercase w-5">
          {index + 1}
        </span>
        <input type="text" value={step.name || ''} onChange={...}
               placeholder="e.g., Bloom, First pour" className="flex-1 ..." />
        <button onClick={onCollapse} className="...">▴</button>
        {!disabled && <button onClick={onRemove} className="...">✕</button>}
      </div>

      {/* Time range row: Start → End */}
      <div className="ml-7 flex items-center gap-2 mb-2">
        <TimeInput label="from" value={step.time} onChange={...}
                   disabled={disabled || cascadeTime} />
        <span className="text-brew-300">→</span>
        <TimeInput label="to" value={(step.time || 0) + (step.duration || 0)}
                   onChange={handleEndTimeChange} disabled={disabled} />
        <span className="text-[10px] text-brew-400 ml-1">
          ({step.duration || 0}s)
        </span>
        {diff?.fields?.duration != null && <DiffTag>planned: {diff.fields.duration}s</DiffTag>}
        {diff?.fields?.time != null && !cascadeTime && <DiffTag>...</DiffTag>}
      </div>

      {/* Water target row */}
      <div className="ml-7 flex items-center gap-2 mb-2">
        <span className="text-[10px] text-brew-400">pour to</span>
        <input type="number" value={step.waterTo ?? ''} onChange={...}
               placeholder="—" className="w-16 ..." />
        <span className="text-[10px] text-brew-400">g</span>
        {diff?.fields?.waterTo != null && <DiffTag>planned: {diff.fields.waterTo}g</DiffTag>}
      </div>

      {/* Technique note */}
      <div className="ml-7 mb-2">
        <input type="text" value={step.note || ''} onChange={...}
               placeholder="Technique note (optional)" className="w-full ..." />
      </div>

      {/* Split button (only in cascadeTime / planning context) */}
      {!disabled && cascadeTime && step.duration > 0 && (
        <div className="ml-7">
          <button onClick={onSplit}
                  className="text-[10px] text-brew-400 hover:text-brew-600 ...">
            Split step
          </button>
        </div>
      )}
    </div>
  )
}
```

**Key behavior — end time input:**
When the user edits the "to" time (end time), duration is recalculated: `newDuration = endTimeSeconds - (step.time || 0)`. If `cascadeTime` is true, subsequent steps recascade from the new duration.

**Acceptance criteria:**
- [ ] Name, time range (from → to), water target, note — all editable
- [ ] "from" time is read-only when `cascadeTime` (matches existing behavior)
- [ ] "to" time editable — updates duration on blur
- [ ] Duration shown as parenthetical `(40s)` next to time range
- [ ] Diff annotations preserved (DiffTag for each changed field)
- [ ] Split button only shown in planning context (`cascadeTime && !disabled`)
- [ ] Remove button preserved
- [ ] Collapse button (▴) to close
- [ ] `animate-fade-in motion-reduce:animate-none`

##### Step 1.4: Timeline Bar + Accordion Orchestration

Rewrite the main `StepEditor` render to compose the timeline.

**File:** `src/components/StepEditor.jsx`

```jsx
export default function StepEditor({ steps = [], onChange, disabled = false,
                                      hint, cascadeTime = false, plannedSteps }) {
  const [expandedStepId, setExpandedStepId] = useState(null)
  // ... existing diffData useMemo ...

  const handleToggle = (stepId) => {
    setExpandedStepId(prev => prev === stepId ? null : stepId)
  }

  const handleSplit = (index) => {
    const step = steps[index]
    const d1 = Math.floor((step.duration || 0) / 2)
    const d2 = (step.duration || 0) - d1
    const newId = Math.max(...steps.map(s => s.id || 0), 0) + 1
    const name = step.name || `Step ${index + 1}`

    const newSteps = [...steps]
    newSteps.splice(index, 1,
      { ...step, duration: d1, name: `${name} (1)` },
      { id: newId, name: `${name} (2)`, time: (step.time || 0) + d1,
        duration: d2, waterTo: null, note: '' }
    )
    if (cascadeTime) recascade(newSteps)
    onChange(newSteps)
    setExpandedStepId(newId) // auto-expand new step
  }

  const handleAdd = () => {
    const lastStep = steps[steps.length - 1]
    const nextTime = lastStep ? (lastStep.time || 0) + (lastStep.duration || 40) : 0
    const newId = (steps.length > 0 ? Math.max(...steps.map(s => s.id || 0)) : 0) + 1
    onChange([...steps, {
      id: newId, name: '', time: nextTime, duration: 40, waterTo: null, note: '',
    }])
    setExpandedStepId(newId) // auto-expand new step
  }

  return (
    <div className="space-y-1.5">
      {hint && <p className="text-[10px] text-brew-400 mb-1">{hint}</p>}

      {/* Timeline container */}
      <div className="relative">
        {/* Vertical timeline line */}
        {steps.length > 1 && (
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-brew-200" />
        )}

        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const isExpanded = expandedStepId === step.id
            const diff = diffData?.stepDiffs?.get(step.id)

            return isExpanded ? (
              <StepExpanded key={step.id} step={step} index={index}
                onChange={(updated) => handleStepChange(index, updated)}
                onRemove={() => handleRemove(index)}
                onSplit={() => handleSplit(index)}
                onCollapse={() => setExpandedStepId(null)}
                disabled={disabled} cascadeTime={cascadeTime} diff={diff} />
            ) : (
              <StepOneLiner key={step.id} step={step} index={index}
                diff={diff}
                onClick={() => !disabled && handleToggle(step.id)}
                disabled={disabled} />
            )
          })}

          {/* Removed steps (diff mode) */}
          {diffData?.removed?.map(step => (
            <RemovedStepOneLiner key={`removed-${step.id}`} step={step} />
          ))}
        </div>
      </div>

      {/* Add step button */}
      {!disabled && (
        <button onClick={handleAdd}
          className="w-full py-2.5 rounded-xl border-2 border-dashed
                     border-brew-200 text-sm font-medium text-brew-400 ...">
          + Add Step
        </button>
      )}
    </div>
  )
}
```

**Acceptance criteria:**
- [ ] Vertical timeline line connects step dots when 2+ steps
- [ ] Accordion: one step expanded at a time via `expandedStepId`
- [ ] New steps (add/split) auto-expand
- [ ] Split handler: 50/50 duration, waterTo null on second half, name suffixed
- [ ] `recascade()` fires after split when `cascadeTime`
- [ ] Removed steps (from diff) show as one-liner strikethrough
- [ ] Empty state preserved: "No steps yet. Add your first pour step below."
- [ ] All existing props preserved: `steps`, `onChange`, `disabled`, `hint`, `cascadeTime`, `plannedSteps`

##### Step 1.5: Tailwind Config Update

**File:** `tailwind.config.js`

Add a subtle pulse keyframe for the ActiveBrew playhead dot (used in Phase 2):

```js
'pulse-dot': {
  '0%, 100%': { opacity: '1', transform: 'scale(1)' },
  '50%': { opacity: '0.6', transform: 'scale(1.3)' },
}
```

And the animation utility: `'pulse-dot': 'pulse-dot 2s ease-in-out infinite'`

**Acceptance criteria:**
- [ ] New `animate-pulse-dot` utility available
- [ ] Paired with `motion-reduce:animate-none` at usage sites

---

#### Phase 2: ActiveBrew Timeline + Recipe Reference Strip

##### Step 2.1: Recipe Reference Strip

**File:** `src/components/BrewScreen.jsx` (inside ActiveBrew sub-component)

Insert between the progress bar and the controls `h-24` div.

```jsx
{/* Recipe reference strip */}
<div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs
                text-brew-400 font-mono">
  {recipe.coffeeGrams && <span>{recipe.coffeeGrams}g</span>}
  {recipe.coffeeGrams && recipe.grindSetting && <span>·</span>}
  {recipe.grindSetting && <span>{recipe.grindSetting}</span>}
  {(recipe.coffeeGrams || recipe.grindSetting) && recipe.waterGrams && <span>·</span>}
  {recipe.waterGrams && <span>{recipe.waterGrams}g target</span>}
</div>
```

**Acceptance criteria:**
- [ ] Shows coffee grams, grind setting, water target separated by `·`
- [ ] Omits segments with null/empty values (no "—" or "null")
- [ ] Pinned in header area (shrink-0), doesn't scroll
- [ ] `text-xs font-mono text-brew-400` — unobtrusive reference
- [ ] Adds ~24px to header height

##### Step 2.2: ActiveBrew Timeline Teleprompter

Refactor the step rendering in ActiveBrew to use timeline visual language.

**File:** `src/components/BrewScreen.jsx` (ActiveBrew sub-component, lines ~1000-1142)

**Structure:**

```jsx
{/* Timeline container */}
<div className="relative px-4 pb-36">
  {/* Vertical timeline line */}
  <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-brew-100" />

  {sortedSteps.map((step, index) => {
    const isPast = /* tapped or time elapsed */
    const isCurrent = index === currentStepIdx
    const isFuture = !isPast && !isCurrent
    const isSkipped = skippedSteps[step.id]

    if (isSkipped) return <SkippedStepDot key={step.id} step={step} />

    if (isPast) return (
      <PastStepRow key={step.id} step={step}
        tappedAt={tappedSteps[step.id]} />
    )

    if (isCurrent) return (
      <CurrentStepCard key={step.id} step={step}
        elapsed={elapsed} onTap={handleTapStep} onSkip={handleSkipStep}
        ref={el => stepRefs.current[step.id] = el} />
    )

    return (
      <FutureStepRow key={step.id} step={step}
        isNext={index === currentStepIdx + 1} />
    )
  })}
</div>
```

**PastStepRow** — compact one-liner:
```
[✓ dot] 0:00 → 0:40 · Bloom · 42g    tapped 0:38
```
- Green dot on timeline, `bg-gray-50` background, `text-gray-400`
- Tapped time shown right-aligned

**CurrentStepCard** — expanded with progress bar:
```
[● pulsing dot] Bloom                          → 42g
                from 0:00 → 0:40
                "Gentle spiral pour, let degas"
                [====== mini progress ======]
                Tap when you start this step
```
- `bg-amber-50 border-l-4 border-l-brew-600` (matches current styling)
- Pulsing dot (`animate-pulse-dot motion-reduce:animate-none`) on timeline
- Mini progress bar: width = `clamp(0, (elapsed - step.time) / step.duration * 100, 100)%`
- Progress bar uses `transition-[width] duration-1000 linear` for smooth fill
- Technique note visible
- 44px tap target for step recording

**FutureStepRow** — compact, dimmed:
```
[○ dot] 0:40 → 1:30 · First Pour · 160g
```
- `opacity-70` for next step, `opacity-40` for further future
- Empty circle on timeline
- Shows time range + name + water target

**Acceptance criteria:**
- [ ] Vertical timeline line runs full height of step area
- [ ] Past steps: green dot, compact one-liner, tapped time
- [ ] Current step: pulsing dot, expanded card, mini progress bar, technique note
- [ ] Future steps: empty dot, compact one-liner, dimmed opacity
- [ ] Skipped steps: minimal dot marker, struck-through name
- [ ] Auto-scroll to current step preserved (existing `stepsContainerRef` pattern)
- [ ] Step tap-to-record preserved (existing `handleTapStep` logic)
- [ ] Step skip preserved (existing `handleSkipStep` logic)
- [ ] When all steps past: all compact checkmarks, pulsing dot at bottom, timer goes red
- [ ] `prefers-reduced-motion`: `motion-reduce:animate-none` on pulse-dot

---

## Institutional Learnings to Apply

These are documented solutions from `docs/solutions/` that directly apply:

| Learning | Application |
|---|---|
| **Redundant step fields diverge** | Preserve the `cascadeTime`/`plannedSteps` two-prop design. Do NOT create a second editor. |
| **Paired input blur race** | Smart time input uses per-field blur normalization only. Cross-field cascade fires from `onChange`, not blur. |
| **Per-keystroke localStorage writes** | `onChange` from StepEditor updates in-memory state only. Storage persistence on action boundary (5s timer or "Brew This"). |
| **Edit form overwrites unmanaged fields** | No new fields on step objects. Track modification via existing `stepsModifiedRef` in BrewForm. |
| **UI state leaks to persistence** | `expandedStepId` lives in StepEditor's `useState`, never on step data objects. |
| **Entity-form field mapping diverges** | No changes to `RECIPE_FIELDS`, `recipeEntityToFormState`, or `formStateToRecipeFields`. |
| **Lazy init state goes stale** | `expandedStepId` is purely UI state — no stale-prop risk. Reset to null on mount. |
| **Reset handler must clear all state** | No new state added to BrewScreen itself — `expandedStepId` is inside StepEditor and resets on unmount/remount. |
| **Raw field names displayed to users** | Collapsed one-liner uses fallback names ("Step N") for empty names, hides null water targets. |
| **Render-path localStorage gating** | No storage calls inside StepEditor JSX. All data passed as props from parent. |

## Acceptance Criteria

### Functional Requirements

- [x] **Smart time input:** Type seconds → display MM:SS. "45" → "0:45". "130" → "2:10". Revert on invalid.
- [x] **Time range display:** Steps show `0:00 → 0:40` instead of `40 sec 0:00`
- [x] **Compact one-liner:** Default state shows `{timeRange} · {name} · pour to {waterTo}g`
- [x] **Expand to edit:** Tap a step to expand — shows name, time inputs, water, note, split/remove
- [x] **Accordion:** Only one step expanded at a time
- [x] **Vertical timeline:** Thin line connecting step dots on the left edge
- [x] **Split step:** Divides step 50/50 on duration, available in planning context only
- [x] **Quick-add:** `+ Add Step` appends and auto-expands new step
- [x] **Diff annotations:** Colored left border on collapsed steps with diffs; full inline diffs when expanded
- [x] **ActiveBrew timeline:** Past (checkmark) → Current (expanded + progress bar) → Future (dimmed)
- [x] **Playhead:** Pulsing dot on current step position in timeline
- [x] **Mini progress bar:** Shows time elapsed within current step, smooth CSS transition
- [x] **Recipe reference strip:** `{coffeeGrams}g · {grindSetting} · {waterGrams}g target` pinned in header
- [x] **cascadeTime behavior preserved:** Duration changes auto-recalculate start times in RecipeAssembly
- [x] **plannedSteps behavior preserved:** Diff annotations work in BrewForm
- [x] **disabled behavior preserved:** All inputs locked, no add/remove/split/expand

### Non-Functional Requirements

- [x] All animations respect `prefers-reduced-motion` via `motion-reduce:animate-none`
- [x] All touch targets ≥ 44px
- [x] `text-base` on all inputs (prevents iOS auto-zoom)
- [x] No new localStorage keys or data model fields
- [x] No localStorage reads in render path
- [x] No localStorage writes in onChange handlers

### Quality Gates

- [x] `npm run build` succeeds with no errors
- [x] Existing step data loads correctly (no migration needed)
- [x] Pour templates still populate steps correctly
- [x] Active brew crash recovery still works (step state persisted/restored)
- [x] BrewForm diff annotations still show planned vs actual differences

## Dependencies & Prerequisites

None. This is a self-contained UI change with no data model or API dependencies.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Smart time input confuses users who expect MM:SS entry | Medium | Low | Show "type seconds" placeholder; format on blur gives immediate feedback |
| Accordion pattern hides diff annotations | Low | Medium | Colored left border on collapsed steps draws attention |
| ActiveBrew header gets too tall on small phones | Medium | Medium | Recipe strip is one line (~24px); test on 375x667 viewport |
| Split-step creates unexpected time cascading | Low | Medium | Split only available in cascadeTime context; recascade fires immediately |
| Phase 2 ActiveBrew changes affect crash recovery | Low | High | No changes to data persistence — only rendering changes |

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-03-04-timeline-step-editor-brainstorm.md`
- Current StepEditor: `src/components/StepEditor.jsx`
- ActiveBrew sub-component: `src/components/BrewScreen.jsx:964-1142`
- Time formatting: `src/data/storage.js:675-732` (`formatTime`, `parseTime`, `formatTimeRange`)
- Collapsible component: `src/components/Collapsible.jsx`
- Existing accordion patterns: `src/components/BeanLibrary.jsx` (`expandedBeanId`), `src/components/BrewHistory.jsx` (`expandedId`)

### Documented Learnings Applied
- `docs/solutions/logic-errors/redundant-step-fields-diverge-across-editors.md`
- `docs/solutions/ui-bugs/paired-input-blur-race-causes-value-flicker.md`
- `docs/solutions/performance/per-keystroke-localstorage-writes-cause-render-cascade.md`
- `docs/solutions/logic-errors/edit-form-overwrites-fields-it-doesnt-manage.md`
- `docs/solutions/react-patterns/ui-state-in-data-objects-leaks-to-persistence.md`
- `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md`
- `docs/solutions/react-patterns/reset-handler-must-clear-all-related-state.md`
- `docs/solutions/ui-bugs/raw-field-names-displayed-to-users.md`
- `docs/solutions/react-patterns/render-path-localstorage-and-event-gating.md`
