---
title: "Synchronous ref guard is always ineffective"
category: react-patterns
tags: [double-tap, savingRef, useRef, synchronous, anti-pattern]
module: BrewScreen, BeanLibrary
symptoms:
  - "savingRef guard wraps only synchronous calls"
  - "Ref is set true then immediately false in the same call stack"
  - "Double-tap guard never actually blocks a second invocation"
date: 2026-03-04
severity: P2
---

# Synchronous ref guard is always ineffective

## Problem

A `useRef` guard was used to prevent double-tap submissions:

```jsx
const savingRef = useRef(false)

const handleFinishRename = (id) => {
  const trimmed = nameBuffer.trim()
  if (trimmed && trimmed !== recipes.find(r => r.id === id)?.name) {
    if (savingRef.current) return      // guard check
    savingRef.current = true           // lock
    onRename(id, trimmed)              // synchronous call
    savingRef.current = false          // unlock
  }
  setEditingNameId(null)
}
```

This pattern appeared in `RecipeSection` (BeanLibrary) and `BrewSuccess` (BrewScreen), wrapping synchronous localStorage operations like `onRename`, `onDelete`, and `onNotesUpdate`.

**Why it's ineffective:** JavaScript is single-threaded. The three lines — set true, call function, set false — execute in one synchronous microtask. No re-render or event handler can fire between them. The ref is *never* `true` when a second click's handler runs, because the first click's handler already set it back to `false` before returning.

## When ref guards DO work

The `savingRef` pattern is legitimate when wrapping **async** operations:

```jsx
// ✅ WORKS — async gap between set-true and set-false
const handleSubmit = async () => {
  if (savingRef.current) return
  savingRef.current = true
  await apiCall()           // yields control — second click CAN fire here
  savingRef.current = false
}
```

The async `await` yields control back to the event loop, during which a second click handler *can* run and hit the guard. This is the pattern used correctly in `BrewForm` and `RateThisBrew` (where `saveBrew`/`updateBrew` + state updates create enough of a gap).

## Solution

**For synchronous operations:** Remove the ref guard entirely. Synchronous localStorage writes complete atomically within a single call stack — there's no window for a second invocation to cause harm.

```jsx
// ✅ CORRECT — no guard needed for sync operations
const handleFinishRename = (id) => {
  const trimmed = nameBuffer.trim()
  if (trimmed && trimmed !== recipes.find(r => r.id === id)?.name) {
    onRename(id, trimmed)
  }
  setEditingNameId(null)
}
```

**If you genuinely need double-tap protection for sync handlers**, use `disabled` state on the button instead — that's a UI-level guard that prevents the event from firing at all.

## Decision rule

| Operation type | Guard mechanism |
|---------------|----------------|
| Async (API calls, `await`) | `useRef` guard ✅ |
| Synchronous (localStorage, state) | No guard needed |
| UI prevention (any) | `disabled` prop on button |

## Prevention

- Before adding a `savingRef` guard, verify the guarded operation is async
- If all operations inside the guard are synchronous, the guard is dead code — remove it
- Grep for `savingRef.current = true` followed by `savingRef.current = false` without an `await` between them

## Related

- `docs/solutions/react-patterns/immediate-save-then-rate-brew-flow.md` — documents the *correct* use of `savingRef` for async save flows
- PR #30 review finding P2: Ineffective `savingRef` in BrewSuccess and RecipeSection
