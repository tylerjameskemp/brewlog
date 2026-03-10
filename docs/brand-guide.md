# BrewLog Brand & Style Guide
**Current state as of March 2026**

This document captures every visual decision in the current codebase — fonts, colors, spacing, component patterns, and interaction conventions. Use it to identify inconsistencies and guide future design decisions.

---

## 1. Typography

### Font Stack

| Role | Font | Weight(s) | Where Used |
|------|------|-----------|------------|
| **Body / UI** | Inter | 300–700 | Labels, nav, descriptions, body copy, form labels |
| **Data / Precision** | JetBrains Mono | 400, 500 | Timer digits, brew params (dose, water, grind, time), step time ranges, tabular data |
| **Display / Headings** | Fraunces (opsz 9–144) | 400–700 | Page titles on light screens (RateThisBrew, BrewSuccess, EmptyState, Modal titles, History, Trends) |
| **Condensed / Felt Board** | Barlow Condensed | 400–800 | All text on dark felt-board surfaces (BeanLibrary, BeanPicker, MobileNav) |

### Type Scale (current usage)

| Size | Tailwind | Where |
|------|----------|-------|
| 72px | `text-7xl` | Active brew timer digits |
| 48px | `text-5xl` | RateThisBrew total time, Equipment "done" checkmark |
| 36px | `text-4xl` | Felt-board page headings ("BEAN INVENTORY", "HONE YOUR CUP"), empty state emoji |
| 30px | `text-3xl` | BrewSuccess "Brew Saved" heading |
| 24px | `text-2xl` | RecipeAssembly bean name, "Prepare Your Brew", "Rate This Brew" |
| 20px | `text-xl` | Section headings on light screens (History, Trends, Modal titles), felt-board bean names, EmptyState title |
| 18px | `text-lg` | Section card titles ("Step Timing", "Brew Details", "Tasting"), active step name, rating emojis |
| 16px | `text-base` | All form inputs (iOS zoom prevention), body text, felt-board subtext |
| 14px | `text-sm` | Metadata, secondary labels, brew card bean names, recipe params, button text |
| 12px | `text-xs` | Section labels, timestamps, diff badges, hints, data labels ("COFFEE", "WATER"), form labels |
| 10px | `text-[10px]` | Uppercase tracking labels, diff annotations, step number indicators, "Up next" label |

### Text Treatment Patterns

| Pattern | Classes | Where |
|---------|---------|-------|
| **Felt-board letterpress (large)** | `font-condensed text-4xl font-bold uppercase tracking-[3.5px] text-letterpress-lg text-felt-100` | Page headings on dark surfaces |
| **Felt-board letterpress (medium)** | `font-condensed text-xl font-bold uppercase tracking-[3.5px] text-letterpress text-felt-100` | Bean names on felt boards |
| **Felt-board metadata** | `font-condensed text-sm font-semibold uppercase tracking-[3px] text-letterpress-dim text-felt-500` | Roaster, origin, brew count on felt boards |
| **Felt-board action** | `font-condensed text-lg font-bold uppercase tracking-[4px] text-letterpress text-felt-200` | "BREW ›", "EDIT", "DELETE" on dark surfaces |
| **Display heading** | `font-display text-xl font-semibold text-brew-800` | Modal titles, History/Trends headings |
| **Section label** | `text-xs text-brew-400 uppercase tracking-wider` | "COFFEE", "WATER", "POUR STEPS", "NOTES", "FLAVORS", "BODY", "RATING" |
| **Data value** | `font-mono text-brew-800` (or `text-brew-700`) | Brew params, step times, grind settings |
| **Tabular nums** | `font-mono tabular-nums` | Timer, step timing display |

### Letterpress CSS (index.css)

Three tiers of text-shadow for the felt-board aesthetic:
- `.text-letterpress-lg` — headings: 4-layer shadow (highlight + 3 depth layers)
- `.text-letterpress` — bean names: 3-layer shadow
- `.text-letterpress-dim` — metadata: 2-layer shadow

---

## 2. Color Palette

### Core Palette (`brew-*`)

| Token | Hex | Usage |
|-------|-----|-------|
| `brew-50` | #fdf8f0 | Subtle backgrounds, hover states, input backgrounds |
| `brew-100` | #f5e6d0 | Card borders, dividers, chart grid lines, step editor borders |
| `brew-200` | #e8cba0 | Input borders, inactive button borders, chart axis lines |
| `brew-300` | #d4a574 | Placeholder text color, border hovers, timeline dots |
| `brew-400` | #c08552 | Secondary text, metadata, section labels, timestamps |
| `brew-500` | #a0673c | Tertiary text, selected flavor tags, step progress, chart tick text |
| `brew-600` | #7c4f2e | Body text emphasis, EquipmentSetup buttons (legacy), chart line colors |
| `brew-700` | #5c3a22 | Data values in forms, card expanded detail text |
| `brew-800` | #3d2718 | Primary headings, bean names, card titles, desktop nav active bg |
| `brew-900` | #2a1a10 | Global body text color (`text-brew-900` on body) |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| **Crema** (`crema-500`) | #C15F3C | **Primary CTA** — Brew This, Finish Brew, Done, Start New Brew, Set Up My Gear, range slider thumb |
| `crema-600` | #A44A30 | CTA hover state |
| `crema-50` | #FEF6EE | BrewSuccess checkmark gradient start |
| `crema-200` | #F9D1B0 | BrewSuccess border, fork prompt border |
| **Sage** (`sage-500`) | #7D8966 | Success/on-target — timer "On target", step variance ≤3s |
| **Parchment** (`parchment-50`) | #FEFDFB | **Card backgrounds** (all card containers) |
| `parchment-100` | #FAF7F2 | **App background** (body), Header bg, MobileNav bg |
| `parchment-200` | #F3ECE0 | BrewSuccess checkmark gradient end, hover bg |
| **Ceramic** (`ceramic-200`) | #E3DFDB | Header/MobileNav border |
| `ceramic-400` | #B5ADA5 | Settings gear icon, BrewSuccess secondary text |

### Dark Surface (Felt Board)

| Token | Hex | Usage |
|-------|-----|-------|
| `felt-900` | #1A1A1A | Outer wrapper bg |
| `felt-800` | #222222 | FeltBoard primary bg |
| `felt-700` | #2E2824 | FeltBoard border, groove color, divider lines |
| `felt-500` | #908880 | Secondary text on dark surfaces (roaster, metadata) |
| `felt-400` | #706858 | Tertiary text on dark (roast date, section labels) |
| `felt-300` | #5C5047 | "+ Add Bean" text |
| `felt-200` | #B87333 | **Active accent on dark** — MobileNav active, "BREW ›" action text, CTA button bg |
| `felt-100` | #EFEBE5 | Primary text on dark surfaces (bean names, headings) |

### Status & Semantic

| Color | Usage |
|-------|-------|
| `amber-50/100/200/500/600/700` | Diff badges, change indicators, "Try Next Time" box, compare mode selection, "approaching" timer status |
| `red-400/500/600` | Timer "over" status, delete actions, issues tags, off-note flavors |
| `green-400/600` | Past step checkmarks, added step indicators, step variance ≤3s |
| `blue-50/200/600/800` | Water scaling banner (unique — only used in RecipeAssembly) |

### Background Texture

Body has an SVG `feTurbulence` noise overlay at **3.5% opacity** on the `parchment-100` background:
```css
background-image: url("data:image/svg+xml,...feTurbulence type='fractalNoise' baseFrequency='0.65'...");
background-size: 256px 256px;
```

FeltBoard has a separate noise overlay at **12% opacity** (`baseFrequency: 2.2, numOctaves: 5`) plus two gradient-based ridge textures.

---

## 3. Component Patterns

### Cards

| Context | Background | Border | Radius | Shadow |
|---------|-----------|--------|--------|--------|
| **Light-screen card** | `bg-parchment-50` | `border border-brew-100` | `rounded-2xl` (16px) | `shadow-sm` |
| **Dark-surface card** (brew list in BeanLibrary) | `bg-felt-900/50` | none | `rounded-lg` (8px) | none |
| **Recipe card** (BeanLibrary) | `bg-felt-900/50` | `border border-felt-700/50` | `rounded-lg` | none |
| **Comparison panel** | `bg-parchment-50` | `border border-brew-100` | `rounded-2xl` | `shadow-sm` |
| **Modal** | `bg-parchment-50` | `border border-ceramic-200/40` | `rounded-2xl` | `shadow-2xl shadow-brew-900/10` |
| **Settings dropdown** | `bg-white` | `border border-brew-100` | `rounded-xl` (12px) | `shadow-lg` |
| **Equipment setup** | `bg-white` | none | `rounded-2xl` | `shadow-xl` |
| **Welcome prompt** | `bg-parchment-50` | `border border-ceramic-200/40` | `rounded-2xl` | `shadow-sm` |
| **Amber info box** | `bg-amber-50` | `border border-amber-200` | `rounded-xl` | none |

**Inconsistencies noted:**
- Settings dropdown and EquipmentSetup still use `bg-white` instead of `bg-parchment-50`
- EquipmentSetup "done" button uses `bg-brew-600` instead of `bg-crema-500`

### Buttons

#### Primary CTA (Terracotta)
```
bg-crema-500 text-white rounded-2xl text-base font-semibold
shadow-lg shadow-crema-500/20 hover:bg-crema-600 active:scale-[0.98]
```
Used for: Brew This, Finish Brew, Done, Start New Brew, Set Up My Gear, Update Recipe

#### Secondary CTA (Outlined)
```
border border-ceramic-300 text-brew-600 rounded-xl text-sm font-semibold
hover:bg-parchment-200/60 active:scale-[0.98]
```
Used for: View in History, Save as New Recipe, Keep Original

#### Toggle Tags (Selected / Unselected)
```
Selected:   border-brew-500 bg-brew-500 text-white rounded-full
Unselected: border-brew-200 text-brew-500 hover:bg-brew-50 rounded-full
```
Used for: Body options, Rating scale, Issues, Flavors, Equipment chips

#### Ghost / Text Button
```
text-brew-500 text-sm font-medium hover:text-brew-700
```
Used for: "Log without timer", "Show details", "Keep Original"

#### Dark Surface Actions
```
font-condensed text-lg font-bold text-felt-200 uppercase tracking-[4px] text-letterpress
```
Used for: "BREW ›", "EDIT", "DELETE" on felt boards

#### Destructive
```
text-red-400 hover:text-red-600 hover:bg-red-50
```
Used for: Delete brew, Delete recipe (confirmation state uses explicit red text)

**Inconsistencies noted:**
- EquipmentSetup uses `bg-brew-600` for Next/Save instead of `bg-crema-500`
- Settings import uses `bg-brew-600` for Import/Merge instead of `bg-crema-500`
- Some wizard buttons use `border-brew-200 text-brew-600` while other outlined buttons use `border-ceramic-300 text-brew-600`

### Inputs

| Type | Border | Background | Radius | Focus |
|------|--------|-----------|--------|-------|
| **Text input** | `border-brew-200` | transparent or `bg-brew-50` | `rounded-xl` (12px) | `ring-2 ring-brew-400` |
| **Number input** (recipe params) | `border-b border-brew-300` | `bg-transparent` | none | `ring-2 ring-brew-400` |
| **Select dropdown** | `border-brew-200` | `bg-white` | `rounded-xl` or `rounded-lg` | `ring-2 ring-brew-400` |
| **Textarea** | `border-brew-200` | `bg-brew-50` | `rounded-xl` | `ring-2 ring-brew-400` |
| **Range slider** | Track: `#f3ece0`, Thumb: `#c15f3c` (crema-500) | — | Track 3px, Thumb 50% | — |

All inputs use `text-base` (16px) to prevent iOS auto-zoom.

### Fixed Bottom CTA Bar

Pattern used on RecipeAssembly, ActiveBrew, RateThisBrew:
```
fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-4 pb-safe
bg-gradient-to-t from-parchment-100 via-parchment-100 to-transparent pointer-events-none z-10
```
Button inside uses `pointer-events-auto` to remain clickable through the gradient overlay.

**Note:** RecipeAssembly and RateThisBrew use `from-brew-50 via-brew-50` (slightly different warm tone). ActiveBrew now correctly uses `from-parchment-100`.

---

## 4. Layout & Spacing

### Responsive Breakpoints

| Breakpoint | Navigation | Content Width |
|-----------|-----------|---------------|
| **Mobile** (< md/768px) | Bottom fixed nav (MobileNav) | Full width with `px-4` padding |
| **Desktop** (≥ md) | Top tab bar (Header) | `max-w-2xl mx-auto` (672px) |

### Navigation

**Header** (desktop): `h-12 md:h-14`, sticky top, `bg-parchment-100/80 backdrop-blur-md`, `border-b border-ceramic-200/60`
- Logo: coffee emoji + "BrewLog" in `font-display text-base font-semibold`
- Tabs: `px-4 py-2 rounded-lg text-sm font-medium`
- Active tab: `bg-brew-800 text-parchment-100`
- Inactive tab: `text-brew-500 hover:text-brew-700`

**MobileNav** (mobile): `h-16`, fixed bottom, `bg-parchment-100/80 backdrop-blur-md`, `border-t border-ceramic-200/50`
- Labels: `font-condensed text-sm font-bold uppercase tracking-[2.5px]`
- Active: `text-felt-200` (copper/bronze)
- Inactive: `text-felt-700`
- Hidden during brew flow phases (recipe/brew/rate)

**Header hidden** when view is `brew` (no edit) or `beans` (felt-board fills viewport)

### Touch Targets

- Minimum: `min-h-[44px]` (Apple HIG)
- Primary CTA buttons: `py-4` (~56px)
- Start brew button: `w-[72px] h-[72px]` circular
- Tag buttons: `min-h-[44px]` with adequate padding

### Content Padding

- Main content: `px-4` with `pb-32 md:pb-24` (bottom clearance for nav)
- During brew flow: `pb-24` (no MobileNav)
- Cards: `p-5` internal padding
- Felt-board pages: `px-6 pt-10 pb-8`

---

## 5. Animation & Motion

| Animation | Duration | Easing | Where |
|-----------|----------|--------|-------|
| `fade-in` | 300ms | ease-out | View transitions, collapsible reveals |
| `fade-in-up` | 300ms | ease-out | Empty states, hint banners, stats card |
| `scale-in` | 200ms | ease-out | Modals, equipment setup |
| `pulse-dot` | 2s | ease-in-out infinite | Current step timeline dot |
| `brew-complete` | 800ms | cubic-bezier(0.34, 1.56, 0.64, 1) | BrewSuccess checkmark (elastic bounce) |
| `warm-glow` | 1.5s | ease-out | BrewSuccess glow ring |
| `slide-up` | 500ms | ease-out | BrewSuccess staggered content (d1: +150ms, d2: +300ms, d3: +450ms) |
| `board-slide` | 200ms | ease-out | Felt-board expand content |
| `countdown-tick` | 1s | ease-out forwards | Pre-brew 3-2-1 countdown digits |
| Collapsible | 300ms | ease-in-out | `max-height` + `opacity` transition |

All animations paired with `motion-reduce:animate-none` for accessibility.

### Transitions

- Buttons: `transition-colors duration-150` (global on button/input)
- Active/hover: `transition-all` on CTA buttons
- Cards: `transition-colors` for hover/selection states
- Felt-board dimming: `transition-opacity duration-[250ms]` for non-expanded beans
- `active:scale-[0.98]` press feedback on CTA buttons

---

## 6. Iconography

### Current Icon Usage

| Type | Implementation | Where |
|------|---------------|-------|
| App logo | ☕ emoji | Header |
| Bean empty state | 🫘 emoji (U+1FAD8) | BeanLibrary empty |
| Settings gear | Custom SVG (18×18, stroke) | Header |
| Back arrow | Custom SVG (20×20, stroke) | RecipeAssembly |
| Play button | Custom SVG (24×24, fill) | ActiveBrew start |
| Checkmark | Custom SVG (40×40, stroke) | BrewSuccess |
| Close (×) | HTML entity `✕` / `✗` | Modals, skip step, dismiss |
| Trash | Custom SVG (24-path, stroke) | Recipe delete |
| Edit pencil | Custom SVG (24-path, stroke) | Recipe rename |
| Rating | Emoji scale (😬😐🙂😊🤩) | RateThisBrew, History cards |
| Flavor categories | Emoji prefixes (🍊🍫🥜🌸🌿🔥⚠️) | FlavorPicker |
| Brew methods | Emoji (☕🫖 etc.) | Equipment/method selectors |
| Collapse | `▾` (U+25BE) character | Collapsible sections |
| Navigation arrows | `→` (U+2192) entity | Step time ranges, diff indicators |

**No icon library** is used. Icons are a mix of inline SVGs, Unicode characters, and emoji. This creates visual inconsistency in weight and style across the app.

---

## 7. States & Feedback

### Timer Status Colors

| Status | Timer Text | Progress Bar | Label |
|--------|-----------|-------------|-------|
| Idle/counting | `text-brew-900` | `bg-crema-500` | — |
| Under target | `text-brew-900` | `bg-crema-500` | `text-ceramic-400` "Xs to go" |
| Approaching | `text-amber-600` | `bg-amber-500` | `text-amber-500` "Xs left" |
| On target | `text-sage-500` | `bg-sage-500` | `text-sage-500` "On target" |
| Over target | `text-red-600` | `bg-red-500` | `text-red-500` "Xs over" |

### Diff Badges

```
px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium
```
Always amber. Used in History card collapsed view and comparison panel.

### Selection States (Compare Mode)

```
Selected:   border-amber-200 bg-amber-50/30 (card) + border-amber-500 bg-amber-500 text-white (circle)
Unselected: border-brew-100 (card) + border-brew-200 (circle)
```

### Empty States

Centered layout with emoji (4xl), `font-display` title, `text-ceramic-400` description, optional CTA button. Two variants:
- **Light** (EmptyState.jsx): parchment background, used in History/Trends
- **Dark** (inline in BeanLibrary): felt-board background, letterpress text

---

## 8. Surfaces & Depth Model

### Light Screens (most of app)

```
Background:  parchment-100 (#FAF7F2) + grain texture
Cards:       parchment-50  (#FEFDFB) + border-brew-100 + shadow-sm
Inputs:      brew-50       (#FDF8F0) or transparent
Modals:      parchment-50  + shadow-2xl + brew-900/50 backdrop
```

Depth created via border + subtle shadow, never strong box-shadow.

### Dark Screens (BeanLibrary, BeanPicker)

```
Background:  felt-900 (#1A1A1A) wrapper
Surface:     felt-800 (#222222) + ridge textures + noise
Cards:       felt-900/50 (semi-transparent darker)
```

Depth created via noise texture + linear gradient ridges + text-shadow (letterpress), never traditional shadows.

---

## 9. Identified Inconsistencies & Opportunities

### Visual Inconsistencies (from codebase audit)

1. **EquipmentSetup** still uses `bg-white` and `bg-brew-600` buttons — hasn't been updated to match the warm palette and terracotta CTA system
2. **SettingsMenu dropdown** uses `bg-white` and `bg-brew-600` / `bg-amber-500` buttons
3. **FlavorPicker** expanded category area uses `bg-white` for unselected flavor tags
4. **StepEditor** expanded card uses `bg-white` (appropriate for form context, but inconsistent)
5. **Bottom CTA gradients** vary between `from-brew-50` and `from-parchment-100` — should pick one
6. **Border radius** varies: cards are `rounded-2xl` (16px), some buttons/inputs are `rounded-xl` (12px), tags are `rounded-full`, some inputs are `rounded-lg` (8px) — intentional hierarchy but not documented
7. **Icon style** mixes inline SVG, Unicode glyphs, and emoji with no consistent weight/size system

### User Journey Opportunities

1. **Brew → Rate transition has no ceremony** — timer ends, screen swaps instantly. The research doc suggests a 1.5s "Brew Complete" moment (animation exists in BrewSuccess but not at the timer→rate boundary)
2. **RateThisBrew shows everything at once** — no progressive disclosure. Quick-rate path (just tap a rating + optional note) vs detailed path (flavors, body, issues) could dramatically improve logging consistency
3. **"What would you change?" is freeform text** — structured quick-action buttons ("Finer grind", "Coarser grind", etc.) would be faster to use and create better structured data for auto-diff
4. **No bean-specific trend views** — Trends is global-only (with bean filter dropdown). A sparkline or mini-chart on each bean card in the library would surface dial-in progress at a glance
5. **History lacks visual bean grouping** — all brews in one flat list. Grouping by bean with per-bean sparklines (as the research suggests) would make the "what's improving" story clearer
6. **MobileNav labels are text-only** — no icons. Research suggests filled/outlined icon pairs for active/inactive states create faster recognition
7. **Onboarding is equipment-first** — research suggests "brew first, set up later" for faster time-to-value

### Design System Gaps

1. **No documented spacing scale** — spacing is ad-hoc (`gap-2`, `gap-3`, `gap-4`, `mt-1.5`, `mt-2`, `mt-3`, etc.) with no systematic rhythm
2. **No dark mode** — palette is defined but no dark mode tokens or implementation
3. **No component library** — each component reinvents card, button, and input patterns. A shared `Card`, `Button`, `Tag` component set would enforce consistency
4. **No motion tokens** — animations are defined in Tailwind config but there's no semantic system (e.g., "enter", "exit", "feedback")
5. **`card-warm` CSS class exists but is unused** — was created for this purpose but never adopted (we used `bg-parchment-50` directly instead)

---

## 10. Quick Reference — "Which color do I use?"

| Need | Use |
|------|-----|
| Page/app background | `bg-parchment-100` |
| Card background | `bg-parchment-50` |
| Primary heading text | `text-brew-800` |
| Body text | `text-brew-900` (set on body) |
| Secondary/metadata text | `text-brew-400` or `text-brew-500` |
| Primary CTA button | `bg-crema-500` + `text-white` |
| Secondary/outlined button | `border-ceramic-300` + `text-brew-600` |
| Input border | `border-brew-200` |
| Input focus | `ring-2 ring-brew-400` |
| Card border | `border-brew-100` |
| Success/positive | `text-sage-500` or `bg-sage-500` |
| Warning/change | `text-amber-700` or `bg-amber-50` |
| Error/destructive | `text-red-500` or `bg-red-50` |
| Text on dark surfaces | `text-felt-100` (primary), `text-felt-500` (secondary) |
| Active accent on dark | `text-felt-200` (copper/bronze) |
