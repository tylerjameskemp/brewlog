---
title: "feat: Recipe import evaluation corpus and harness"
type: feat
date: 2026-03-12
origin: docs/plans/2026-03-12-feat-recipe-import-v2-plan.md
related:
  - docs/plans/2026-03-12-refactor-worker-source-adapters-plan.md
---

# Recipe Import Evaluation Corpus & Harness

## Overview

Build a corpus of real recipe import cases and a scoring script so that prompt/model changes are measured, not guessed. Currently, every extraction change is qualitative — someone pastes a URL and eyeballs the result. This makes regressions invisible and model comparison impossible.

## Problem Statement

- No automated way to detect extraction regressions after prompt edits
- No baseline to compare models (Haiku 4.5 vs. Gemini Flash-Lite vs. GPT-4.1 nano)
- No failure case coverage — we don't know if the LLM hallucinates recipes from non-recipe inputs
- `isMeaningfulExtractedRecipe` is the only quality gate, and it's a blunt signal count

## Key Design Decisions

### 1. Test extraction only, not adapters

Fixtures store **post-adapter sourceText**, not raw HTML. Rationale:
- The LLM extraction is the non-deterministic, hard-to-test part
- Adapters are deterministic pure functions — testable separately with unit tests
- Raw HTML fixtures would be 50-500KB each and rot when sites redesign
- Post-adapter text is 2-12KB and stable

Adapter regression testing is a separate concern — captured HTML snapshots in `worker/fixtures/adapter-snapshots/` can be added later without coupling to this harness.

### 2. Use `temperature: 0` for reproducibility

The current extraction call uses the default temperature (1.0). The eval script will override to `temperature: 0` to minimize non-determinism. This means:
- Most runs produce identical output for the same fixture
- No need for multi-run statistical analysis in v1
- A `--runs=N` flag can be added later for stability testing

This requires `extractRecipes()` to accept an optional `temperature` parameter (small signature change).

### 3. Three-tier field matching

Not all fields deserve exact comparison:
- **Exact match**: `method`, `confidence`, `grindTier` (enum values)
- **Numeric tolerance**: `coffeeGrams`, `waterGrams` (±5%), step `waterTo` (±5g), step `duration` (±5s)
- **Normalized contains**: `grindDescription`, `waterTemp`, `targetTime`, `name`, `sourceName` (case-insensitive, whitespace-trimmed, expected is substring of actual)
- **Steps**: matched by position; name uses contains match; extra/missing steps penalized but not fatal
- **`null` in expected**: means "don't score this field" — useful when a field varies harmlessly

### 4. Scoring rubric

| Dimension | Weight | What it measures |
|---|---|---|
| Extraction success | 30% | Did extraction return a recipe when expected (or empty when expected)? |
| Core parameters | 25% | `coffeeGrams`, `waterGrams`, `method` accuracy |
| Steps quality | 20% | Step count, names, waterTo, durations |
| Grind & temperature | 10% | `grindDescription`, `grindTier`, `waterTemp` |
| Target time | 5% | `targetTime` accuracy |
| Metadata | 5% | `name`, `sourceName`, `confidence` |
| Abstention correctness | 5% | Failure cases correctly produce empty results |

The script reports both a weighted composite score and per-dimension breakdowns.

## Fixture Schema

Each fixture is a JSON file in `worker/fixtures/recipe-import/`:

```json
{
  "id": "hoffmann-v60-article",
  "description": "James Hoffmann Ultimate V60 — article text extraction",
  "sourceType": "article",
  "tags": ["article", "single-recipe", "well-known"],
  "grinderName": "",
  "sourceText": "Source title:\nThe Ultimate V60 Technique...",
  "expected": {
    "result": "pass",
    "recipeCount": 1,
    "recipes": [
      {
        "method": "v60",
        "coffeeGrams": 15,
        "waterGrams": 250,
        "grindDescription": null,
        "grindTier": "medium-fine",
        "waterTemp": "100",
        "targetTime": "3:00-3:30",
        "steps": [
          { "name": "Bloom", "waterTo": 45, "duration": 45 },
          { "name": "First pour", "waterTo": null, "duration": null }
        ],
        "sourceName": "James Hoffmann",
        "confidence": "high"
      }
    ]
  }
}
```

Fields:
- `id`: unique slug, used as fixture identifier in results
- `description`: human-readable purpose of this test case
- `sourceType`: `"text"` | `"article"` | `"youtube"` — passed to `extractRecipes()`
- `tags`: for filtering with `--filter`
- `grinderName`: optional, tests grinder-context matching
- `sourceText`: the cleaned text that would be passed to `extractRecipes()`
- `expected.result`: `"pass"` (expects recipes) or `"fail"` (expects empty)
- `expected.recipeCount`: how many recipes should be extracted
- `expected.recipes[].field`: expected value, or `null` to skip scoring

### Fixture file naming

`{sourceType}-{slug}.json` — e.g., `article-hoffmann-v60.json`, `youtube-tetsu-4-6.json`, `text-basic-v60.json`, `fail-cookie-recipe.json`.

## Corpus Composition (20 cases minimum)

### Pasted text (5)
- [x] `text-basic-v60.json` — Clean V60 recipe with all fields
- [x] `text-multi-recipe.json` — Two recipes in one paste (V60 + AeroPress)
- [x] `text-minimal.json` — Dose + water + method only, no steps
- [x] `text-grinder-context.json` — Recipe with multiple grinder settings, test `grinderName` matching
- [x] `text-zero-duration-steps.json` — Steps with timing not stated (expect `duration: 0`)

### Article URLs (5)
- [x] `article-hoffmann-v60.json` — Well-known V60 recipe article
- [x] `article-chemex-recipe.json` — Chemex recipe from a coffee blog
- [x] `article-noisy-blog.json` — Long blog post with recipe buried in prose
- [x] `article-jsonld-recipe.json` — Page with structured JSON-LD recipe data
- [x] `article-stagg-recipe.json` — Fellow Stagg dripper recipe (tests method: "stagg" mapping)

### YouTube (5)
- [x] `youtube-transcript-v60.json` — Video with full transcript containing recipe
- [x] `youtube-description-only.json` — Recipe in description, no usable transcript text
- [x] `youtube-tetsu-4-6.json` — Tetsu Kasuya 4:6 method from transcript
- [x] `youtube-multi-recipe.json` — Comparison video with multiple recipes
- [x] `youtube-brief-mention.json` — Recipe mentioned briefly in a longer video

### Failure cases (5)
- [x] `fail-cookie-recipe.json` — Non-coffee recipe (should return empty)
- [x] `fail-gear-review.json` — "Best V60 Grinders 2026" — mentions coffee but no recipe
- [x] `fail-marketing-copy.json` — Product page with dose/water in marketing text
- [x] `fail-espresso.json` — Espresso recipe (not pour-over, should still extract per current rules)
- [x] `fail-prompt-injection.json` — Adversarial input attempting to override extraction instructions

## Script: `worker/scripts/eval-recipe-import.mjs`

### Usage

```bash
# Run all fixtures
ANTHROPIC_API_KEY=sk-... node worker/scripts/eval-recipe-import.mjs

# Filter by tag or glob
node worker/scripts/eval-recipe-import.mjs --filter=youtube-*
node worker/scripts/eval-recipe-import.mjs --tag=failure

# Override temperature (default: 0)
node worker/scripts/eval-recipe-import.mjs --temperature=0.5

# Multiple runs for stability testing
node worker/scripts/eval-recipe-import.mjs --runs=3
```

### Script behavior

1. Check `ANTHROPIC_API_KEY` env var — exit with clear error if missing
2. Load fixture JSON files from `worker/fixtures/recipe-import/*.json`
3. Apply `--filter` / `--tag` if provided
4. Print: "Running N fixtures against claude-haiku-4-5-20251001 (temperature: 0)"
5. For each fixture, call `extractRecipes(sourceText, sourceType, { apiKey, temperature })`
6. Score each fixture against expected output using the three-tier matching
7. Write timestamped results to `worker/eval-results/YYYY-MM-DDTHH-MM-SS.json`
8. Print console summary table with per-fixture and aggregate scores
9. Exit code 0 if composite score >= threshold (default 80%), exit code 1 otherwise

### Results file schema

```json
{
  "timestamp": "2026-03-12T14:30:00Z",
  "model": "claude-haiku-4-5-20251001",
  "temperature": 0,
  "fixtureCount": 20,
  "compositeScore": 0.87,
  "dimensions": {
    "extractionSuccess": 0.95,
    "coreParameters": 0.88,
    "stepsQuality": 0.82,
    "grindAndTemp": 0.85,
    "targetTime": 0.70,
    "metadata": 0.90,
    "abstentionCorrectness": 1.0
  },
  "fixtures": [
    {
      "id": "article-hoffmann-v60",
      "result": "pass",
      "expected": "pass",
      "score": 0.92,
      "details": { ... per-field comparison ... },
      "latencyMs": 1234
    }
  ]
}
```

## Implementation Tasks

### Phase 1: Foundation
- [x] Add `temperature` parameter to `extractRecipes()` signature (default undefined = API default) — `worker/src/extract/extractRecipes.js`
- [x] Create `worker/fixtures/recipe-import/` directory
- [x] Create `worker/scripts/eval-recipe-import.mjs` with CLI arg parsing, fixture loading, API key check
- [x] Implement scoring functions (exact, numeric tolerance, normalized contains, steps comparison) — `worker/scripts/scoring.mjs`
- [x] Add `worker/eval-results/` to `.gitignore`

### Phase 2: Fixtures (start with 5, expand to 20)
- [x] Create 1 text fixture, 1 article fixture, 1 YouTube fixture, 1 failure fixture, 1 edge case
- [x] Run end-to-end, tune scoring thresholds based on real outputs
- [x] Expand to full 20-fixture corpus
- [x] Document fixture creation process in `worker/fixtures/recipe-import/README.md`

### Phase 3: Polish
- [x] Add `--filter` and `--tag` flags
- [x] Add `--runs=N` flag for stability testing (reports min/max/median)
- [x] Add console summary table with color-coded pass/fail
- [x] Add `eval` script to `worker/package.json`

## Technical Considerations

- **Node.js compatibility**: Requires Node 18+ for native `fetch` and `AbortSignal.timeout`. The script imports `extractRecipes()` directly — no Cloudflare Workers runtime needed.
- **Cost**: ~$0.003 per fixture with Haiku 4.5. Full 20-fixture run ≈ $0.06. Rate limiting not a concern at this scale.
- **API key**: `ANTHROPIC_API_KEY` environment variable, same as the Anthropic SDK convention.
- **No new dependencies**: The eval script uses Node built-ins only (fs, path, URL). No test framework needed — this is a scoring script, not a test suite.

## Acceptance Criteria

- [ ] At least 20 fixtures covering text, article, YouTube, and failure cases
- [ ] `node worker/scripts/eval-recipe-import.mjs` runs all fixtures and prints a scored summary
- [ ] Results are written to a timestamped JSON file in `worker/eval-results/`
- [ ] Failure cases correctly produce empty results (abstention score = 100%)
- [ ] A prompt change that breaks extraction is detectable by a score drop
- [ ] Script exits non-zero when composite score drops below threshold

## Dependencies & Risks

- **LLM non-determinism**: Mitigated by `temperature: 0` and fuzzy matching, but edge cases may still flicker
- **Fixture staleness**: Expected outputs need updating when the prompt legitimately improves — add a `--update-baseline` flag in v2
- **Adapter coverage gap**: This harness tests extraction only. Adapter regressions (HTML parsing, transcript fetching) need separate tests

## References

- V2 plan Phase 2.4: `docs/plans/2026-03-12-feat-recipe-import-v2-plan.md:215-237`
- Extraction function: `worker/src/extract/extractRecipes.js:121`
- Signal filter: `worker/src/extract/extractRecipes.js:5` (`isMeaningfulExtractedRecipe`)
- Extraction schema: `worker/src/extract/extractRecipes.js:23` (`EXTRACTION_SCHEMA`)
- Related PR: #50 (worker modularization)
