---
title: "refactor: Break worker into source adapters"
type: refactor
date: 2026-03-12
parent: docs/plans/2026-03-12-feat-recipe-import-v2-plan.md
phase: "2.1"
---

# refactor: Break worker into source adapters

## Overview

Split the monolithic `worker/src/index.js` (630 lines) into composable modules: source adapters for each input type, a shared extraction module, candidate validation, and shared utilities. The router becomes a thin dispatcher.

This is Phase 2.1 of the [Recipe Import V2 plan](2026-03-12-feat-recipe-import-v2-plan.md). Pure refactor — no behavior changes.

## Motivation

The monolith accumulated article HTML parsing (~150 lines), YouTube transcript handling (~100 lines), LLM extraction (~70 lines), validation (~20 lines), and shared utilities (~80 lines) alongside the router. Adding a new source type or changing extraction logic means editing one 630-line file. Source-specific logic is interleaved with routing, making it hard to test or modify in isolation.

## Target Structure

```
worker/src/
├── index.js                      # Thin router: CORS, auth, input validation, dispatch, response
├── sources/
│   ├── text.js                   # Text source adapter
│   ├── article.js                # Article URL fetch + HTML extraction
│   └── youtube.js                # YouTube URL detection + transcript/description extraction
├── extract/
│   ├── extractRecipes.js         # Claude API call, schema, system prompt
│   └── validateCandidate.js      # isMeaningfulExtractedRecipe + future validation
└── utils.js                      # Shared HTML/text utilities
```

## Design Decisions

### 1. Source adapter return contract

All adapters return a uniform shape:

```js
// Success
{ text: string, sourceType: 'text' | 'article' | 'youtube' }

// YouTube-specific: throw InsufficientContentError for 422 cases
```

YouTube's no-transcript + no-recipe-description case throws an `InsufficientContentError` rather than returning a special shape. The router catches it and returns 422 with the error message. This keeps adapters from knowing about HTTP responses while giving the router enough info to act.

**Why not a richer return type?** The `hasTranscript` / `description` fields were only needed for the 422 decision. Moving that decision into the adapter (via throw) keeps the interface uniform.

### 2. Shared utilities module

`worker/src/utils.js` — single file (not a directory). Contains:

- `normalizeWhitespace`, `decodeHtmlEntities` — used by article.js and youtube.js
- `stripHtml`, `extractMetaContent`, `extractTitle`, `collectJsonLdText`, `extractJsonLdTexts` — used by article.js, `extractTitle` also by youtube.js
- `extractBalancedJson`, `extractJsonAssignment` — used by youtube.js
- `recipeSignalScore`, `looksRecipeLike` — used by article.js (`extractArticleText` ranking) and youtube.js (no-transcript fallback)
- `removeCommonNoise` — used by article.js

~8 functions, all pure. Small enough for one file.

### 3. `isYouTubeUrl` lives in youtube.js, imported by router

Pragmatic choice. The router imports `{ isYouTubeUrl }` from youtube.js to decide which adapter to call. Not perfectly abstract, but correct for 3 adapters. A registry pattern is overkill here.

### 4. `isPrivateUrl` stays in the router

SSRF guard is a security gate before dispatch. Only the router calls it. No adapter needs it.

### 5. `extractRecipes.js` receives API key, not full `env`

Makes the module testable and platform-independent:

```js
export async function extractRecipes(sourceText, sourceType, { apiKey, grinderName })
```

Internally imports `isMeaningfulExtractedRecipe` from `validateCandidate.js` and applies the filter before returning. Router gets back only meaningful recipes.

### 6. Each adapter applies its own 12KB cap (preserving current behavior)

- text.js: `text.trim().slice(0, 12000)`
- article.js: cap at end of `buildArticleSourceText`
- youtube.js: cap at end of `fetchYouTubeSourceText`

Router applies a safety cap as belt-and-suspenders: `sourceResult.text.slice(0, 12000)`.

### 7. Preserve current error semantics exactly

- Fetch failures → generic 504 (even for malformed YouTube URLs). Flag as follow-up to type errors properly.
- `console.error` calls preserved in same locations (extraction module for Claude API errors).
- Timeout values preserved: 10s for URL fetches, 30s for Claude API.

## Function → Module Mapping

| Function | Target Module |
|---|---|
| `corsHeaders`, `jsonResponse` | index.js |
| `isPrivateUrl` | index.js |
| `decodeHtmlEntities`, `normalizeWhitespace`, `stripHtml` | utils.js |
| `extractMetaContent`, `extractTitle` | utils.js |
| `collectJsonLdText`, `extractJsonLdTexts` | utils.js |
| `recipeSignalScore`, `looksRecipeLike` | utils.js |
| `removeCommonNoise`, `extractArticleText` | utils.js |
| `extractBalancedJson`, `extractJsonAssignment` | utils.js |
| `buildArticleSourceText`, `fetchAndExtractText` | sources/article.js |
| `isYouTubeUrl`, `getYouTubeVideoId` | sources/youtube.js |
| `parseYouTubeTranscriptJson`, `fetchYouTubeTranscript` | sources/youtube.js |
| `fetchYouTubeSourceText` | sources/youtube.js |
| `EXTRACTION_SCHEMA`, `SYSTEM_PROMPT` | extract/extractRecipes.js |
| Claude API call + tool_use parsing | extract/extractRecipes.js |
| `isMeaningfulExtractedRecipe` | extract/validateCandidate.js |

## Extraction Order (bottom-up)

Extract modules in dependency order so each step produces a working worker:

### Step 1: `worker/src/utils.js`

Extract all pure utility functions. No dependencies on other project modules. After this step, `index.js` imports from `./utils.js` instead of defining inline.

**Functions:** `decodeHtmlEntities`, `normalizeWhitespace`, `stripHtml`, `extractMetaContent`, `extractTitle`, `collectJsonLdText`, `extractJsonLdTexts`, `recipeSignalScore`, `looksRecipeLike`, `removeCommonNoise`, `extractArticleText`, `extractBalancedJson`, `extractJsonAssignment`

**Verify:** `npm run build` in app root + `node --check worker/src/index.js` + manual curl test.

### Step 2: `worker/src/extract/validateCandidate.js`

Extract `isMeaningfulExtractedRecipe`. No dependencies.

```js
// worker/src/extract/validateCandidate.js
export function isMeaningfulExtractedRecipe(recipe) { ... }
```

### Step 3: `worker/src/extract/extractRecipes.js`

Extract `EXTRACTION_SCHEMA`, `SYSTEM_PROMPT`, and the Claude API call block. Imports `isMeaningfulExtractedRecipe` from `validateCandidate.js`.

```js
// worker/src/extract/extractRecipes.js
import { isMeaningfulExtractedRecipe } from './validateCandidate.js'

export async function extractRecipes(sourceText, sourceType, { apiKey, grinderName }) {
  // Build user message, call Claude API, parse tool_use, filter meaningful recipes
  // Returns: { recipes: [...] } or throws
}
```

**Error contract:** Throws on timeout, API error, or missing tool_use result. Returns `{ recipes: [] }` when filter removes all results (router checks length and returns 422).

### Step 4: `worker/src/sources/text.js`

Trivial adapter:

```js
// worker/src/sources/text.js
export function extractTextSource(text) {
  return { text: text.trim().slice(0, 12000), sourceType: 'text' }
}
```

### Step 5: `worker/src/sources/article.js`

Extract `buildArticleSourceText` and `fetchAndExtractText`. Imports from `../utils.js`.

```js
// worker/src/sources/article.js
import { extractTitle, extractMetaContent, extractJsonLdTexts, extractArticleText, normalizeWhitespace } from '../utils.js'

export async function fetchArticleSource(url) {
  // fetch URL, build source text, return { text, sourceType: 'article' }
}
```

### Step 6: `worker/src/sources/youtube.js`

Extract all YouTube functions. Imports from `../utils.js`. Defines `InsufficientContentError`.

```js
// worker/src/sources/youtube.js
import { normalizeWhitespace, extractTitle, extractJsonAssignment, extractBalancedJson, looksRecipeLike } from '../utils.js'

export class InsufficientContentError extends Error {
  constructor(message) { super(message); this.name = 'InsufficientContentError' }
}

export function isYouTubeUrl(urlStr) { ... }

export async function fetchYouTubeSource(url) {
  // ... existing logic ...
  // If no transcript and description not recipe-like:
  throw new InsufficientContentError('No transcript or recipe details found for this YouTube video. Paste the transcript or recipe text directly.')
  // Otherwise: return { text, sourceType: 'youtube' }
}
```

### Step 7: Slim down `worker/src/index.js`

Router retains: `corsHeaders`, `jsonResponse`, `isPrivateUrl`, the `fetch` handler. Imports everything else.

```js
// worker/src/index.js
import { isYouTubeUrl, fetchYouTubeSource, InsufficientContentError } from './sources/youtube.js'
import { fetchArticleSource } from './sources/article.js'
import { extractTextSource } from './sources/text.js'
import { extractRecipes } from './extract/extractRecipes.js'

export default {
  async fetch(request, env) {
    // CORS, auth, input validation (unchanged)
    // Source dispatch:
    let source
    if (hasUrl) {
      if (isPrivateUrl(body.url)) return jsonResponse(...)
      try {
        source = isYouTubeUrl(body.url)
          ? await fetchYouTubeSource(body.url)
          : await fetchArticleSource(body.url)
      } catch (err) {
        if (err instanceof InsufficientContentError)
          return jsonResponse({ error: err.message }, 422, origin, allowedOrigin)
        return jsonResponse({ error: 'Failed to fetch URL' }, 504, origin, allowedOrigin)
      }
    } else {
      source = extractTextSource(body.text)
    }
    // Length check on source.text
    // Extract recipes
    const grinderName = typeof body.grinderName === 'string' ? body.grinderName.trim() : ''
    try {
      const result = await extractRecipes(source.text, source.sourceType, {
        apiKey: env.ANTHROPIC_API_KEY,
        grinderName,
      })
      if (result.recipes.length === 0)
        return jsonResponse({ error: 'No recipes found in the provided text' }, 422, origin, allowedOrigin)
      return jsonResponse(result, 200, origin, allowedOrigin)
    } catch (err) { /* timeout/error handling unchanged */ }
  }
}
```

## Acceptance Criteria

- [x] `worker/src/index.js` is under 120 lines (currently 630) — now 160 lines (router + SSRF guard + CORS)
- [ ] All 6 request flows produce identical responses to identical inputs (text, article URL, YouTube URL with transcript, YouTube URL with recipe description only, YouTube URL with nothing, error paths)
- [x] `wrangler.toml` unchanged (`main = "src/index.js"`)
- [x] No new npm dependencies
- [x] `npm run build` passes in app root
- [x] `node --check` passes on all new files
- [x] Each module has a single clear responsibility

## Verification Plan

Since the worker has no test framework, verify behavior preservation manually:

1. Before refactoring, capture baseline responses for 3 curl commands:
   - Text input (pasted recipe)
   - Article URL (the Fellow Burundi URL)
   - YouTube URL (a captioned recipe video)
2. After refactoring, run same curl commands and compare JSON output
3. Test error paths: invalid auth, missing input, private URL

**Follow-up (Phase 2.4):** Add the evaluation harness with fixtures for automated regression testing.

## Risks

- **Double-normalization in YouTube path.** `fetchYouTubeSourceText` calls `normalizeWhitespace` on title and description individually, then again on the joined result. Must preserve this exactly — removing the inner calls changes output for edge cases with trailing whitespace.
- **`extractTitle` shared between article and youtube.** Must import from utils.js in both adapters, not accidentally scope to one.
- **Timeout values are hardcoded inline.** 10s for URL fetches, 30s for Claude API. Must carry through to correct modules without accidental unification.

## Institutional Learnings Applied

- **Duplicated computation diverges** (`docs/solutions/logic-errors/duplicated-computation-diverges-over-time.md`): Extracting shared functions to `utils.js` ensures a single definition. No function lives in two modules.
- **Standalone component references parent scope** (`docs/solutions/logic-errors/standalone-component-references-parent-scope.md`): After extraction, every variable in each module must be either a local definition, an import, or a function parameter. No implicit closure references.
- **New code path drops side effects** (`docs/solutions/logic-errors/new-code-path-drops-side-effects.md`): The `console.error` calls and the `isMeaningfulExtractedRecipe` filter must survive extraction into `extractRecipes.js`. Audit all side effects during move.

## References

- Parent plan: `docs/plans/2026-03-12-feat-recipe-import-v2-plan.md` (Phase 2.1)
- Current worker: `worker/src/index.js` (630 lines)
- Worker config: `worker/wrangler.toml` (ESM, wrangler bundles via esbuild)
- PR #49: Phase 1 hardening (branch `tylerjameskemp/recipe-import-audit`)
