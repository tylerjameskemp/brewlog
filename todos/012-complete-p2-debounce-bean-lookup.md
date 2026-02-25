---
status: complete
priority: p2
issue_id: "012"
tags: [code-review, performance, brew-phases]
dependencies: ["011"]
---

# Add debounce or gate to bean name lookup

## Problem Statement

`handleBeanNameChange` calls `getLastBrewOfBean()` on every keystroke of the bean name input. Each call reads and parses localStorage. While individual calls are fast (sub-ms), rapid typing generates unnecessary work.

## Findings

- **Source**: performance-oracle agent
- **Location**: `src/components/BrewForm.jsx` — `handleBeanNameChange`
- **Impact**: Low — localStorage reads are fast, but wasteful. More relevant if brew count grows large.
- **Severity**: P2 — not user-visible now, but poor pattern

## Proposed Solutions

### Option A: Gate behind exact bean name match (Recommended)
- Check if the typed name matches a known bean from the `beans` prop before calling `getLastBrewOfBean`
- Since `beans` is already in memory (passed as prop), this avoids localStorage reads for partial strings
- **Pros**: No new dependencies, zero overhead for partial typing
- **Cons**: Only fires on exact match (which is the desired behavior anyway)
- **Effort**: Small
- **Risk**: Low

### Option B: Debounce with setTimeout
- Debounce the `getLastBrewOfBean` call by 300ms
- **Pros**: Classic pattern
- **Cons**: Adds delay to datalist selection, more complex
- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] Bean lookup does NOT fire on every keystroke for partial strings
- [ ] Bean lookup fires when a complete bean name is entered or selected from datalist
- [ ] Pre-fill still works correctly
