#!/usr/bin/env node
// ============================================================
// RECIPE IMPORT EVAL HARNESS — run fixtures against extraction
// ============================================================
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... node worker/scripts/eval-recipe-import.mjs
//   node worker/scripts/eval-recipe-import.mjs --filter=youtube-*
//   node worker/scripts/eval-recipe-import.mjs --tag=failure
//   node worker/scripts/eval-recipe-import.mjs --temperature=0.5
//   node worker/scripts/eval-recipe-import.mjs --runs=3
//   node worker/scripts/eval-recipe-import.mjs --threshold=90

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreFixture, aggregateResults } from './scoring.mjs'
import { isMeaningfulExtractedRecipe, EXTRACTION_SCHEMA, SYSTEM_PROMPT } from '../src/extract/recipeContract.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'recipe-import')
const RESULTS_DIR = join(__dirname, '..', 'eval-results')

// --- CLI args ---

function parseArgs(argv) {
  const args = { filter: null, tag: null, temperature: 0, runs: 1, threshold: 80 }
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--filter=')) args.filter = arg.slice(9)
    else if (arg.startsWith('--tag=')) args.tag = arg.slice(6)
    else if (arg.startsWith('--temperature=')) args.temperature = parseFloat(arg.slice(14))
    else if (arg.startsWith('--runs=')) args.runs = parseInt(arg.slice(7), 10)
    else if (arg.startsWith('--threshold=')) args.threshold = parseInt(arg.slice(12), 10)
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node eval-recipe-import.mjs [options]

Options:
  --filter=<glob>      Filter fixtures by filename glob (e.g., youtube-*)
  --tag=<tag>          Filter fixtures by tag
  --temperature=<n>    Override temperature (default: 0)
  --runs=<n>           Run each fixture N times (default: 1)
  --threshold=<n>      Minimum composite score % to pass (default: 80)
  --help               Show this help

Environment:
  ANTHROPIC_API_KEY    Required. Your Anthropic API key.`)
      process.exit(0)
    }
  }
  return args
}

// --- Fixture loading ---

function loadFixtures(filter, tag) {
  let files
  try {
    files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json')).sort()
  } catch {
    console.error(`No fixtures directory found at ${FIXTURES_DIR}`)
    process.exit(1)
  }

  if (filter) {
    const re = new RegExp('^' + filter.replace(/\*/g, '.*') + '$')
    files = files.filter(f => re.test(basename(f, '.json')))
  }

  const fixtures = files.map(f => {
    const data = JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf8'))
    data._filename = f
    return data
  })

  if (tag) {
    return fixtures.filter(f => f.tags && f.tags.includes(tag))
  }
  return fixtures
}

// --- Extraction ---

async function callExtraction(sourceText, sourceType, { apiKey, grinderName = '', temperature }) {
  let userContent = `<source_type>${sourceType}</source_type>\n<user_recipe_text>\n${sourceText}\n</user_recipe_text>`
  if (grinderName) {
    userContent += `\n\n<user_grinder>${grinderName}</user_grinder>`
  }

  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    ...(temperature !== undefined && { temperature }),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    tools: [{
      name: 'extract_recipes',
      description: 'Extract structured recipe data from the provided text.',
      input_schema: EXTRACTION_SCHEMA,
    }],
    tool_choice: { type: 'tool', name: 'extract_recipes' },
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(`API error ${response.status}: ${errBody.slice(0, 200)}`)
  }

  const data = await response.json()
  const toolUse = data.content?.find(b => b.type === 'tool_use')
  if (!toolUse?.input) {
    console.warn('  [warn] API response missing tool_use block — treating as empty extraction')
    return { recipes: [] }
  }

  const recipes = (toolUse.input.recipes || []).filter(isMeaningfulExtractedRecipe)
  return { recipes }
}

// --- Console output ---

function printSummaryTable(results, aggregate) {
  const maxId = Math.max(4, ...results.map(r => r.id.length))
  const header = 'ID'.padEnd(maxId) + '  Result   Expected  Score   Latency'
  console.log('\n' + '='.repeat(header.length))
  console.log(header)
  console.log('-'.repeat(header.length))

  for (const r of results) {
    const result = r.actualResult === r.expectedResult ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
    const score = (r.score * 100).toFixed(0).padStart(3) + '%'
    const latency = r.latencyMs ? `${r.latencyMs}ms` : 'N/A'
    console.log(
      `${r.id.padEnd(maxId)}  ${result}     ${r.expectedResult.padEnd(8)}  ${score}   ${latency}`
    )
  }

  console.log('-'.repeat(header.length))
  console.log(`Composite: ${(aggregate.compositeScore * 100).toFixed(1)}%`)
  console.log('\nDimension breakdown:')
  for (const [key, value] of Object.entries(aggregate.dimensions)) {
    if (value !== null && value !== undefined) {
      console.log(`  ${key}: ${(value * 100).toFixed(1)}%`)
    }
  }
  console.log('='.repeat(header.length))
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.')
    console.error('Usage: ANTHROPIC_API_KEY=sk-... node worker/scripts/eval-recipe-import.mjs')
    process.exit(1)
  }

  const fixtures = loadFixtures(args.filter, args.tag)
  if (fixtures.length === 0) {
    console.error('No fixtures found matching the filter criteria.')
    process.exit(1)
  }

  const model = 'claude-haiku-4-5-20251001'
  console.log(`Running ${fixtures.length} fixtures against ${model} (temperature: ${args.temperature})`)
  if (args.runs > 1) console.log(`Runs per fixture: ${args.runs}`)
  console.log()

  const fixtureResults = []

  for (const fixture of fixtures) {
    process.stdout.write(`  ${fixture.id}... `)
    const runScores = []

    for (let run = 0; run < args.runs; run++) {
      const start = Date.now()
      let actual
      let error = null
      try {
        actual = await callExtraction(fixture.sourceText, fixture.sourceType, {
          apiKey,
          grinderName: fixture.grinderName || '',
          temperature: args.temperature,
        })
      } catch (err) {
        error = err.message
        actual = { recipes: [] }
      }
      const latencyMs = Date.now() - start

      const scored = scoreFixture(actual, fixture)
      const expectedResult = fixture.expected.result || 'pass'
      const actualResult = actual.recipes.length > 0 ? 'pass' : 'fail'

      runScores.push({
        id: fixture.id,
        expectedResult,
        actualResult,
        score: scored.score,
        dimensions: scored.dimensions,
        latencyMs,
        recipeCount: actual.recipes.length,
        error,
        actual: actual.recipes,
      })
    }

    // Use median run for multi-run
    runScores.sort((a, b) => a.score - b.score)
    const median = runScores[Math.floor(runScores.length / 2)]
    fixtureResults.push(median)

    const icon = median.actualResult === median.expectedResult ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
    const pct = (median.score * 100).toFixed(0)
    console.log(`${icon} ${pct}% (${median.latencyMs}ms)`)
  }

  const aggregate = aggregateResults(fixtureResults)
  printSummaryTable(fixtureResults, aggregate)

  // Write results
  mkdirSync(RESULTS_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const resultsPath = join(RESULTS_DIR, `${timestamp}.json`)
  const resultsData = {
    timestamp: new Date().toISOString(),
    model,
    temperature: args.temperature,
    fixtureCount: fixtureResults.length,
    compositeScore: aggregate.compositeScore,
    dimensions: aggregate.dimensions,
    fixtures: fixtureResults,
  }
  writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2))
  console.log(`\nResults written to ${resultsPath}`)

  // Exit code based on threshold
  const passPct = aggregate.compositeScore * 100
  if (passPct < args.threshold) {
    console.error(`\n\x1b[31mFAILED: Composite score ${passPct.toFixed(1)}% is below threshold ${args.threshold}%\x1b[0m`)
    process.exit(1)
  } else {
    console.log(`\n\x1b[32mPASSED: Composite score ${passPct.toFixed(1)}% meets threshold ${args.threshold}%\x1b[0m`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
