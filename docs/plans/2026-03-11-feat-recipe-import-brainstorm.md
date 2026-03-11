# Recipe Import — Brainstorm & Research Plan

**Date:** 2026-03-11
**Status:** Brainstorm (pre-planning)
**Branch:** tylerjameskemp/recipe-import-brainstorm

---

## Problem Statement

BrewLog users find recipes from wildly varied sources — ChatGPT responses, roaster blogs, YouTube videos, Fellow Drops, Instagram posts, Reddit threads. There's no standard format. Users currently have to manually re-enter recipe parameters into BrewLog, which is friction that discourages trying new recipes.

Additionally, recipes rarely specify grinder-specific settings. They say "medium-fine" but the user needs to know what that means on *their* grinder with *their* burrs.

## User Stories

1. **As a brewer**, I want to paste recipe text from any source and have BrewLog extract the structured recipe (dose, water, grind, temp, steps) so I don't have to re-enter it manually.
2. **As a brewer**, I want imported recipes to translate grind descriptions to my specific grinder + burr setup so I know where to set my dial.
3. **As a brewer**, I want to save imported recipes as reusable templates that I can apply to different beans.
4. **As a brewer**, I want to apply a template recipe to a specific bean and have it become that bean's recipe.

## Key Decisions Made

### Data source: paste text OR paste URL
- Recipes come from too many different sources (ChatGPT, blogs, YouTube, roasters) for targeted scrapers
- User already has text copied — Crouton-style clipboard detection UX
- **Also support URL input** — app detects whether input is a URL or raw text
- If URL: Cloudflare Worker fetches page content, strips to readable text, then extracts
- If text: send directly to LLM for extraction
- The worker handles both URL fetching and LLM extraction, so URL support is minimal extra work

### Extraction method: LLM-powered (Claude Haiku via Cloudflare Worker)
- Recipe text format varies too much for reliable regex/heuristic parsing
- Input is often already LLM-generated (from ChatGPT), so format is unpredictable
- Claude Haiku cost is ~$0.003 per import — negligible for personal use
- Single Cloudflare Worker as API proxy (free tier: 100K req/day)
- Fallback: client-side heuristic parsing for simple structured recipes

### Recipe model: template recipes (unlinked) + bean-specific recipes
- Current model requires `beanId` on every recipe — too restrictive for imports
- **Imported recipes use `beanId: null`** — no fake IDs, no special numbering scheme
- A recipe with `beanId: null` is a template. When linked to a bean, set the `beanId`.
- `saveRecipe()` needs a small change to allow null `beanId` for imported recipes
- When user applies a template to a bean, it becomes a bean-specific recipe (copy with beanId)
- This is an enriched version of the existing `pourTemplate` concept

### Multi-recipe pages
- A single URL may contain multiple recipes (e.g., Fellow Drops with V60 + Kalita + AeroPress)
- LLM extraction must return an **array** of recipes, not a single recipe
- If multiple recipes found: present a picker — "We found 3 recipes. Which do you want to import?"
- Option to import multiple at once
- If only one recipe found: skip picker, go straight to review

### Equipment mismatch handling
- **Import and adaptation are two separate features** — don't conflate them
- v1: Import recipe as-is with its original method, even if user doesn't own that device
- Surface mismatch clearly: "This recipe is for a V60. You have a Kalita Wave set up."
- User can edit method/parameters manually during review
- v2 (future): "Adapt for my equipment" button — LLM suggests adjustments (grind, timing, step structure) based on target device
- Key insight: V60 → Stagg X is nearly 1:1 (both cones). V60 → Kalita Wave has real differences (flat bottom, drainage, grind). V60 → French Press is a completely different method — no meaningful translation.
- Method compatibility tiers to consider:
  - **Same geometry**: V60 ↔ Stagg X ↔ Origami (cone). Near-identical translation.
  - **Similar category**: V60 ↔ Kalita Wave (pour-over but different geometry). Needs grind/timing adjustment.
  - **Different category**: V60 ↔ French Press ↔ AeroPress. Not translatable — different method entirely.

### Grinder translation: static mapping table + burr variants
- Grind descriptions normalized to qualitative tiers (extra-fine → coarse)
- Client-side mapping table: `grinder + generation + burr set → tier → setting range`
- Output is a suggested range, not a single number
- Grinder generations matter (Ode Gen 1 vs Gen 2 have different stock burrs)
- Aftermarket burrs (SSP, etc.) significantly change the mapping

---

## Architecture

```
User pastes text or URL
    ↓ Detect: URL or raw text?
    ↓
[If URL] Cloudflare Worker fetches page → strips to readable content
[If text] Pass through as-is
    ↓
Cloudflare Worker → Claude Haiku extraction
    ↓
Array of structured recipe JSON(s)
  - method, dose (g), water (g), temp, qualitative grind tier
  - steps: [{ name, waterTo, duration, note }]
  - source metadata (original text, extraction confidence)
    ↓
[If multiple recipes] User picks which to import
[If one recipe] Skip picker
    ↓ Client-side
Equipment mismatch check (recipe method vs user's equipment)
    ↓ Show advisory if mismatched
Grinder translation (grinder + gen + burr → suggested range)
    ↓
Pre-filled review/edit form
    ↓ User confirms
Saved as template recipe (beanId: null) or applied to bean
```

### Data Model Changes Needed

#### 1. Template recipes (new concept)
Allow recipes with `beanId: null`. Add fields:
- `source`: 'imported' | 'manual' | 'forked'
- `sourceUrl`: original URL if imported from web (for re-extraction, attribution)
- `sourceText`: original pasted text (for re-extraction)
- `importedAt`: ISO timestamp
- `qualitativeGrind`: tier name from extraction (e.g., 'medium-fine')
- `sourceName`: recipe author/roaster name if detected
- `originalMethod`: preserved original method even if user changes it during review

#### 2. Grinder model expansion
Current: `{ id, name, settingType, min, max }`
Needed: `{ id, name, generations: [{ id, name, burrs: [{ id, name }] }], settingType }`

#### 3. Equipment model expansion
Current: `{ grinder: 'fellow-ode' }`
Needed: `{ grinder: 'fellow-ode', grinderGeneration: 'gen-1', burrSet: 'ssp-mp' }`

#### 4. Grind mapping table (new, in defaults.js)
```js
GRIND_CALIBRATION = {
  'fellow-ode:gen-1:stock': {
    'extra-fine': null, // not capable
    'fine': '1-2',
    'medium-fine': '3-5',
    'medium': '5-7',
    'medium-coarse': '7-9',
    'coarse': '9-11',
  },
  'fellow-ode:gen-1:ssp-mp': {
    'fine': '1-2',
    'medium-fine': '2-4',
    // ...
  },
}
```

---

## Cost Estimate

| Component | Tech | Ongoing Cost |
|---|---|---|
| Clipboard detection | Browser Clipboard API | $0 |
| LLM extraction | Cloudflare Worker + Claude Haiku | ~$0.003/import |
| Grinder translation | Static table in defaults.js | $0 |
| Review form | React component | $0 |
| Cloudflare Worker hosting | Workers free tier | $0 |

**Estimated annual cost at personal use:** $1-5/year

---

## Research (Completed 2026-03-11)

### 1. Grinder + burr calibration table — DONE
**Full reference:** [research-grinder-calibration.md](./2026-03-11-research-grinder-calibration.md)

Compiled calibration data for 10 grinder platforms across 6 qualitative tiers, including generation variants and aftermarket burr swaps. Key findings:
- Grinder *generations* matter significantly (Ode Gen 1 stock floor: 550 microns vs Gen 2: 275 microns)
- Aftermarket burrs change everything (SSP MP on Ode Gen 1 drops floor to ~200 microns)
- MK3 vs MK4 Comandante have identical burrs — differences are ergonomic only
- Static mapping table is viable for supported grinders
- Notable grinders to consider adding: Baratza Virtuoso+, DF64, Timemore Sculptor, 1Zpresso K-series

### 2. Recipe language patterns — DONE
**Full reference:** [research-recipe-language.md](./2026-03-11-research-recipe-language.md)

Audited recipes from YouTube, roasters, Fellow Drops, Reddit, and ChatGPT. Key findings:
- No standard coffee recipe schema exists
- Two water conventions: cumulative ("pour to 300g") and additive ("pour 60g") — must handle both
- Steps can include non-pour actions (swirl, stir, wait)
- Grind descriptions span qualitative, comparative, and grinder-specific
- Proposed 25+ field extraction schema with confidence scoring

### 3. LLM extraction prompt engineering — TODO
- Design system prompt for Claude Haiku
- Define output JSON schema (draft in recipe language doc)
- Test against 10+ real recipe texts
- Confidence scoring approach

### 4. Crouton UX study — TODO
- Clipboard detection UX
- Review/edit flow after import
- Imported vs user-created recipe organization

---

## Icebox (noted, not now)

- **Recipe search/discovery**: "Find me a recipe for this Ethiopian natural" — needs a recipe database or LLM search
- **Method adaptation ("Adapt for my equipment")**: LLM-powered recipe translation between methods (V60 → Kalita Wave grind/timing adjustments). Import as-is first (v1), adapt later (v2).
- **Community recipe sharing**: Way future
- **Crowdsourced grind calibration**: Users' brew data could refine the mapping table over time
- **Bean-specific grind suggestions**: "Last time you brewed this bean at 4-1 and rated it 5 stars"

---

## Next Steps

1. [x] Research: grinder + burr calibration table
2. [x] Research: recipe language pattern audit
3. [ ] Design: data model changes (template recipes, grinder expansion)
4. [ ] Design: import UX flow (clipboard, review form)
5. [ ] Prototype: LLM extraction prompt + test against real recipes
6. [ ] Build: Cloudflare Worker skeleton
7. [ ] Build: client-side import flow
