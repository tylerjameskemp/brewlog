# Recipe Import Evaluation Fixtures

Test corpus for measuring LLM extraction quality. Each fixture contains post-adapter `sourceText` (not raw HTML) and expected extraction output.

## Running

```bash
ANTHROPIC_API_KEY=sk-... npm run eval --prefix worker

# Filter by glob or tag
npm run eval --prefix worker -- --filter=youtube-*
npm run eval --prefix worker -- --tag=failure

# Multiple runs for stability
npm run eval --prefix worker -- --runs=3
```

## Fixture Schema

```json
{
  "id": "unique-slug",
  "description": "Human-readable purpose",
  "sourceType": "text | article | youtube",
  "tags": ["category", "trait"],
  "grinderName": "",
  "sourceText": "Post-adapter cleaned text",
  "expected": {
    "result": "pass | fail",
    "recipeCount": 1,
    "recipes": [{ "method": "v60", "coffeeGrams": 15, ... }]
  }
}
```

Set expected fields to `null` to skip scoring that field.

## Naming Convention

`{sourceType}-{slug}.json` — e.g., `article-hoffmann-v60.json`, `fail-cookie-recipe.json`.

## Corpus (20 fixtures)

| Category | Count | Tags |
|----------|-------|------|
| Pasted text | 5 | `text` |
| Article | 5 | `article` |
| YouTube | 5 | `youtube` |
| Failure cases | 5 | `failure` |

## Adding a Fixture

1. Create a JSON file following the schema above
2. Use post-adapter text (what `extractRecipes()` receives), not raw HTML
3. Set `expected.result` to `"pass"` for recipes or `"fail"` for abstention cases
4. Run the eval to verify: `npm run eval --prefix worker -- --filter=your-fixture-id`
5. Review scoring output and adjust expected values if needed
