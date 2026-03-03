---
status: complete
priority: p2
issue_id: "051"
tags: [code-review, performance, brewhistory]
dependencies: []
---

# Memoize BrewHistory diffs and replace stepsChanged JSON.stringify

## Problem Statement

`getDiff()` runs for every brew card in BrewHistory on every render (including card expand/collapse). `stepsChanged()` uses `JSON.stringify(normalizeSteps(a))` for deep comparison — called twice per brew (recipe + actual). With 50 brews, this produces ~200 `JSON.stringify` calls per render. `normalizeSteps()` is also called 3-5 times for the same brew in the expanded detail view.

## Findings

**Agent:** Performance Oracle (CRITICAL-3, OPT-3, OPT-8)

## Proposed Solutions

1. **Memoize diffs:**
```js
const diffs = useMemo(() => brews.map((brew, i) => getDiff(brew, i)), [brews])
```

2. **Replace stepsChanged JSON.stringify with field-level comparison:**
```js
function stepsChanged(a, b) {
  const na = normalizeSteps(a), nb = normalizeSteps(b)
  if (na.length !== nb.length) return true
  for (let i = 0; i < na.length; i++) {
    if (na[i].name !== nb[i].name || na[i].waterTo !== nb[i].waterTo ||
        na[i].time !== nb[i].time || na[i].duration !== nb[i].duration) return true
  }
  return false
}
```

3. **Cache normalizedSteps in expanded view** — compute once per brew, not 3-5 times.

- **Effort:** Small (~20 lines changed)

## Acceptance Criteria

- [ ] Diffs computed once per brew-list change, not per interaction
- [ ] `stepsChanged` uses field comparison, not JSON.stringify
- [ ] normalizeSteps called once per brew in expanded view
