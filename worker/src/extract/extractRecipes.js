// ============================================================
// RECIPE EXTRACTION — Claude API call + structured output
// ============================================================

import { isMeaningfulExtractedRecipe, EXTRACTION_SCHEMA, SYSTEM_PROMPT } from './recipeContract.js'

/**
 * Call Claude API to extract recipes from source text.
 *
 * @param {string} sourceText - Cleaned source text (max 12KB)
 * @param {string} sourceType - 'text' | 'article' | 'youtube'
 * @param {{ apiKey: string, grinderName?: string, temperature?: number }} options
 * @returns {Promise<{ recipes: Array }>} - Only meaningful recipes
 * @throws {Error} On timeout, API error, or missing tool_use result
 */
export async function extractRecipes(sourceText, sourceType, { apiKey, grinderName = '', temperature }) {
  let userContent = `<source_type>${sourceType}</source_type>\n<user_recipe_text>\n${sourceText}\n</user_recipe_text>`
  if (grinderName) {
    userContent += `\n\n<user_grinder>${grinderName}</user_grinder>`
  }

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      ...(temperature !== undefined && { temperature }),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      tools: [
        {
          name: 'extract_recipes',
          description: 'Extract structured recipe data from the provided text.',
          input_schema: EXTRACTION_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_recipes' },
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!claudeResponse.ok) {
    const errBody = await claudeResponse.text().catch(() => '')
    console.error('Claude API error:', claudeResponse.status, errBody)
    throw new Error('Extraction service error')
  }

  const claudeData = await claudeResponse.json()
  const toolUse = claudeData.content?.find(b => b.type === 'tool_use')
  if (!toolUse?.input) {
    throw new Error('No extraction result')
  }

  const result = toolUse.input
  const recipes = (result.recipes || []).filter(isMeaningfulExtractedRecipe)
  return { recipes }
}
