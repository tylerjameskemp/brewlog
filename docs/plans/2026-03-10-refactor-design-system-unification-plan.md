---
title: "refactor: Design system unification — visual consistency pass"
type: refactor
date: 2026-03-10
---

# Design System Unification — Visual Consistency Pass

## Overview

Resolve ~15 micro-inconsistencies that accumulated during organic development. Seven sequential CSS-class-replacement tasks. No logic, data flow, or behavior changes — visual styling only.

Reference: `docs/brand-guide.md` documents every current visual decision and catalogs all inconsistencies.

## Prerequisite: Update CLAUDE.md

Before any task, append design system rules to `CLAUDE.md`:

```
## Design System Rules (added March 2026)

### Surfaces
- App background: bg-parchment-100 (ONLY)
- Card/elevated: bg-parchment-50 (ONLY — never bg-white)
- Felt board: bg-felt-800 (ONLY)

### CTA Buttons
- Primary: bg-crema-500 + hover:bg-crema-600 (ONLY — never bg-brew-600 on buttons)
- Disabled: leave existing disabled styles unchanged (out of scope)

### Border Radius
- Cards/modals: rounded-2xl
- Buttons/inputs: rounded-xl
- Tags/pills: rounded-full
- Felt cards: rounded-lg

### Text Colors (five tones)
- Primary: text-brew-900 or text-brew-800 (headings, body, card titles)
- Data values: text-brew-700 (with font-mono)
- Interactive/ghost: text-brew-500 (ghost buttons, text actions, unselected interactive labels)
- Metadata: text-brew-400 (timestamps, form labels, section labels)
- Hints/disabled: text-ceramic-400 (placeholders, disabled states)

### Bottom CTA Gradient
- Always: from-parchment-100 via-parchment-100 to-transparent
```

> **Why five tones, not four?** The original spec defined four, but spec-flow analysis revealed `text-brew-500` is explicitly prescribed for ghost buttons (Task 7's "Add tasting details" link), inactive nav tabs, and interactive selection labels. Without a sanctioned fifth tone, Task 5 and Task 7 contradict each other.

---

## Phase 1: Surface & Button Palette (Tasks 1–3)

### Task 1: Replace all `bg-white` with `bg-parchment-50`

**Files affected (10 instances, 6 files):**

| File | Line | Context |
|------|------|---------|
| `src/components/StepEditor.jsx` | 132 | Expanded step card |
| `src/components/BrewTrends.jsx` | 85 | Bean filter `<select>` |
| `src/components/BrewTrends.jsx` | 134 | Chart type `<select>` |
| `src/components/SettingsMenu.jsx` | 230 | Dropdown container |
| `src/components/BrewScreen.jsx` | 254 | BeanPicker search results |
| `src/components/BrewScreen.jsx` | 1303 | "Try Next Time" textarea |
| `src/components/EquipmentSetup.jsx` | 57 | Modal container |
| `src/components/EquipmentSetup.jsx` | 181 | Kettle `<select>` |
| `src/components/EquipmentSetup.jsx` | 226 | Scale `<select>` |
| `src/components/FlavorPicker.jsx` | 99 | Unselected flavor tag |

**Mechanical replacement** — find `bg-white` in each file, replace with `bg-parchment-50`. Do NOT touch `text-white`.

**Risk:** BrewScreen.jsx line 1303 — textarea sits inside `bg-amber-50` container. Parchment-50 within amber-50 is warm-on-warm but acceptable (minimal contrast difference).

**Acceptance:** `grep -r "bg-white" src/` returns zero matches. Build passes.

---

### Task 2: Unify CTA buttons to `bg-crema-500`

**Files affected (7 button instances, 4 files):**

| File | Line | Context | Action |
|------|------|---------|--------|
| `src/components/EquipmentSetup.jsx` | 109 | "Set Up My Gear" button | `bg-brew-600` → `bg-crema-500`, `hover:bg-brew-700` → `hover:bg-crema-600` |
| `src/components/EquipmentSetup.jsx` | 287 | "Next" wizard button | Same |
| `src/components/EquipmentSetup.jsx` | 295 | "Save" wizard button | Same |
| `src/components/SettingsMenu.jsx` | 193 | "Import & Replace" button | Same |
| `src/components/SettingsMenu.jsx` | 202 | "Import & Merge" button | Same |
| `src/components/BrewForm.jsx` | 512 | Save button (enabled branch of ternary) | `bg-brew-600` → `bg-crema-500` |
| `src/components/BeanLibrary.jsx` | 652 | Add/Update bean button (enabled branch) | `bg-brew-600` → `bg-crema-500` |

**Do NOT change:**
- EquipmentSetup line 95 — progress bar dot (`bg-brew-600`), decorative not a button
- FlavorPicker line 57 — `hover:bg-brew-600` on category pills, not a CTA button
- Disabled button states (`bg-brew-200`) — out of scope
- Any existing `bg-crema-500` buttons (BrewScreen already correct)

**Risk:** BrewForm line 512 and BeanLibrary line 652 use ternaries. Only change the enabled branch. Verify the conditional logic after replacement.

**Acceptance:** No `bg-brew-600` on any `<button>` element. Build passes.

---

### Task 3: Standardize bottom CTA gradient

**Files affected (2 changes, 1 file):**

| File | Line | Current | Target |
|------|------|---------|--------|
| `src/components/BrewScreen.jsx` | 630 | `from-brew-50 via-brew-50` | `from-parchment-100 via-parchment-100` |
| `src/components/BrewScreen.jsx` | 1384 | `from-brew-50 via-brew-50` | `from-parchment-100 via-parchment-100` |

Line 1076 (ActiveBrew) already uses `from-parchment-100 via-parchment-100` — no change needed.

**Do NOT change:** gradient direction (`bg-gradient-to-t`), positioning, padding, z-index, or buttons.

**Acceptance:** All three gradient bars use identical `from-parchment-100 via-parchment-100`. Build passes.

---

## Phase 2: Structural Consistency (Tasks 4–5)

### Task 4: Standardize border-radius hierarchy

**The system:**
- Cards/modals on light surfaces: `rounded-2xl` (16px)
- Buttons/inputs: `rounded-xl` (12px)
- Tags/pills: `rounded-full`
- Felt-board dark cards: `rounded-lg` (8px)

**Decision rules for ambiguous cases:**
- A "card" = any `bg-parchment-50` container with informational content → `rounded-2xl`
- A "button" = any clickable element that performs an action → `rounded-xl`
- An "input" = text input, textarea, select → `rounded-xl`
- Tinted insets (`bg-amber-50`, `bg-brew-50`) inside cards → keep `rounded-xl` (inner radius < outer)
- Elements inside `bg-felt-*` containers → leave at `rounded-lg`
- The circular start-brew button → leave `rounded-full`

**Known changes needed:**

*Cards that need promotion to `rounded-2xl`:*
- Audit BrewForm.jsx alert/prompt containers currently at `rounded-xl`
- Audit any card containers in BrewHistory.jsx at `rounded-xl`

*Buttons that need normalization to `rounded-xl`:*
- BrewForm.jsx line 509 — save button currently `rounded-2xl`, downgrade to `rounded-xl`
- Any other buttons at `rounded-2xl` or `rounded-lg`

*Inputs/selects that need normalization to `rounded-xl`:*
- BrewTrends.jsx lines 85, 134 — `<select>` at `rounded-lg`, promote to `rounded-xl`
- StepEditor.jsx — text inputs at `rounded-lg`, promote to `rounded-xl`

**Approach:** File-by-file audit. For each component, categorize every `rounded-*` instance as card/button/input/tag/felt, then normalize. This is judgment-heavy — proceed carefully.

**Acceptance:** Spot-check 5 cards (all `rounded-2xl`), 5 buttons (all `rounded-xl`), 5 inputs (all `rounded-xl`), 5 tags (all `rounded-full`). Build passes.

---

### Task 5: Lock text color hierarchy

**The five tones:**

| Tone | Class | Usage | Typical context |
|------|-------|-------|-----------------|
| Primary | `text-brew-900` / `text-brew-800` | Headings, body, card titles | `<h2>`, `<p>`, card headers |
| Data | `text-brew-700` | Numerical values with `font-mono` | Grind settings, times, weights |
| Interactive | `text-brew-500` | Ghost buttons, text actions, unselected interactive labels | "Log without timer", nav tabs, toggle tags |
| Metadata | `text-brew-400` | Timestamps, form labels, section labels | `<label>`, date strings, "Last brewed" |
| Hint | `text-ceramic-400` | Placeholders, disabled | `placeholder:`, `disabled:`, empty states |

**Decision matrix for `text-brew-500` (58 instances):**

| Context | Decision | Rationale |
|---------|----------|-----------|
| Ghost buttons / text links | **Keep `text-brew-500`** | Sanctioned interactive tone |
| Inactive nav tabs (Header.jsx) | **Keep `text-brew-500`** | Brand guide documents this |
| Unselected toggle tags (body, issues, methods) | **Keep `text-brew-500`** | Interactive labels need contrast |
| Form `<label>` elements | **Change to `text-brew-400`** | Labels are metadata |
| Timer display numerals (BrewScreen 5xl) | **Keep `text-brew-500`** | Hero display, not data value |
| Chart axis labels (BrewTrends) | **Change to `text-brew-400`** | Chart metadata |
| Section sub-labels | **Change to `text-brew-400`** | Metadata |

**Decision matrix for `text-brew-600` (26 instances):**

| Context | Decision | Rationale |
|---------|----------|-----------|
| Body/paragraph text | **Change to `text-brew-700`** | Body text tier |
| Card section headers | **Change to `text-brew-800`** | Heading tier |
| Interactive tag text (selected) | **Keep as-is** | On dark bg, needs contrast |
| Hover states on icons | **Leave unchanged** | Hover is transient |
| Import description text (SettingsMenu) | **Change to `text-brew-700`** | Body text |

**Decision matrix for `text-brew-300` (15 instances):**

| Context | Decision | Rationale |
|---------|----------|-----------|
| Placeholder text | **Change to `text-ceramic-400`** | Hint tier |
| Decorative separators (middots, arrows) | **Leave unchanged** | Decorative, not text |
| "as planned" hint text | **Change to `text-ceramic-400`** | Hint tier |
| Skipped step dimmed text | **Change to `text-ceramic-400`** | Disabled tier |
| `disabled:text-brew-500` on inputs | **Change to `disabled:text-ceramic-400`** | Disabled tier |

**Do NOT change:** Text on `bg-felt-*` surfaces, `text-crema-500` on buttons, status colors (sage, amber, red).

**Risk:** This is the most judgment-heavy task. Each of the ~100 instances needs classification. Work file-by-file. Verify visual hierarchy after each file.

**Acceptance:** Grep confirms no `text-brew-300` used as placeholder, no `text-brew-600` on body text, form labels use `text-brew-400`. Build passes.

---

## Phase 3: Component Enhancements (Tasks 6–7)

### Task 6: Add icons to MobileNav

**File:** `src/components/MobileNav.jsx` (35 lines)

**Four inline SVG icons (20x20, stroke-based, strokeWidth 1.5–2):**
- **Brew** — Pour-over dripper / coffee cup outline
- **Inventory** — Coffee bean outline
- **History** — Clock outline
- **Trends** — Trending-up line chart outline

**Styling:**
- Active: `stroke-current text-felt-200` (copper)
- Inactive: `stroke-current text-felt-700` (dark)
- Icons inherit color from parent `text-*` class via `currentColor`
- Labels: reduce to `text-[10px]` if needed to fit icon + label in touch target
- Touch target must remain ≥ 44px total height

**Structure per tab:**
```jsx
<button className="flex flex-col items-center justify-center ...">
  <svg width="20" height="20" ...>{/* icon */}</svg>
  <span className="text-[10px] ...">BREW</span>
</button>
```

**Do NOT:** Install icon libraries. Change hide behavior, positioning, blur backdrop, or border. Change desktop Header.

**Risk:** Ensure `min-h-[44px]` with `flex items-center justify-center` per touch-target learning. Icons must use `fill="none"` and `stroke="currentColor"` to inherit tab color.

**Acceptance:** Each tab shows icon above label. Active/inactive colors correct. Touch targets ≥ 44px. Build passes.

---

### Task 7: Progressive disclosure on RateThisBrew

**File:** `src/components/BrewScreen.jsx` (inline RateThisBrew, lines ~1098–1396)

**Restructure into two tiers:**

**Tier 1 (always visible):**
1. Summary header (total time, time status badge) — *unchanged*
2. Step Timing card — *unchanged*
3. Brew Details card (grind, time, notes, try-next-time) — *unchanged*
4. Rating emoji row — **extracted from Tasting card** into standalone section
5. "Add tasting details →" link — new, `text-brew-500 text-sm font-medium`
6. Done button — *unchanged*

**Tier 2 (collapsed by default, behind link):**
- FlavorPicker
- Body selector
- Issues selector

**Implementation approach:**
1. Add `const [showTasting, setShowTasting] = useState(false)` local state
2. Extract rating emojis out of the Tasting card into their own section between Brew Details and the tasting toggle
3. Wrap FlavorPicker, Body, Issues in a `<div>` gated by `showTasting`
4. Use CSS transition for height animation (existing collapsible pattern):
   ```jsx
   <div className={`overflow-hidden transition-all duration-300 ${showTasting ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
   ```
5. Toggle link text: "Add tasting details →" / "Hide tasting details"

**Layout after restructure:**
```
┌─ Summary Header ─────────────┐
│ Total time, time status       │
└───────────────────────────────┘
┌─ Step Timing Card ────────────┐  (if timed brew)
│ Step 1: 0:42 (+2s)            │
│ Step 2: 1:30 (-3s)            │
└───────────────────────────────┘
┌─ Brew Details Card ───────────┐
│ Grind ────── Total Time       │
│ ────────────────────────────  │
│ Notes textarea                │
│ ┌─ Try Next Time (amber) ──┐ │
│ │ textarea                  │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘

  😖  😕  😐  🙂  🤩   ← Rating (standalone, no card)

  Add tasting details →         ← Toggle link

┌─ Tasting Details ─────────────┐  (collapsed by default)
│ FlavorPicker                  │
│ Body selector                 │
│ Issues selector               │
└───────────────────────────────┘

[═══════ Done ═══════]          ← Fixed bottom CTA
```

**Do NOT:** Remove any tasting functionality. Change data save paths. Change Step Timing card. Change emoji rating scale internals.

**Risk areas:**
- **State preservation:** All state (`flavors`, `body`, `issues`) lives in parent RateThisBrew, not in the child components. Collapsing/expanding does not lose state regardless of render approach.
- **Crash recovery:** Active brew persistence saves `phase: 'rate'` but not `showTasting`. On recovery, tasting section will be collapsed. This is acceptable — data is preserved in state, user just needs to expand to see it.
- **Learning reference:** `docs/solutions/react-patterns/progressive-disclosure-summary-vs-details-split.md`

**Acceptance:** Quick path (tap rating + Done) works without scrolling. Tasting section expands/collapses smoothly. All tasting data saves correctly. Build passes.

---

## Institutional Learnings to Apply

| Learning | Applies to | Action |
|----------|-----------|--------|
| Typography drift requires canonical scale table | Task 5 | Decision matrices above serve as the scale table |
| Touch target min-h must use flex centering | Task 6 | Use `flex items-center justify-center` on MobileNav buttons |
| Progressive disclosure summary vs details split | Task 7 | Tier 1/Tier 2 structure follows this pattern |
| Extracted component should not bake layout wrapper | Task 7 | Rating section extracted without card wrapper |
| Content indicators on collapsed sections | Task 7 | Consider showing "3 flavors, Medium body" preview when collapsed |

---

## Validation After Each Task

1. `npm run build` — must pass with zero errors
2. Visual check in browser at mobile (375px) and desktop (1024px)
3. Verify no regressions in adjacent components
4. Commit: `checkpoint: after task N - [name]`

## Git Workflow

Per the spec, before each task:
1. Commit current state: `checkpoint: before task N - [name]`

After each task:
1. Run `npm run build`
2. Visual check
3. Commit with descriptive message

All work on a single branch — no per-task branches needed for a single-sprint session.

## References

- Brand guide: `docs/brand-guide.md`
- Tailwind config: `tailwind.config.js` (custom color scales)
- Spec-flow analysis identified 12 edge cases, all resolved in decision matrices above
