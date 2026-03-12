---
title: "feat: Recipe import v2 hardening"
type: feat
date: 2026-03-12
origin: docs/plans/2026-03-11-feat-recipe-import-brainstorm.md
related:
  - docs/plans/2026-03-11-feat-recipe-import-plan.md
---

# Recipe Import V2 Hardening

## Summary

Phase 1 fixed the most obvious failures: article URLs are no longer truncated before extraction, YouTube links have a dedicated path, and the client no longer pads weak extractions into fake recipes.

That is not enough for the Crouton-level bar. V2 should make recipe import feel effortless for three real entry points:

1. pasted recipe text
2. article URLs
3. YouTube URLs

The core change is architectural: **source-specific ingestion, source-agnostic extraction**. The model should only see cleaned source text plus provenance. It should not be responsible for scraping, transcript discovery, or deciding whether a page is even readable.

## Why V2 Exists

The original March 11 plan assumed URL fetching was “minimal extra work” (see brainstorm: `docs/plans/2026-03-11-feat-recipe-import-brainstorm.md`). Phase 1 proved that assumption false.

Observed gaps after implementation:

- Generic article fetching still relies on regex-heavy extraction and will remain brittle on some sites.
- YouTube transcript support is only best-effort and does not yet have a reliable fallback chain.
- The product has no evaluation corpus, so prompt changes and model changes are guesswork.
- The import UI still behaves like a thin wrapper around a worker call, not a source-aware ingestion flow.
- There is no telemetry or debug surface for “why did this import fail?”

## Goals

- Import recipes successfully from pasted text, article URLs, and captioned YouTube videos.
- Fail honestly and quickly when the source is unreadable or contains no recipe.
- Make model choice a benchmarked implementation detail, not a hardcoded assumption.
- Preserve the current recipe entity model unless a new persisted field is clearly useful.

## Non-Goals

- “Adapt for my equipment” method translation beyond the current review/edit flow.
- Community recipe search or sharing.
- Full audio transcription of arbitrary videos as the default path.
- Provider-specific targeted scrapers for dozens of coffee sites.

## Key Decisions

### 1. Introduce a first-class import candidate type

Do not map worker output directly to a `Recipe` entity anymore. Add an intermediate `RecipeImportCandidate` shape in the client.

```js
{
  sourceKind: 'text' | 'article' | 'youtube',
  ingestionMethod: 'direct' | 'jsonld' | 'readability' | 'description' | 'transcript',
  warnings: string[],
  confidence: 'high' | 'medium' | 'low',
  extracted: { ...recipe-like fields... }
}
```

This keeps ingestion/debug metadata out of persistent recipe data while giving the UI enough context to explain failures and partial results.

### 2. Keep source acquisition separate from model extraction

Recommended worker structure:

- `worker/src/sources/text.js`
- `worker/src/sources/article.js`
- `worker/src/sources/youtube.js`
- `worker/src/extract/extractRecipes.js`
- `worker/src/extract/validateCandidate.js`

`worker/src/index.js` becomes a thin router instead of accumulating all logic.

### 3. Use a transcript fallback chain for YouTube

Recommended order:

1. Native caption discovery from watch-page data
2. Description-only extraction if the description is recipe-like
3. Explicit failure with actionable copy

Do **not** make speech-to-text the default in V2. Add the abstraction for it, but keep it as a later fallback because it adds latency, cost, and more infrastructure.

### 4. Benchmark models after ingestion is stable

Do not switch models first. Use the cleaned ingestion pipeline to compare:

- Claude Haiku 4.5
- Gemini 2.5 Flash-Lite
- GPT-4.1 nano
- GPT-4.1 mini

V2 should make the model pluggable behind one extraction interface so the benchmark can be run without UI changes.

## User Flows

### Flow A: Pasted Text

1. User opens import modal
2. Modal attempts clipboard prefill if the open action counts as a user gesture
3. User confirms or edits pasted text
4. Worker classifies source as `text`
5. Extraction returns one or more import candidates
6. User reviews and saves

### Flow B: Article URL

1. User pastes URL
2. Worker classifies source as `article`
3. Worker extracts:
   - title
   - meta description
   - JSON-LD fields
   - article/main/body text
4. Worker scores the extracted text before sending to the model
5. If the page is too low-signal, return a direct “paste the article text” error
6. Otherwise continue to review

### Flow C: YouTube URL

1. User pastes URL
2. Worker classifies source as `youtube`
3. Worker attempts caption extraction
4. If captions are unavailable, inspect description
5. If description is recipe-like, continue
6. If not, return a direct “paste transcript or recipe text” error

## Edge Cases To Cover

- Multi-recipe pages where only one recipe is relevant
- Recipe-like marketing copy with no actual brew parameters
- YouTube videos with captions but no recipe in the spoken content
- YouTube videos with recipe in description but no captions
- A clean recipe with valid `0` step durations
- Retry after failure without stale candidate state
- User closes modal during extraction
- Same URL imported repeatedly

## Technical Plan

### Phase 2.1: Worker Architecture Cleanup

**Goal:** Move from a single large worker file to composable source adapters and extraction helpers.

Files:

- `worker/src/index.js`
- `worker/src/sources/article.js`
- `worker/src/sources/text.js`
- `worker/src/sources/youtube.js`
- `worker/src/extract/extractRecipes.js`
- `worker/src/extract/validateCandidate.js`

Tasks:

- Extract article ingestion helpers from `index.js`
- Extract YouTube ingestion helpers from `index.js`
- Create one normalized source payload shape passed into extraction
- Keep prompt/schema definitions in one place

### Phase 2.2: Stronger Candidate Validation

**Goal:** Replace “recipe or not” with explicit candidate validation and warnings.

Files:

- `worker/src/extract/validateCandidate.js`
- `src/data/recipeImport.js`

Tasks:

- Add candidate-level validation rules:
  - missing method
  - missing dose/water
  - no step signal
  - suspiciously generic output
- Preserve warnings for the review UI instead of flattening everything into a generic confidence flag
- Keep numeric fields nullish until the user fixes them

Institutional learnings to follow:

- `docs/solutions/logic-errors/entity-form-field-mapping-diverges-across-sites.md`
- `docs/solutions/logic-errors/nullish-coalescing-required-for-numeric-form-state.md`

### Phase 2.3: Review Modal Becomes Candidate Review

**Goal:** Make the modal source-aware and reduce ambiguity during review.

Files:

- `src/components/RecipeImportModal.jsx`
- `src/data/recipeImport.js`

Tasks:

- Keep phases explicit and formal
- Add source badge: `Text`, `Article`, `YouTube`
- Show ingestion warnings separately from extraction confidence
- Add tailored retry actions:
  - “Paste article text instead”
  - “Paste transcript instead”
- Add an optional raw-source preview in development mode

Institutional learnings to follow:

- `docs/solutions/react-patterns/terminal-state-must-be-a-formal-phase.md`
- `docs/solutions/react-patterns/reset-handler-must-clear-all-related-state.md`

### Phase 2.4: Evaluation Harness

**Goal:** Stop prompt/model changes from being qualitative guesswork.

Files:

- `worker/fixtures/recipe-import/`
- `worker/scripts/eval-recipe-import.mjs`
- `docs/plans/2026-03-12-research-recipe-import-benchmark.md`

Tasks:

- Create a corpus of at least 20 import cases:
  - 5 pasted texts
  - 5 article URLs
  - 5 YouTube videos with captions
  - 5 failure cases
- Define expected outputs:
  - parse success/fail
  - field accuracy
  - failure reason
- Add a script that runs the extraction model against fixtures and records results

### Phase 2.5: Model Benchmark and Routing

**Goal:** Compare cheap models on clean ingestion input before changing production defaults.

Files:

- `worker/src/extract/extractRecipes.js`
- `docs/plans/2026-03-12-research-recipe-import-benchmark.md`

Tasks:

- Add one config point for active model/provider
- Benchmark Haiku 4.5, Gemini 2.5 Flash-Lite, GPT-4.1 nano, GPT-4.1 mini
- Score by:
  - success rate
  - abstention correctness
  - latency
  - cost
- If one cheap model is close to Haiku on clean inputs, use it for first pass and keep a stronger fallback only for ambiguous cases

## Acceptance Criteria

- [ ] The Fellow Burundi Remera article URL imports into a usable review state from URL alone.
- [ ] A captioned YouTube recipe video imports from transcript or recipe-like description.
- [ ] A YouTube video with no usable transcript or recipe-like description returns a direct fallback message, not a blank candidate.
- [ ] Import candidates preserve warnings and missing fields instead of silently defaulting them.
- [ ] The review modal disables save until required fields are valid.
- [ ] A benchmark corpus exists and can be rerun after prompt/model changes.
- [ ] The worker is internally structured by source adapter rather than one monolithic handler.

## Risks

- YouTube transcript access may remain brittle without a dedicated provider.
- Article extraction quality may plateau on JS-heavy pages without an external readability service.
- Model benchmarking can create churn if fixture expectations are not carefully defined.

## Open Questions

1. Do we want a paid transcript provider in V2, or do we keep native captions + description only for now?
2. Should source warnings be persisted on the recipe entity, or only live in the import candidate?
3. Do we want URL result caching in the worker once the ingestion output stabilizes?

## Recommended Sequence

1. Refactor worker into source adapters.
2. Add import candidate validation and warning propagation.
3. Upgrade the modal to candidate review.
4. Build the evaluation corpus and script.
5. Run the benchmark and choose the default model.

## Sources

- Origin brainstorm: `docs/plans/2026-03-11-feat-recipe-import-brainstorm.md`
- Prior implementation plan: `docs/plans/2026-03-11-feat-recipe-import-plan.md`
- YouTube captions API limitations:
  - https://developers.google.com/youtube/v3/docs/captions/list
  - https://developers.google.com/youtube/v3/docs/captions/download
- Model pricing:
  - https://www.anthropic.com/claude/haiku
  - https://platform.openai.com/docs/pricing/
  - https://ai.google.dev/pricing
