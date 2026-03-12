// ============================================================
// CANDIDATE VALIDATION — filter out low-signal extractions
// ============================================================

export function isMeaningfulExtractedRecipe(recipe) {
  let signals = 0
  if (typeof recipe.method === 'string' && recipe.method.trim()) signals++
  if (typeof recipe.coffeeGrams === 'number' && recipe.coffeeGrams > 0) signals++
  if (typeof recipe.waterGrams === 'number' && recipe.waterGrams > 0) signals++
  if (typeof recipe.waterTemp === 'string' && recipe.waterTemp.trim()) signals++
  if (typeof recipe.grindDescription === 'string' && recipe.grindDescription.trim()) signals++
  if (typeof recipe.targetTime === 'string' && recipe.targetTime.trim()) signals++
  if (Array.isArray(recipe.steps) && recipe.steps.some(step => (
    (typeof step.name === 'string' && step.name.trim()) ||
    step.waterTo != null ||
    (typeof step.note === 'string' && step.note.trim())
  ))) {
    signals += 2
  }
  return signals >= 3
}
