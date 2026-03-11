// ============================================================
// RECIPE IMPORT — Maps LLM extraction output to recipe entities
// ============================================================
// Pure mapping function: extraction JSON → recipe entity fields.
// Keeps extraction logic separate from UI and storage.

import { getMethodName } from './defaults'
import { formatTime } from './storage'

// Normalize a target time value from LLM output to MM:SS string.
// Handles: "3:30", "3:00-3:30", 210 (seconds), "210", null/undefined
function normalizeTargetTime(raw) {
  if (!raw && raw !== 0) return ''
  // Already a MM:SS string or range
  if (typeof raw === 'string' && raw.includes(':')) return raw
  // Numeric seconds — convert to MM:SS
  const seconds = typeof raw === 'string' ? parseInt(raw, 10) : raw
  if (typeof seconds === 'number' && !isNaN(seconds) && seconds > 0) {
    return formatTime(seconds)
  }
  return typeof raw === 'string' ? raw : ''
}

// Map a single extracted recipe (from LLM output) to recipe entity fields.
// Does NOT set id, beanId, createdAt, etc. — caller handles those.
export function mapExtractionToRecipe(extracted) {
  const steps = (extracted.steps || []).map((step, i) => ({
    id: i + 1,
    name: step.name || `Step ${i + 1}`,
    waterTo: step.waterTo ?? null,
    time: step.time ?? 0,
    duration: step.duration ?? 0,
    note: step.note || '',
  }))

  // Calculate step start times: each step starts when the previous ends
  for (let i = 1; i < steps.length; i++) {
    steps[i].time = steps[i - 1].time + steps[i - 1].duration
  }

  return {
    name: extracted.name || `Imported ${getMethodName(extracted.method || 'v60')}`,
    method: extracted.method || 'v60',
    coffeeGrams: extracted.coffeeGrams ?? 15,
    waterGrams: extracted.waterGrams ?? 250,
    grindSetting: extracted.grindDescription || '',
    waterTemp: extracted.waterTemp || '',
    targetTime: normalizeTargetTime(extracted.targetTime),
    targetTimeRange: '',
    targetTimeMin: null,
    targetTimeMax: null,
    steps,
    pourTemplateId: null,
    grinder: '',
    dripper: '',
    filterType: '',
    // Import metadata (NOT in RECIPE_FIELDS — these are entity-level, not form-level)
    source: 'imported',
    sourceName: extracted.sourceName || '',
    qualitativeGrind: extracted.grindTier || '',
    importedAt: new Date().toISOString(),
  }
}

// Worker API URL — configured via Vite env variables
export const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''
export const WORKER_TOKEN = import.meta.env.VITE_WORKER_TOKEN || ''

// Call the extraction worker
export async function extractRecipes(text, { signal } = {}) {
  if (!WORKER_URL) {
    throw new Error('Recipe import service not configured')
  }

  const isUrl = /^https?:\/\//i.test(text.trim())
  const body = isUrl ? { url: text.trim() } : { text: text.trim() }

  const response = await fetch(`${WORKER_URL}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(WORKER_TOKEN ? { 'Authorization': `Bearer ${WORKER_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorMessages = {
      401: 'Authentication failed with recipe service.',
      422: 'No recipe found in the pasted content. Try pasting the recipe text directly.',
      429: 'Too many imports. Try again in a minute.',
      502: 'Recipe extraction failed. Try pasting the text directly.',
      504: 'Extraction timed out. Try pasting shorter text.',
    }
    throw new Error(errorMessages[response.status] || `Recipe extraction failed (${response.status})`)
  }

  const data = await response.json()
  return data.recipes || []
}
