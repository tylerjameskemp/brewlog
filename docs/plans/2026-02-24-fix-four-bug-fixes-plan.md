---
title: "fix: Four Bug Fixes (Duplicate Beans, Sort Order, Persistence, Grind Steps)"
type: fix
date: 2026-02-24
---

# Fix: Four Bug Fixes

Bug-only fixes. No features, no refactors, no additions.

---

## Bug 1: Duplicate Beans in Library

**Root cause:** `saveBean()` in `storage.js:71-76` blindly prepends — zero dedup logic. The only dedup guard is in `BrewForm.handleSave` (line 93), which checks the `beans` React prop. But `BeanLibrary.handleSaveBean` (line 72-88) calls `saveBean()` directly with no dedup — the modal warns, then allows duplicates on second click. Additionally, the bean `name` is stored from `form.beanName` (untrimmed at line 96) while comparison uses `trimmedName`.

**Fix (two parts — prevent future + clean existing):**

### 1a. Prevent future duplicates

**`src/data/storage.js` — Add dedup to `saveBean()`:**
```javascript
export function saveBean(bean) {
  const beans = getBeans()
  const normalized = bean.name?.trim().toLowerCase()
  if (normalized && beans.some(b => b.name?.trim().toLowerCase() === normalized)) {
    return beans // Already exists, skip
  }
  beans.unshift(bean)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}
```

**`src/components/BrewForm.jsx:96` — Store trimmed name:**
Change `name: form.beanName` to `name: trimmedName` on line 96 in the newBean object.

### 1b. Clean existing duplicates on load

Add a `deduplicateBeans()` helper to `storage.js`:
```javascript
export function deduplicateBeans() {
  const beans = getBeans()
  const seen = new Map()
  const deduped = beans.filter(b => {
    const key = b.name?.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.set(key, true)
    return true
  })
  if (deduped.length !== beans.length) {
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
  }
  return deduped
}
```

Call it from the lazy initializer in `App.jsx`:
```javascript
const [beans, setBeans] = useState(() => deduplicateBeans())
```

This keeps the first occurrence of each normalized name and removes later duplicates. Runs once on load. Idempotent — no-op if no duplicates exist.

### Files changed
- `src/data/storage.js` — `saveBean()` dedup + new `deduplicateBeans()`
- `src/components/BrewForm.jsx` — line 96, use trimmed name
- `src/App.jsx` — lazy init calls `deduplicateBeans()` instead of `getBeans()`

### Test
- Log 3 brews with "Romero Red Bourbon" (vary casing/whitespace). Bean library should show exactly 1 entry.
- Manually try "+ Add Bean" with the same name — should not create a duplicate.
- Pre-seed localStorage with duplicate beans, refresh — duplicates cleaned on load.

---

## Bug 2: History Sort Order

**Root cause:** `BrewHistory.jsx:454` renders `brews.map(...)` in array order. The array is ordered by `unshift` insertion time in `saveBrew()` (storage.js:30). No sort anywhere. `brewedAt` is set to save time (BrewForm.jsx:84), not actual brew time. `BrewTrends.jsx:37` also assumes newest-first insertion order (`brews.slice(0, 20).reverse()`), which breaks after merge imports.

**Fix — Sort at the storage layer so all consumers benefit:**

**`src/data/storage.js` — Sort in `getBrews()`:**
```javascript
export function getBrews() {
  const data = localStorage.getItem(STORAGE_KEYS.BREWS)
  if (!data) return []
  const brews = JSON.parse(data)
  return brews.sort((a, b) => {
    const dateA = a.brewedAt ? new Date(a.brewedAt).getTime() : 0
    const dateB = b.brewedAt ? new Date(b.brewedAt).getTime() : 0
    return dateB - dateA // newest first
  })
}
```

This fixes all consumers at once: BrewHistory, BrewTrends, getLastBrew, BeanLibrary brew list. No changes needed in any component — they already expect newest-first order and now actually get it.

**Why storage layer, not component layer:** Sorting only in BrewHistory would leave BrewTrends showing brews in wrong order after merge imports, and `getLastBrew()` would return the wrong brew. Sorting once in `getBrews()` is simpler and ensures consistency.

### Files changed
- `src/data/storage.js` — `getBrews()` function

### Test
- Import old data via merge, then log a new brew. History should show newest-brewed-first.
- BrewTrends charts should show chronological order (oldest left, newest right).
- After import, the BrewForm pre-fills from the most recently brewed session (not the most recently imported).

---

## Bug 3: Data Persistence on Refresh

**Root cause:** `App.jsx:30-32` initializes state with empty values (`[]`, `null`, `[]`), then loads from localStorage in a `useEffect` on mount (lines 41-45). This creates a render cycle where state is empty before the effect fires, causing a flash of the "Welcome to BrewLog" setup screen on every refresh. In dev mode, React 18 StrictMode double-invokes effects, amplifying the issue.

The actual data loss risk is low — no code writes to localStorage during the empty window — but the visual flash makes users think their data is gone.

**Fix:**

**`src/App.jsx` — Use lazy state initialization instead of useEffect:**
```javascript
const [brews, setBrews] = useState(() => getBrews())
const [equipment, setEquipment] = useState(() => getEquipment())
const [beans, setBeans] = useState(() => deduplicateBeans())  // from Bug 1 fix
```
Then **remove** the `useEffect` on lines 41-45 entirely. Lazy initializers run synchronously during the first render, so state is correct from the start with no empty flash.

### Files changed
- `src/App.jsx` — lines 30-32 (lazy init), lines 41-45 (remove useEffect)

### Test
- Add brews, refresh page — data persists, no flash of welcome screen.
- Close tab, reopen — data persists.
- Export data, refresh, import data — round trip works.
- Verify no flash of "Welcome to BrewLog" setup screen on refresh when equipment is configured.

---

## Bug 4: Grind Setting Half-Steps

**Root cause:** `defaults.js:54-55` Fellow Ode grinders define `min: 1, max: 11` with no `step` property. `BrewForm.jsx:201-207` renders `<input type="range">` with no `step` attribute, defaulting to `step="1"` (whole numbers only). The real Fellow Ode has detents between numbers.

**Fix:**

### 4a. Add step to grinder config

**`src/data/defaults.js` — Add `step` to Fellow Ode grinders:**
```javascript
{ id: 'fellow-ode', name: 'Fellow Ode', settingType: 'numeric', min: 1, max: 11, step: 0.5 },
{ id: 'fellow-ode-2', name: 'Fellow Ode Gen 2', settingType: 'numeric', min: 1, max: 11, step: 0.5 },
```
Leave other grinders without `step` (they'll default to 1).

### 4b. Pass step to the range input

**`src/components/BrewForm.jsx:201-207` — Add step attribute:**
```jsx
<input
  type="range"
  min={grinder.min}
  max={grinder.max}
  step={grinder.step || 1}
  value={form.grindSetting}
  onChange={(e) => update('grindSetting', Number(e.target.value))}
  className="flex-1 accent-brew-500"
/>
```

No display change needed — `{form.grindSetting}` on line 210 renders `6.5` naturally.

### Files changed
- `src/data/defaults.js` — lines 54-55
- `src/components/BrewForm.jsx` — lines 201-207

### Test
- Select Fellow Ode grinder. Slide grind setting — should snap to 1, 1.5, 2, 2.5, ... 11.
- Display should show the half value (e.g., "6.5").
- Other grinders (Baratza Encore, Comandante) should still be whole numbers only.

---

## Implementation Order

1. **Bug 3 (Persistence)** — Do first. Changes `App.jsx` state initialization pattern that Bug 1 also touches (lazy init for beans).
2. **Bug 1 (Duplicate Beans)** — Do second. Adds `deduplicateBeans()` used in the lazy init from Bug 3.
3. **Bug 2 (Sort Order)** — Independent. Changes only `storage.js:getBrews()`.
4. **Bug 4 (Grind Steps)** — Independent. Changes only `defaults.js` and `BrewForm.jsx`.

Bugs 2 and 4 can be done in parallel after 1 and 3.

---

## Files Changed (Summary)

| File | Bugs |
|------|------|
| `src/App.jsx` | Bug 1 (deduplicateBeans import), Bug 3 (lazy init, remove useEffect) |
| `src/data/storage.js` | Bug 1 (saveBean dedup, deduplicateBeans), Bug 2 (getBrews sort) |
| `src/components/BrewForm.jsx` | Bug 1 (trimmed name), Bug 4 (step attr) |
| `src/data/defaults.js` | Bug 4 (step property) |

---

## Out of Scope (noted, not fixing)

- **`updateBean()` name collision** — Editing bean A's name to match bean B. The modal already warns. Fixing would require new logic in `updateBean()` — not part of the reported bugs.
- **`renameBrewBean()` normalized matching** — Uses exact match, won't find old brews with untrimmed names. Would require data migration of brew records.
- **`mergeData()` name-based bean dedup** — Merge deduplicates by ID, not name. Edge case only hit if user exports, deletes a bean, re-adds with same name, then merges.
- **Stranded half-step grind values** — If user switches from Fellow Ode (6.5) to Baratza Encore (step=1), the pre-filled 6.5 may behave oddly on the integer slider. Pre-existing condition.

---

## Verification Checklist

- [x] Bean library shows exactly 1 entry per unique bean (case/whitespace insensitive)
- [x] History sorts newest-brewed-first by `brewedAt` timestamp
- [x] Data persists through page refresh, tab close, browser restart
- [x] Grind setting supports half-steps (0.5) for Fellow Ode
- [ ] No console errors
- [ ] Export data, refresh, import data — round trip works
- [x] `npm run build` succeeds with no errors
