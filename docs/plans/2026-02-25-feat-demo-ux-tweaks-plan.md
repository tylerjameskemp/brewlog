---
title: "feat: Demo UX tweaks — editable brews, auto-fill, grind notation, target time, scrollable notes"
type: feat
date: 2026-02-25
---

# Demo UX Tweaks

Five UX tweaks to get BrewLog to a demoable state where the full brew flow works without leaving the app.

## Overview

| Tweak | Summary | Files Changed | Complexity |
|-------|---------|---------------|------------|
| 7 | Scrollable notes in BrewHistory | `BrewHistory.jsx`, `BrewForm.jsx` | Trivial |
| 4 | Target brew time field | `BrewForm.jsx`, `BrewHistory.jsx` | Low |
| 2-1 | Auto-fill roaster/roastDate | `BrewForm.jsx` | Low |
| 3 | Fellow Ode grind X-1/X-2 notation | `defaults.js`, `BrewForm.jsx`, `BrewTrends.jsx`, `BrewHistory.jsx`, `storage.js` | High |
| 1 | Make brews editable | `App.jsx`, `BrewForm.jsx`, `BrewHistory.jsx` | Medium |

Implementation order: simplest → most complex. Each tweak is a shippable commit.

---

## Tweak 7: Scrollable Notes

**Files:** `src/components/BrewHistory.jsx`, `src/components/BrewForm.jsx`

### Changes

**BrewHistory.jsx — expanded card notes** (`line 610-613`):
```jsx
// BEFORE
<p className="text-sm text-brew-700 mt-1 whitespace-pre-wrap">{brew.notes}</p>

// AFTER
<p className="text-sm text-brew-700 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">{brew.notes}</p>
```

**BrewHistory.jsx — comparison view notes** (`lines 384-396`):
Add `max-h-40 overflow-y-auto` to both comparison note `<p>` elements.

**BrewForm.jsx — notes textarea** (`line 409`):
```jsx
// BEFORE
resize-none

// AFTER
resize-y
```

### Acceptance Criteria
- [x] Long notes in expanded brew card are scrollable, not clipped
- [x] Long notes in comparison view are scrollable per-column
- [x] BrewForm notes textarea is vertically resizable

---

## Tweak 4: Target Brew Time

**Files:** `src/components/BrewForm.jsx`, `src/components/BrewHistory.jsx`

### Data Model Addition

Add `targetTime` (number, seconds) to the brew record. Optional field — existing brews without it display normally.

### BrewForm.jsx Changes

**1. Add `targetTime` to form state** (`line 26-53`):
```jsx
const [form, setForm] = useState({
  // ... existing recipe fields ...
  targetTime: lastBrew?.targetTime || method.defaultTotalTime,  // NEW
  // ... existing brew execution fields ...
  totalTime: '',
  // ...
})
```

When `editBrew` prop is present (Tweak 1), initialize from `editBrew.targetTime`.

**2. Add targetTime input to Recipe phase** — inside "Brew Parameters" section, after bloom water, before closing `</div>`:
```jsx
{/* Target brew time */}
<div className="col-span-2">
  <label className="text-xs font-medium text-brew-500 mb-1 block">Target Time (sec)</label>
  <input
    type="number"
    value={form.targetTime}
    onChange={(e) => update('targetTime', Number(e.target.value))}
    placeholder={method.defaultTotalTime}
    className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
               focus:outline-none focus:ring-2 focus:ring-brew-400"
  />
  {form.targetTime && (
    <div className="text-xs text-brew-400 mt-1 text-center">
      {formatTime(form.targetTime)}
    </div>
  )}
</div>
```

**3. Update totalTime placeholder** (`line 335`) — show targetTime instead of method default:
```jsx
placeholder={form.targetTime || method.defaultTotalTime}
```

**4. Add "leave blank" hint below totalTime** — after the existing `formatTime` display:
```jsx
{form.targetTime && (
  <div className="col-span-2 text-[10px] text-brew-400 -mt-1">
    Leave blank if brew time matched your target
  </div>
)}
```

**5. Update save handler** (`line 120-131`) — default totalTime to targetTime:
```jsx
const brew = {
  // ...
  targetTime: form.targetTime || undefined,
  totalTime: form.totalTime || form.targetTime || undefined,
  // ...
}
```

**6. Add targetTime to handleBeanNameChange pre-fill** (`lines 76-85`):
```jsx
targetTime: beanBrew.targetTime || prev.targetTime,
```

### BrewHistory.jsx Changes

**1. Display targetTime in expanded card recipe section** (`lines 543-575`):
```jsx
{brew.targetTime && (
  <div className="text-xs">
    <span className="text-brew-500">Target Time:</span>{' '}
    <span className="font-mono text-brew-700">{formatTime(brew.targetTime)}</span>
  </div>
)}
```

**2. Show deviation when actual differs from target** — in the Brew section (`lines 577-596`), after the total time display:
```jsx
{brew.targetTime && brew.totalTime && brew.totalTime !== brew.targetTime && (
  <div className="mt-1 text-xs">
    <span className="text-amber-600">
      Target {formatTime(brew.targetTime)}, actual {formatTime(brew.totalTime)}
    </span>
  </div>
)}
```

**3. Add targetTime to getDiff badges** (`lines 189-214`):
```jsx
if (brew.targetTime !== prev.targetTime) {
  diffs.push(`Target: ${formatTime(prev.targetTime)} → ${formatTime(brew.targetTime)}`)
}
```

**4. Add targetTime to compareBrews fields** (`lines 37-47`):
```jsx
{ key: 'targetTime', label: 'Target Time', format: formatTime, section: 'recipe' },
```

### Acceptance Criteria
- [x] targetTime field visible in Recipe phase with mm:ss display
- [x] totalTime placeholder shows targetTime value when set
- [x] "Leave blank if..." hint appears when targetTime is set
- [x] On save, totalTime defaults to targetTime if blank
- [x] Pre-fills from last brew of same bean
- [x] Displays in BrewHistory recipe section
- [x] Deviation shown when actual differs from target
- [x] Diff badges show target time changes
- [x] Old brews without targetTime display normally (no crash, no "undefined")

---

## Tweak 2-1: Auto-fill Roaster/RoastDate

**Files:** `src/components/BrewForm.jsx`

### Changes

**Modify `handleBeanNameChange`** (`lines 68-98`):

```jsx
const handleBeanNameChange = (newName) => {
  const trimmed = newName.trim()
  const matchedBean = trimmed && beans.find(b => b.name?.trim().toLowerCase() === trimmed.toLowerCase())

  if (matchedBean) {
    const beanBrew = getLastBrewOfBean(trimmed)
    if (beanBrew) {
      setForm(prev => ({
        ...prev,
        beanName: newName,
        // Bean info — roaster from library, roastDate from last brew (fallback to library)
        roaster: matchedBean.roaster || prev.roaster,
        roastDate: beanBrew.roastDate || matchedBean.roastDate || prev.roastDate,
        // Recipe params (existing behavior)
        coffeeGrams: beanBrew.coffeeGrams || prev.coffeeGrams,
        waterGrams: beanBrew.waterGrams || prev.waterGrams,
        grindSetting: beanBrew.grindSetting ?? prev.grindSetting,
        waterTemp: beanBrew.waterTemp || prev.waterTemp,
        bloomTime: beanBrew.bloomTime || prev.bloomTime,
        bloomWater: beanBrew.bloomWater || prev.bloomWater,
        targetTime: beanBrew.targetTime || prev.targetTime,
      }))
      setBeanRecipeSource(beanBrew.beanName)
      setLastBeanBrew(beanBrew)
      setSaved(false)
      return
    }

    // Known bean but never brewed — fill roaster and roastDate from library only
    setForm(prev => ({
      ...prev,
      beanName: newName,
      roaster: matchedBean.roaster || prev.roaster,
      roastDate: matchedBean.roastDate || prev.roastDate,
    }))
    setSaved(false)
    return
  }

  // No match
  setForm(prev => ({ ...prev, beanName: newName }))
  setBeanRecipeSource(null)
  setLastBeanBrew(null)
  setSaved(false)
}
```

Key changes from current code:
1. `beans.some()` → `beans.find()` to get the actual bean object
2. Add `roaster` and `roastDate` to the pre-fill `setForm` call
3. New branch: known bean with no prior brews — still fills roaster/roastDate from library
4. Use `||` guard: only fill if the source has a value (don't overwrite with empty string)

### Acceptance Criteria
- [x] Selecting a known bean auto-fills roaster from bean library
- [x] Selecting a known bean auto-fills roastDate from last brew (falls back to library)
- [x] Empty roaster in library does not overwrite a user-entered roaster
- [x] Known bean with no prior brews still fills roaster/roastDate from library entry

---

## Tweak 3: Fellow Ode Grind X-1/X-2 Notation

**Files:** `src/data/defaults.js`, `src/components/BrewForm.jsx`, `src/components/BrewTrends.jsx`, `src/components/BrewHistory.jsx`, `src/data/storage.js`

### Grind Position System

31 total positions: `1, 1-1, 1-2, 2, 2-1, 2-2, ..., 10, 10-1, 10-2, 11`

| Notation | Numeric | Description |
|----------|---------|-------------|
| `"6"` | 6.00 | Main position 6 |
| `"6-1"` | 6.33 | First micro-click past 6 |
| `"6-2"` | 6.67 | Second micro-click past 6 |
| `"7"` | 7.00 | Main position 7 |

### defaults.js Changes

**1. Add grind utility functions:**

```jsx
// Pre-computed array of all 31 Fellow Ode positions
export const FELLOW_ODE_POSITIONS = []
for (let i = 1; i <= 10; i++) {
  FELLOW_ODE_POSITIONS.push(String(i))
  FELLOW_ODE_POSITIONS.push(`${i}-1`)
  FELLOW_ODE_POSITIONS.push(`${i}-2`)
}
FELLOW_ODE_POSITIONS.push('11')

// Convert grind notation to numeric value for charting
export function grindToNumeric(value) {
  if (value == null) return null
  if (typeof value === 'number') return value
  const str = String(value).trim()
  const match = str.match(/^(\d+)(?:-([12]))?$/)
  if (!match) return null
  const base = parseInt(match[1], 10)
  const micro = match[2] ? parseInt(match[2], 10) : 0
  return base + (micro / 3)
}

// Convert numeric grind to Fellow Ode notation (for migration)
export function numericToGrindNotation(value) {
  if (value == null) return null
  const num = Number(value)
  if (isNaN(num)) return String(value)
  const base = Math.floor(num)
  const frac = num - base
  if (frac < 0.17) return String(base)        // closer to N
  if (frac < 0.5) return `${base}-1`           // closer to N-1 (0.33)
  if (frac < 0.83) return `${base}-2`          // closer to N-2 (0.67)
  return String(base + 1)                       // closer to N+1
}
```

**2. Update grinder config** — add `settingType: 'ode'` for Fellow Ode grinders:

```jsx
export const GRINDERS = [
  { id: 'fellow-ode', name: 'Fellow Ode', settingType: 'ode' },
  { id: 'fellow-ode-2', name: 'Fellow Ode Gen 2', settingType: 'ode' },
  { id: 'baratza-encore', name: 'Baratza Encore', settingType: 'numeric', min: 1, max: 40 },
  // ... rest unchanged
]
```

### storage.js Changes

**Add migration function:**

```jsx
import { numericToGrindNotation } from './defaults'

export function migrateGrindSettings() {
  const brews = getBrews()
  let changed = false
  brews.forEach(b => {
    if ((b.grinder === 'fellow-ode' || b.grinder === 'fellow-ode-2')
        && typeof b.grindSetting === 'number') {
      b.grindSetting = numericToGrindNotation(b.grindSetting)
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}
```

**Call on app load** in `App.jsx` — add to the initialization block alongside `deduplicateBeans()`.

### BrewForm.jsx Changes

**Replace range slider with `<select>` dropdown for `settingType === 'ode'`** (`lines 256-280`):

```jsx
{grinder.settingType === 'ode' ? (
  <select
    value={form.grindSetting}
    onChange={(e) => update('grindSetting', e.target.value)}
    className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
               focus:outline-none focus:ring-2 focus:ring-brew-400"
  >
    {FELLOW_ODE_POSITIONS.map(pos => (
      <option key={pos} value={pos}>{pos}</option>
    ))}
  </select>
) : grinder.settingType === 'numeric' || grinder.settingType === 'clicks' ? (
  // ... existing slider code unchanged ...
) : (
  // ... existing text input unchanged ...
)}
```

**Update grindSetting initialization** (`line 35`):
```jsx
grindSetting: lastBrew?.grindSetting ?? (grinder.settingType === 'ode' ? '6' : 6),
```

### BrewTrends.jsx Changes

**Update chart data mapping** (`line 123`):
```jsx
// BEFORE
grindSetting: typeof brew.grindSetting === 'number' ? brew.grindSetting : null,

// AFTER
grindSetting: grindToNumeric(brew.grindSetting),
```

**Update stats computation** (`line 39`):
```jsx
// BEFORE
const grinds = filteredBrews.map(b => b.grindSetting).filter(g => typeof g === 'number')

// AFTER
const grinds = filteredBrews.map(b => grindToNumeric(b.grindSetting)).filter(g => g != null)
```

**Update grind range display** (`line 57-60`): Use `grindToNumeric` to compute min/max, but display the original notation string.

### BrewHistory.jsx Changes

**Update diff direction logic** (`lines 194-196`):
```jsx
// BEFORE
const dir = brew.grindSetting > prev.grindSetting ? '↑' : '↓'
diffs.push(`Grind ${dir} ${prev.grindSetting} → ${brew.grindSetting}`)

// AFTER
const currNum = grindToNumeric(brew.grindSetting)
const prevNum = grindToNumeric(prev.grindSetting)
if (currNum != null && prevNum != null && currNum !== prevNum) {
  const dir = currNum > prevNum ? '↑' : '↓'
  diffs.push(`Grind ${dir} ${prev.grindSetting} → ${brew.grindSetting}`)
}
```

### Migration Mapping (Old → New)

| Old (step 0.5) | New (X-Y notation) | Numeric |
|-----------------|---------------------|---------|
| 1 | "1" | 1.00 |
| 1.5 | "1-2" | 1.67 |
| 2 | "2" | 2.00 |
| 2.5 | "2-2" | 2.67 |
| ... | ... | ... |
| 6 | "6" | 6.00 |
| 6.5 | "6-2" | 6.67 |
| 7 | "7" | 7.00 |
| ... | ... | ... |

Whole numbers map to themselves. Half-steps map to `-2` (nearest sub-position).

### Acceptance Criteria
- [x] Fellow Ode grind selector shows 31 positions in X-1/X-2 notation
- [x] Fellow Ode Gen 2 uses the same selector
- [x] Other grinders (Baratza, Comandante, etc.) unchanged
- [x] Grind value stored as string for Ode, number for others
- [x] BrewTrends charts plot Ode grind settings correctly via numeric conversion
- [x] BrewTrends stats (grind range) work with string grind values
- [x] Diff badges show correct direction arrows for string grind values
- [x] Existing numeric grind values migrated to notation on app load
- [x] Migration is idempotent (running twice is safe)
- [x] Pre-fill from last brew works with string grind values

---

## Tweak 1: Make Brews Editable

**Files:** `src/App.jsx`, `src/components/BrewForm.jsx`, `src/components/BrewHistory.jsx`

### App.jsx Changes

**1. Add editingBrew state** (`after line 33`):
```jsx
const [editingBrew, setEditingBrew] = useState(null)
```

**2. Add onEditBrew callback to BrewHistory** (`lines 112-118`):
```jsx
{view === 'history' && (
  <BrewHistory
    brews={brews}
    onBrewsChange={setBrews}
    onNavigate={setView}
    onEditBrew={(brew) => {
      setEditingBrew(brew)
      setView('brew')
    }}
  />
)}
```

**3. Pass editBrew and onEditComplete to BrewForm** (`lines 94-101`):
```jsx
{view === 'brew' && !needsSetup && (
  <BrewForm
    equipment={equipment}
    beans={beans}
    setBeans={setBeans}
    onBrewSaved={(updatedBrews) => {
      setBrews(updatedBrews)
      setEditingBrew(null)
    }}
    editBrew={editingBrew}
    onEditComplete={() => {
      setEditingBrew(null)
      setView('history')
    }}
  />
)}
```

### BrewForm.jsx Changes

**1. Accept new props:**
```jsx
export default function BrewForm({ equipment, beans, setBeans, onBrewSaved, editBrew, onEditComplete }) {
```

**2. Update form state initialization** (`lines 24-53`):
```jsx
const isEditing = !!editBrew
const [lastBrew] = useState(() => isEditing ? null : getLastBrew())

const [form, setForm] = useState(() => {
  if (editBrew) {
    // Edit mode — populate all fields from existing brew
    return {
      beanName: editBrew.beanName || '',
      roaster: editBrew.roaster || '',
      roastDate: editBrew.roastDate || '',
      coffeeGrams: editBrew.coffeeGrams || 20,
      waterGrams: editBrew.waterGrams || 320,
      grindSetting: editBrew.grindSetting ?? 6,
      waterTemp: editBrew.waterTemp || 205,
      bloomTime: editBrew.bloomTime || method.defaultBloomTime,
      bloomWater: editBrew.bloomWater || 60,
      targetTime: editBrew.targetTime || '',
      totalTime: editBrew.totalTime || '',
      actualBloomTime: editBrew.actualBloomTime || '',
      actualBloomWater: editBrew.actualBloomWater || '',
      flavors: editBrew.flavors || [],
      body: editBrew.body || '',
      rating: editBrew.rating || 0,
      issues: editBrew.issues || [],
      notes: editBrew.notes || '',
    }
  }
  // New brew mode — existing logic
  return {
    beanName: lastBrew?.beanName || '',
    // ... rest unchanged, plus targetTime ...
  }
})
```

**3. Disable bean pre-fill in edit mode** — in `handleBeanNameChange`:
```jsx
const handleBeanNameChange = (newName) => {
  if (isEditing) {
    // Edit mode: just update the name, don't pre-fill recipe
    update('beanName', newName)
    return
  }
  // ... existing pre-fill logic unchanged ...
}
```

**4. Branch the save handler** (`lines 114-150`):
```jsx
const handleSave = () => {
  if (savingRef.current) return
  savingRef.current = true

  const trimmedName = form.beanName.trim()

  if (isEditing) {
    // Update existing brew — preserve original ID and brewedAt
    const updates = {
      ...form,
      beanName: trimmedName,
      actualBloomTime: form.actualBloomTime || form.bloomTime,
      actualBloomWater: form.actualBloomWater || form.bloomWater,
      totalTime: form.totalTime || form.targetTime || undefined,
    }
    const updatedBrews = updateBrew(editBrew.id, updates)
    onBrewSaved(updatedBrews)

    // Auto-save bean (idempotent — saveBean deduplicates)
    if (trimmedName) {
      const updatedBeans = saveBean({
        id: uuidv4(),
        name: trimmedName,
        roaster: form.roaster,
        roastDate: form.roastDate,
        addedAt: new Date().toISOString(),
      })
      setBeans(updatedBeans)
    }

    savingRef.current = false
    onEditComplete()
    return
  }

  // New brew — existing logic unchanged
  const brew = {
    id: uuidv4(),
    ...form,
    beanName: trimmedName,
    targetTime: form.targetTime || undefined,
    totalTime: form.totalTime || form.targetTime || undefined,
    actualBloomTime: form.actualBloomTime || form.bloomTime,
    actualBloomWater: form.actualBloomWater || form.bloomWater,
    method: equipment?.brewMethod,
    grinder: equipment?.grinder,
    dripper: equipment?.dripper,
    brewedAt: new Date().toISOString(),
  }
  const updatedBrews = saveBrew(brew)
  onBrewSaved(updatedBrews)
  setSaved(true)

  if (trimmedName) {
    const updatedBeans = saveBean({ /* ... existing ... */ })
    setBeans(updatedBeans)
  }

  savingRef.current = false
}
```

**5. Update save button and add cancel:**
```jsx
{/* Save/Update button */}
<button
  onClick={handleSave}
  disabled={!isEditing && saved}
  className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all
    ${!isEditing && saved
      ? 'bg-green-500 text-white'
      : 'bg-brew-600 text-white hover:bg-brew-700 active:scale-[0.98]'
    }`}
>
  {!isEditing && saved ? '✓ Brew Saved!' : isEditing ? 'Update Brew' : 'Save Brew'}
</button>

{/* Cancel button (edit mode only) */}
{isEditing && (
  <button
    onClick={onEditComplete}
    className="w-full py-3 text-brew-500 text-sm font-medium hover:text-brew-700 transition-colors"
  >
    Cancel
  </button>
)}
```

**6. Add import for `updateBrew`:**
```jsx
import { saveBrew, updateBrew, getLastBrew, getLastBrewOfBean, saveBean, getBeans } from '../data/storage'
```

### BrewHistory.jsx Changes

**1. Accept `onEditBrew` prop:**
```jsx
export default function BrewHistory({ brews, onBrewsChange, onNavigate, onEditBrew }) {
```

**2. Add Edit button in expanded card** — next to the Delete button (`line 655-661`):
```jsx
{/* Edit and Delete */}
<div className="mt-3 flex gap-2">
  <button
    onClick={() => onEditBrew(brew)}
    className="text-sm px-3 py-2 min-h-[44px] rounded-lg text-brew-500
               hover:text-brew-700 hover:bg-brew-50 transition-colors"
  >
    Edit
  </button>
  <button
    onClick={() => handleDelete(brew.id)}
    className="text-sm px-3 py-2 min-h-[44px] rounded-lg text-red-400
               hover:text-red-600 hover:bg-red-50 transition-colors"
  >
    Delete
  </button>
</div>
```

### Key Design Decisions
- **No rename cascade on edit** — editing a single brew's bean name is "this brew was a different bean," not "rename this bean globally." Cascade only happens from BeanLibrary rename.
- **Pre-fill disabled in edit mode** — changing bean name during edit only updates the name, doesn't overwrite recipe fields.
- **Auto-save-bean preserved in edit mode** — `saveBean()` is idempotent (dedup skips existing beans), so calling it during edit correctly adds genuinely new beans.
- **Navigate immediately after edit save** — no "Brew Updated!" confirmation delay. The user sees their updated brew in history.

### Acceptance Criteria
- [x] "Edit" button visible in expanded brew card in History
- [x] Edit button hidden during compare mode (naturally — expanded cards don't show in compare mode)
- [x] Clicking Edit navigates to BrewForm pre-filled with all brew fields (all 3 phases)
- [x] Save button says "Update Brew" in edit mode
- [x] Cancel button returns to history without saving
- [x] Saving calls `updateBrew()`, preserves original ID and `brewedAt`
- [x] After save, automatically returns to history view
- [x] Opening a new brew after editing shows fresh form (not stale edit data)
- [x] Changing bean name in edit mode does NOT trigger recipe pre-fill
- [x] Double-tap guard (`savingRef`) works in edit mode
- [x] Editing a brew then viewing it in history shows updated data

---

## Cross-Tweak Interactions

| Combination | Interaction | Handling |
|-------------|------------|---------|
| 1 + 3 | Editing a brew with migrated grind notation | Ode selector shows the string value correctly |
| 1 + 4 | Editing a pre-existing brew without targetTime | targetTime field shows empty, not "undefined" |
| 1 + 2-1 | Bean pre-fill during edit mode | Disabled — edit mode only updates beanName field |
| 3 + 4 | BrewTrends needs both parsing updates | Coordinated in same file — no conflict |

## CLAUDE.md Update

After implementation, add `targetTime` to the Brew data model example and note that `grindSetting` is `number | string` depending on grinder type.
