---
title: "feat: Add tasting notes textarea to brew records"
type: feat
date: 2026-03-13
---

# feat: Add tasting notes textarea to brew records

Add a new `tastingNotes` field to brew records — a freeform textarea for flavor/taste observations (e.g., "bright citrus acidity, chocolate finish, silky mouthfeel"). This is distinct from the existing `notes` field which captures brew *process* observations (e.g., "bed was uneven after bloom").

## Field Specification

- **Name:** `tastingNotes` (camelCase, matches `nextBrewChanges` convention)
- **Type:** string, default `''`
- **maxLength:** 2000 (matches `notes`)
- **Label:** "Tasting Notes"
- **Placeholder:** `"Bright citrus acidity, chocolate finish, silky mouthfeel..."`
- **NOT in `RECIPE_FIELDS`** — this is per-brew, not a recipe parameter
- **NOT pre-filled** from last brew — tasting is subjective per session
- **No migration needed** — old brews simply lack the field; read sites use `?? ''`

## Acceptance Criteria

- [x] `tastingNotes` initialized as `''` in `buildBrewRecord` (BrewScreen.jsx)
- [x] Textarea appears in RateThisBrew tasting details collapsible, below Body tags, above Issues
- [x] Collapsed tasting-details indicator includes "notes" when `tastingNotes` is non-empty
- [x] `handleDone` in RateThisBrew includes `tastingNotes` in `updateBrew()` payload
- [x] BrewHistory expanded card shows truncated preview in summary (like `notes`)
- [x] BrewHistory details section shows full `tastingNotes` when > 80 chars
- [x] BrewHistory compare mode includes `tastingNotes` in Tasting section
- [x] BrewForm initializes `tastingNotes` from `editBrew.tastingNotes ?? ''`
- [x] BrewForm has editable textarea in the Tasting section (near flavors/body)
- [x] BrewForm `handleSave` includes `tastingNotes` in update payload
- [x] No auto-diff badges for `tastingNotes` (subjective, not a tunable parameter)
- [x] CLAUDE.md data model updated to list `tastingNotes`
- [x] `npm run build` passes

## MVP — Files to Change

### 1. `src/components/BrewScreen.jsx`

**buildBrewRecord (~line 1931):** Add `tastingNotes: ''` to the tasting fields group.

**RateThisBrew (~line 1292):**
- Add `const [tastingNotes, setTastingNotes] = useState(brew.tastingNotes ?? '')`
- Add textarea in tasting details collapsible (between Body and Issues):
```jsx
{/* Tasting Notes */}
<div>
  <label className="block text-xs text-brew-400 uppercase tracking-wider mb-2">
    Tasting Notes
  </label>
  <textarea
    value={tastingNotes}
    onChange={e => setTastingNotes(e.target.value)}
    placeholder="Bright citrus acidity, chocolate finish, silky mouthfeel..."
    maxLength={2000}
    rows={3}
    className="w-full bg-parchment-100 border border-brew-200 rounded-xl px-3 py-2 text-base text-brew-800 placeholder:text-ceramic-400 focus:outline-none focus:ring-2 focus:ring-brew-300"
  />
</div>
```
- Update collapsed indicator (~line 1536) to append `"notes"` when `tastingNotes` is truthy
- Add `tastingNotes` to the `handleDone` `updateBrew()` call (~line 1322)

### 2. `src/components/BrewForm.jsx`

**Form state init (~line 48):** Add `tastingNotes: editBrew.tastingNotes ?? ''`

**Tasting section (~line 443):** Add textarea with same styling, using `update('tastingNotes', e.target.value)`.

**handleSave (~line 126):** `tastingNotes` flows through form state automatically (no explicit preservation needed since it's managed by the form).

### 3. `src/components/BrewHistory.jsx`

**Summary section (~line 632):** Add `tastingNotes` preview below existing `notes` preview, truncated at 80 chars, with "Tasting:" prefix to differentiate. Only render if truthy.

**Details section (~line 760):** Add full `tastingNotes` display in a `bg-brew-50 rounded-xl` box (same pattern as full notes display), labeled "Tasting Notes".

**Compare mode (~line 419):** Add `tastingNotes` to the Tasting section of the comparison view.

### 4. `CLAUDE.md`

Add `tastingNotes` to the Brew data model field list after `notes`.

## Patterns to Follow (from docs/solutions/)

| Pattern | Application |
|---|---|
| No per-keystroke writes | Buffer in React state, persist only on "Done" / "Save" |
| Primary action flush | `handleDone` reads `tastingNotes` state directly (already in same component) |
| `??` not `||` for strings | `editBrew.tastingNotes ?? ''` preserves empty string |
| Edit form field preservation | Not needed — `tastingNotes` IS managed by BrewForm |
| Content indicators on collapsed sections | Update indicator to include tasting notes presence |

## Out of Scope

- Crash recovery for RateThisBrew form state (pre-existing gap for all tasting fields)
- Auto-diff badges for `tastingNotes` in BrewHistory
- Pre-filling from last brew
- Recipe entity changes
