---
title: "Per-keystroke localStorage writes cause re-render cascade through the component tree"
category: performance
tags: [localstorage, controlled-input, debounce, react-state, brewscreen]
module: BrewScreen, App
symptoms:
  - "Input lag when typing in text fields"
  - "onChange handler writes to localStorage on every character"
  - "Parent component re-renders on every keystroke in a child input"
date: 2026-02-27
severity: P2
---

# Per-keystroke localStorage writes cause re-render cascade through the component tree

## Problem

When a controlled input's `onChange` handler writes to localStorage AND triggers a parent state update on every keystroke, it creates a chain reaction:

1. User types a character
2. `onChange` fires → calls `updateBean()` → reads+writes localStorage
3. `setBeans(getBeans())` → reads localStorage again → updates App state
4. App re-renders → all children re-render (Header, MobileNav, BrewScreen, etc.)

In BrewScreen, editing a bean's origin/process/roaster in the RecipeAssembly origin card triggered this on every character:

```jsx
// Before (broken — writes on every keystroke):
const handleBeanUpdate = useCallback((field, value) => {
  setSelectedBean(prev => ({ ...prev, [field]: value }))
  if (selectedBean?.id) {
    updateBean(selectedBean.id, { [field]: value })  // localStorage write
    setBeans(getBeans())                              // localStorage read + App re-render
  }
}, [selectedBean, setBeans])
```

## Root Cause

The developer wanted edits to persist immediately (like autosave), but used the `onChange` handler as the persistence trigger. This conflates two concerns:
1. **UI responsiveness** — the input value should update instantly
2. **Data persistence** — storage writes can be deferred

## Solution

### Rule: Separate immediate UI state from deferred persistence

**Option A: Batch on action boundary (preferred)**

Buffer edits in local component state. Persist once at a meaningful action (e.g., toggling Edit off, starting the brew).

```jsx
// In RecipeAssembly — local state for edits
const [beanOverrides, setBeanOverrides] = useState({})
const displayBean = { ...bean, ...beanOverrides }

// Input uses local state — instant, no parent re-render
<input value={displayBean.origin} onChange={e => setBeanOverrides(p => ({ ...p, origin: e.target.value }))} />

// Persist once when leaving edit mode
const handleDoneEditing = () => {
  setEditing(false)
  if (Object.keys(beanOverrides).length > 0) {
    onBeanUpdate(beanOverrides) // single persist
  }
}
```

**Option B: Debounce persistence**

If you need near-realtime persistence (crash recovery), debounce the storage write while keeping the UI update immediate:

```jsx
const handleBeanUpdate = useCallback((field, value) => {
  // Immediate UI update
  setSelectedBean(prev => ({ ...prev, [field]: value }))

  // Debounced persistence (400ms)
  clearTimeout(persistTimer.current)
  persistTimer.current = setTimeout(() => {
    const updated = updateBean(selectedBean.id, { [field]: value })
    setBeans(updated)
  }, 400)
}, [selectedBean, setBeans])
```

## When to use each approach

| Scenario | Approach |
|----------|----------|
| Form editing with Save/Done button | Batch on action boundary |
| Crash recovery during long flows | Debounce (5s like ActiveBrew) |
| Settings that take effect immediately | Debounce (300-500ms) |

## Related

- `persist-and-restore-must-be-end-to-end.md` — BrewScreen already throttles timer persistence to 5-second intervals for the same reason
- ActiveBrew pattern: immediate persist on user actions (tap/skip), throttled persist on timer ticks
