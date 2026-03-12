import { useState, useRef, useEffect, useCallback } from 'react'
import Modal from './Modal'
import StepEditor from './StepEditor'
import { saveRecipe } from '../data/storage'
import { BREW_METHODS, GRINDERS, FELLOW_ODE_POSITIONS, getMethodName, getGrinderName } from '../data/defaults'
import { getGrindSuggestion } from '../data/grindCalibration'
import { mapExtractionToRecipe, extractRecipes } from '../data/recipeImport'

// Phase state machine: paste → extracting → review
// Error states handled inline within phases.

export default function RecipeImportModal({ onClose, onImportComplete, equipment }) {
  const grinderId = equipment?.grinder
  const [phase, setPhase] = useState('paste')
  const [inputText, setInputText] = useState('')
  const [error, setError] = useState(null)
  const [reviewRecipe, setReviewRecipe] = useState(null)
  const [extractedConfidence, setExtractedConfidence] = useState(null)
  const controllerRef = useRef(null)
  const savingRef = useRef(false)
  const timeoutRef = useRef(null)

  // AbortController cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleImport = useCallback(async () => {
    const trimmed = inputText.trim()
    if (!trimmed) return

    // Clear stale state from previous attempts
    setError(null)
    setReviewRecipe(null)
    setExtractedConfidence(null)
    setPhase('extracting')

    // Create new AbortController for this request
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    // Client-side 35s timeout (exceeds worker's 30s to allow network transit)
    timeoutRef.current = setTimeout(() => {
      controller.abort()
    }, 35000)

    try {
      const grinderName = grinderId ? getGrinderName(grinderId) : ''
      const recipes = await extractRecipes(trimmed, { signal: controller.signal, grinderName })

      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      if (!recipes || recipes.length === 0) {
        setError('No recipe found in the pasted content. Try pasting the recipe text directly.')
        setPhase('paste')
        return
      }

      // Take first recipe (highest confidence or first in array)
      const best = recipes.reduce((a, b) => {
        const rank = { high: 3, medium: 2, low: 1 }
        return (rank[b.confidence] || 0) > (rank[a.confidence] || 0) ? b : a
      }, recipes[0])

      const mapped = mapExtractionToRecipe(best)

      // Pre-fill grinder from equipment if available
      if (equipment?.grinder) {
        mapped.grinder = equipment.grinder
      }
      if (equipment?.dripper) {
        mapped.dripper = equipment.dripper
      }
      if (equipment?.filterType) {
        mapped.filterType = equipment.filterType
      }

      setReviewRecipe(mapped)
      setExtractedConfidence(best.confidence)
      setPhase('review')
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (err.name === 'AbortError') {
        setError('Extraction timed out. Try pasting shorter text.')
      } else {
        setError(err.message || "Can't reach the recipe service. Check your connection.")
      }
      setPhase('paste')
    }
  }, [inputText, equipment, grinderId])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setInputText(text)
    } catch {
      // Clipboard read failed — user can paste manually
    }
  }, [])

  const handleSave = useCallback(() => {
    if (savingRef.current || !reviewRecipe) return
    savingRef.current = true

    try {
      const saved = saveRecipe({
        ...reviewRecipe,
        beanId: null, // template
      })
      if (saved) {
        onImportComplete(saved)
      }
    } finally {
      savingRef.current = false
    }
  }, [reviewRecipe, onImportComplete])

  const updateReviewField = (field, value) => {
    setReviewRecipe(prev => ({ ...prev, [field]: value }))
  }

  // --- PASTE PHASE ---
  if (phase === 'paste') {
    return (
      <Modal title="Import Recipe" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-brew-700">
            Paste a recipe from any source — blogs, ChatGPT, Fellow Drops, YouTube descriptions, Reddit.
          </p>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste a recipe or URL..."
            rows={5}
            maxLength={10240}
            className="w-full px-4 py-3 rounded-xl border border-brew-200 bg-parchment-100 text-base text-brew-800
                       placeholder:text-ceramic-400 focus:outline-none focus:ring-2 focus:ring-brew-400 resize-none"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700
                            animate-fade-in motion-reduce:animate-none">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePaste}
              className="px-4 py-3 border border-brew-200 text-brew-500 rounded-xl font-medium
                         hover:bg-brew-50 transition-all min-h-[44px]"
            >
              Paste from Clipboard
            </button>
            <button
              onClick={handleImport}
              disabled={!inputText.trim()}
              className="flex-1 py-3 bg-crema-500 text-white rounded-xl font-medium
                         hover:bg-crema-600 active:scale-[0.98] transition-all min-h-[44px]
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // --- EXTRACTING PHASE ---
  if (phase === 'extracting') {
    const isUrl = /^https?:\/\//i.test(inputText.trim())
    return (
      <Modal title="Import Recipe" onClose={onClose}>
        <div className="flex flex-col items-center py-12 space-y-4">
          <div className="w-8 h-8 border-2 border-crema-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-brew-700">
            {isUrl ? 'Fetching page and extracting recipe...' : 'Extracting recipe...'}
          </p>
        </div>
      </Modal>
    )
  }

  // --- REVIEW PHASE ---
  if (phase === 'review' && reviewRecipe) {
    const grinder = GRINDERS.find(g => g.id === reviewRecipe.grinder) || null
    const grindSuggestion = grinderId ? getGrindSuggestion(grinderId, reviewRecipe.qualitativeGrind) : null
    const methodMismatch = equipment?.brewMethod && reviewRecipe.method !== equipment.brewMethod

    return (
      <Modal title="Review Recipe" onClose={onClose}>
        <div className="space-y-4">
          {/* Confidence warning */}
          {extractedConfidence === 'low' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700
                            animate-fade-in motion-reduce:animate-none">
              Some fields may be inaccurate. Review carefully.
            </div>
          )}

          {/* Equipment mismatch */}
          {methodMismatch && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700
                            animate-fade-in motion-reduce:animate-none">
              This recipe is for {getMethodName(reviewRecipe.method)}. Your equipment is set up for {getMethodName(equipment.brewMethod)}.
            </div>
          )}

          {/* Recipe name */}
          <div>
            <label className="text-xs text-brew-400 uppercase tracking-wider">Recipe Name</label>
            <input
              type="text"
              value={reviewRecipe.name}
              onChange={e => updateReviewField('name', e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Method */}
          <div>
            <label className="text-xs text-brew-400 uppercase tracking-wider">Method</label>
            <select
              value={reviewRecipe.method}
              onChange={e => updateReviewField('method', e.target.value)}
              className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            >
              {BREW_METHODS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
              {/* If extracted method isn't in BREW_METHODS, show it anyway */}
              {!BREW_METHODS.find(m => m.id === reviewRecipe.method) && (
                <option value={reviewRecipe.method}>{reviewRecipe.method}</option>
              )}
            </select>
          </div>

          {/* Coffee / Water */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-brew-400 uppercase tracking-wider">Coffee (g)</label>
              <input
                type="number"
                value={reviewRecipe.coffeeGrams ?? ''}
                onChange={e => updateReviewField('coffeeGrams', Number(e.target.value))}
                min={1} max={100}
                className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            </div>
            <div>
              <label className="text-xs text-brew-400 uppercase tracking-wider">Water (g)</label>
              <input
                type="number"
                value={reviewRecipe.waterGrams ?? ''}
                onChange={e => updateReviewField('waterGrams', Number(e.target.value))}
                min={1} max={2000}
                className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            </div>
          </div>

          {/* Grind Setting + Translation */}
          <div>
            <label className="text-xs text-brew-400 uppercase tracking-wider">Grind Setting</label>
            {grinder?.settingType === 'ode' ? (
              <select
                value={reviewRecipe.grindSetting}
                onChange={e => updateReviewField('grindSetting', e.target.value)}
                className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              >
                <option value="">—</option>
                {FELLOW_ODE_POSITIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={reviewRecipe.grindSetting}
                onChange={e => updateReviewField('grindSetting', e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            )}
            {grindSuggestion && (
              <p className="text-xs text-brew-500 mt-1">
                Suggested range for your {getGrinderName(grinderId)}: {grindSuggestion}
              </p>
            )}
            {reviewRecipe.qualitativeGrind && (
              <p className="text-xs text-brew-400 mt-0.5">
                Recipe calls for: {reviewRecipe.qualitativeGrind}
              </p>
            )}
          </div>

          {/* Water Temp */}
          <div>
            <label className="text-xs text-brew-400 uppercase tracking-wider">Water Temp</label>
            <input
              type="text"
              value={reviewRecipe.waterTemp}
              onChange={e => updateReviewField('waterTemp', e.target.value)}
              maxLength={20}
              placeholder="e.g. 200F or 93C"
              className="w-full px-3 py-2 mt-1 rounded-xl border border-brew-200 text-base text-brew-800
                         placeholder:text-ceramic-400 focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Steps */}
          {reviewRecipe.steps?.length > 0 && (
            <div>
              <label className="text-xs text-brew-400 uppercase tracking-wider mb-2 block">Steps</label>
              <StepEditor
                steps={reviewRecipe.steps}
                onChange={steps => updateReviewField('steps', steps)}
                cascadeTime
              />
            </div>
          )}

          {/* Source attribution */}
          {reviewRecipe.sourceName && (
            <p className="text-xs text-brew-400">
              Source: {reviewRecipe.sourceName}
            </p>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-crema-500 text-white rounded-xl font-medium
                       hover:bg-crema-600 active:scale-[0.98] transition-all min-h-[44px]
                       shadow-md shadow-crema-500/20"
          >
            Save as Template
          </button>
        </div>
      </Modal>
    )
  }

  return null
}
