// ============================================================
// EVAL SCORING — compare extracted recipes against expectations
// ============================================================

// --- Field matchers ---

function exactMatch(actual, expected) {
  if (expected === null || expected === undefined) return null // skip
  return actual === expected ? 1 : 0
}

function numericTolerance(actual, expected, tolerancePercent = 0.05, toleranceAbs = 0) {
  if (expected === null || expected === undefined) return null
  if (typeof actual !== 'number' || typeof expected !== 'number') return 0
  const maxDelta = Math.max(Math.abs(expected * tolerancePercent), toleranceAbs)
  return Math.abs(actual - expected) <= maxDelta ? 1 : 0
}

function normalizedContains(actual, expected) {
  if (expected === null || expected === undefined) return null
  if (typeof actual !== 'string' || typeof expected !== 'string') return 0
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()
  return norm(actual).includes(norm(expected)) ? 1 : 0
}

// --- Step comparison ---

function scoreStep(actual, expected) {
  const scores = []
  if (expected.name !== null && expected.name !== undefined) {
    scores.push(normalizedContains(actual?.name || '', expected.name))
  }
  if (expected.waterTo !== undefined) {
    if (expected.waterTo === null) {
      scores.push(actual?.waterTo == null ? 1 : 0)
    } else {
      scores.push(numericTolerance(actual?.waterTo, expected.waterTo, 0, 5))
    }
  }
  if (expected.duration !== null && expected.duration !== undefined) {
    scores.push(numericTolerance(actual?.duration, expected.duration, 0, 5))
  }
  const valid = scores.filter(s => s !== null)
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

function scoreSteps(actualSteps, expectedSteps) {
  if (!expectedSteps || expectedSteps.length === 0) return null
  const actual = actualSteps || []
  let totalScore = 0
  let count = 0

  for (let i = 0; i < expectedSteps.length; i++) {
    const stepScore = scoreStep(actual[i], expectedSteps[i])
    if (stepScore !== null) {
      totalScore += stepScore
      count++
    }
  }

  // Penalize extra or missing steps
  const countDiff = Math.abs(actual.length - expectedSteps.length)
  const countPenalty = countDiff > 0 ? Math.min(countDiff * 0.1, 0.3) : 0

  if (count === 0) return null
  return Math.max(0, totalScore / count - countPenalty)
}

// --- Per-recipe scoring ---

function scoreRecipe(actual, expected) {
  const dimensions = {
    coreParameters: [],
    stepsQuality: [],
    grindAndTemp: [],
    targetTime: [],
    metadata: [],
  }

  // Core parameters (25%)
  dimensions.coreParameters.push(exactMatch(actual?.method, expected.method))
  dimensions.coreParameters.push(numericTolerance(actual?.coffeeGrams, expected.coffeeGrams, 0.05, 0.5))
  dimensions.coreParameters.push(numericTolerance(actual?.waterGrams, expected.waterGrams, 0.05, 5))

  // Steps quality (20%)
  const stepsScore = scoreSteps(actual?.steps, expected.steps)
  if (stepsScore !== null) dimensions.stepsQuality.push(stepsScore)

  // Grind & temp (10%)
  dimensions.grindAndTemp.push(normalizedContains(actual?.grindDescription, expected.grindDescription))
  dimensions.grindAndTemp.push(exactMatch(actual?.grindTier, expected.grindTier))
  dimensions.grindAndTemp.push(normalizedContains(actual?.waterTemp, expected.waterTemp))

  // Target time (5%)
  dimensions.targetTime.push(normalizedContains(actual?.targetTime, expected.targetTime))

  // Metadata (5%)
  dimensions.metadata.push(normalizedContains(actual?.name, expected.name))
  dimensions.metadata.push(normalizedContains(actual?.sourceName, expected.sourceName))
  dimensions.metadata.push(exactMatch(actual?.confidence, expected.confidence))

  // Average each dimension, skipping nulls
  const result = {}
  for (const [key, scores] of Object.entries(dimensions)) {
    const valid = scores.filter(s => s !== null)
    result[key] = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }
  return result
}

// --- Per-fixture scoring ---

export function scoreFixture(actual, fixture) {
  const expected = fixture.expected
  const isFailureCase = expected.result === 'fail'
  const actualRecipes = actual?.recipes || []

  // Extraction success (30%)
  let extractionSuccess
  if (isFailureCase) {
    extractionSuccess = actualRecipes.length === 0 ? 1 : 0
  } else {
    extractionSuccess = actualRecipes.length > 0 ? 1 : 0
  }

  // Abstention correctness (5%)
  let abstentionCorrectness = null
  if (isFailureCase) {
    abstentionCorrectness = actualRecipes.length === 0 ? 1 : 0
  }

  // If failure case or no recipes expected, skip recipe-level scoring
  if (isFailureCase || !expected.recipes || expected.recipes.length === 0) {
    return {
      score: extractionSuccess,
      dimensions: {
        extractionSuccess,
        coreParameters: null,
        stepsQuality: null,
        grindAndTemp: null,
        targetTime: null,
        metadata: null,
        abstentionCorrectness,
      },
    }
  }

  // Best-fit recipe matching: for each expected recipe, find the actual recipe
  // that scores highest, to avoid order-sensitivity in multi-recipe fixtures
  const recipeDimensions = {
    coreParameters: [],
    stepsQuality: [],
    grindAndTemp: [],
    targetTime: [],
    metadata: [],
  }

  const usedActualIndices = new Set()
  for (const expectedRecipe of expected.recipes) {
    let bestIndex = -1
    let bestScore = -1
    for (let j = 0; j < actualRecipes.length; j++) {
      if (usedActualIndices.has(j)) continue
      const candidate = scoreRecipe(actualRecipes[j], expectedRecipe)
      const avg = Object.values(candidate).filter(v => v !== null)
      const score = avg.length > 0 ? avg.reduce((a, b) => a + b, 0) / avg.length : 0
      if (score > bestScore) {
        bestScore = score
        bestIndex = j
      }
    }
    const matched = bestIndex >= 0 ? actualRecipes[bestIndex] : undefined
    if (bestIndex >= 0) usedActualIndices.add(bestIndex)
    const recipeScores = scoreRecipe(matched, expectedRecipe)
    for (const [key, value] of Object.entries(recipeScores)) {
      if (value !== null) recipeDimensions[key].push(value)
    }
  }

  // Average across recipes
  const dimensions = { extractionSuccess, abstentionCorrectness }
  for (const [key, scores] of Object.entries(recipeDimensions)) {
    dimensions[key] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  }

  // Weighted composite
  const weights = {
    extractionSuccess: 0.30,
    coreParameters: 0.25,
    stepsQuality: 0.20,
    grindAndTemp: 0.10,
    targetTime: 0.05,
    metadata: 0.05,
    abstentionCorrectness: 0.05,
  }

  let weightedSum = 0
  let weightSum = 0
  for (const [key, weight] of Object.entries(weights)) {
    const val = dimensions[key]
    if (val !== null && val !== undefined) {
      weightedSum += val * weight
      weightSum += weight
    }
  }
  const score = weightSum > 0 ? weightedSum / weightSum : 0

  return { score, dimensions }
}

// --- Aggregate scoring ---

export function aggregateResults(fixtureResults) {
  const dimensionTotals = {}
  const dimensionCounts = {}

  let totalScore = 0
  for (const result of fixtureResults) {
    totalScore += result.score
    for (const [key, value] of Object.entries(result.dimensions)) {
      if (value !== null && value !== undefined) {
        dimensionTotals[key] = (dimensionTotals[key] || 0) + value
        dimensionCounts[key] = (dimensionCounts[key] || 0) + 1
      }
    }
  }

  const dimensions = {}
  for (const key of Object.keys(dimensionTotals)) {
    dimensions[key] = dimensionTotals[key] / dimensionCounts[key]
  }

  return {
    compositeScore: fixtureResults.length > 0 ? totalScore / fixtureResults.length : 0,
    dimensions,
  }
}
