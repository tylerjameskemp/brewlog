import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  getBrews, getChangesForBean, getChangesForRecipe,
  normalizeSteps, formatTime, parseTimeRange, formatTimeRange,
  computeTimeStatus, getPourTemplates, saveBrew, updateBrew, getBeans,
  updateBean, saveActiveBrew, getActiveBrew, clearActiveBrew,
  normalizeName, getRecipes, saveRecipe, updateRecipe,
  generateRecipeCopyName,
  RECIPE_FIELDS, recipeEntityToFormState, formStateToRecipeFields,
} from '../data/storage'
import { getMethodName } from '../data/defaults'
import { BREW_METHODS, GRINDERS, FELLOW_ODE_POSITIONS, DRIPPER_MATERIALS, FILTER_TYPES, BODY_OPTIONS, RATING_SCALE, BREW_ISSUES } from '../data/defaults'
import FlavorPicker from './FlavorPicker'
import StepEditor from './StepEditor'
import TimeInput from './TimeInput'
import useTimer from '../hooks/useTimer'
import useWakeLock from '../hooks/useWakeLock'
import EmptyState from './EmptyState'

// ============================================================
// BREW SCREEN — Guided brewing experience
// ============================================================
// Phase state machine: pick → recipe → brew → rate → success
// pick:    Bean picker (if no bean pre-selected)
// recipe:  Recipe Assembly — review, adjust recipe parameters
// brew:    Active Brew — timer, step teleprompter, variance tracking
// rate:    Rate This Brew — tasting notes, correct actuals, "what to try next"
// success: Done — start new brew or view history

const ratio = (c, w) => c > 0 ? `1:${(w / c).toFixed(1)}` : '—'

const getTotalDuration = (steps) =>
  steps.length > 0
    ? steps[steps.length - 1].time + steps[steps.length - 1].duration
    : 210

// ─── Phase 0: Bean Picker ───────────────────────────────────
function BeanPicker({ beans, previews, onSelect, onNavigate }) {
  const [search, setSearch] = useState('')

  const filtered = beans.filter(b => {
    const q = normalizeName(search)
    if (!q) return true
    return (b.name?.toLowerCase().includes(q) || b.roaster?.toLowerCase().includes(q))
  })

  return (
    <div className="px-4 pt-4 pb-32">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-brew-800">Start a Brew</h1>
        <p className="text-sm text-brew-400 mt-1">Select a bean from your library</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search beans or roasters..."
        className="w-full text-base px-4 py-3 rounded-xl border border-brew-200 bg-white
                   focus:outline-none focus:ring-2 focus:ring-brew-400 mb-4"
      />

      {filtered.length === 0 && beans.length === 0 && (
        <EmptyState
          emoji="🫘"
          title="No Beans Yet"
          description="Add beans from the Beans tab to start brewing."
          action={onNavigate && (
            <button
              onClick={() => onNavigate('beans')}
              className="mt-4 px-6 py-3 bg-brew-600 text-white rounded-xl text-sm font-semibold
                         hover:bg-brew-700 transition-colors min-h-[44px]"
            >
              Go to Beans
            </button>
          )}
        />
      )}
      {filtered.length === 0 && beans.length > 0 && (
        <EmptyState
          emoji="🔍"
          title="No Matches"
          description="No beans match your search."
        />
      )}

      <div className="flex flex-col gap-2">
        {filtered.map(bean => (
          <button
            key={bean.id}
            onClick={() => onSelect(bean)}
            className="w-full text-left p-4 bg-white rounded-2xl border border-brew-100
                       shadow-sm hover:border-brew-300 active:scale-[0.99] transition-all
                       min-h-[44px]"
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-semibold text-brew-800">{bean.name}</div>
                <div className="text-sm text-brew-400 mt-0.5">{bean.roaster || 'Unknown roaster'}</div>
                {previews?.get(bean.id) && (
                  <div className="text-xs text-brew-400 mt-0.5 truncate">{previews.get(bean.id)}</div>
                )}
              </div>
              <div className="text-xs text-brew-400 bg-brew-50 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                {bean.origin || '—'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Phase 1: Recipe Assembly ───────────────────────────────
function RecipeAssembly({ bean, recipe, setRecipe, changes, onStartBrew, onLogWithoutTimer, onBack, beanRecipes, selectedRecipeId, onRecipeSelect, onRecipeRenamed, templates }) {

  const [showRecipePicker, setShowRecipePicker] = useState(false)
  const [renamingRecipeId, setRenamingRecipeId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [targetTimeInput, setTargetTimeInput] = useState(
    () => recipe.targetTimeRange || formatTime(recipe.targetTime)
  )

  const [stepsOpen, setStepsOpen] = useState(false)
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [showScaleBanner, setShowScaleBanner] = useState(false)
  const prevWaterRef = useRef(recipe.waterGrams)
  const scalingOldWaterRef = useRef(null)

  // Sync prevWaterRef when recipe entity changes (not user typing)
  useEffect(() => {
    prevWaterRef.current = recipe.waterGrams
    setShowScaleBanner(false)
  }, [selectedRecipeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWaterBlur = () => {
    const newWater = recipe.waterGrams
    const oldWater = prevWaterRef.current
    if (newWater > 0 && oldWater > 0 && newWater !== oldWater &&
        recipe.steps.some(s => s.waterTo != null)) {
      scalingOldWaterRef.current = oldWater
      setShowScaleBanner(true)
      setStepsOpen(true) // auto-expand steps so user can see
    }
    prevWaterRef.current = newWater
  }

  const applyWaterScaling = () => {
    const oldWater = scalingOldWaterRef.current
    const newWater = recipe.waterGrams
    if (!oldWater || !newWater) return
    const ratio = newWater / oldWater
    const scaled = recipe.steps.map((s, i, arr) => {
      if (s.waterTo == null) return s
      // Snap last step with waterTo to exact newWater
      const isLastWithWater = !arr.slice(i + 1).some(ns => ns.waterTo != null)
      return { ...s, waterTo: isLastWithWater ? newWater : Math.round(s.waterTo * ratio) }
    })
    setRecipe(prev => ({ ...prev, steps: scaled }))
    setShowScaleBanner(false)
  }

  const dismissScaleBanner = () => { setShowScaleBanner(false); scalingOldWaterRef.current = null }

  const grinder = GRINDERS.find(g => g.id === recipe.grinder) || GRINDERS[0]
  const methodObj = BREW_METHODS.find(m => m.id === recipe.method) || BREW_METHODS[0]

  // Methods that use a separate dripper (pour-over devices)
  const methodHasDripper = recipe.method === 'v60' || recipe.method === 'chemex'

  const handleGrinderChange = (grinderId) => {
    const newGrinder = GRINDERS.find(g => g.id === grinderId) || GRINDERS[0]
    let defaultGrind = ''
    if (newGrinder.settingType === 'ode') defaultGrind = '6'
    else if (newGrinder.settingType === 'numeric' || newGrinder.settingType === 'clicks') {
      defaultGrind = String(Math.round((newGrinder.min + newGrinder.max) / 2))
    }
    setRecipe(prev => ({ ...prev, grinder: grinderId, grindSetting: defaultGrind }))
  }

  const handleTargetTimeBlur = () => {
    const range = parseTimeRange(targetTimeInput)
    if (range) setTargetTimeInput(formatTimeRange(range.min, range.max))
  }

  // Returns computed time fields (or null if nothing to flush).
  // Sets recipe state AND returns values for immediate use (React batching workaround).
  const commitTargetTimeInputs = () => {
    const range = parseTimeRange(targetTimeInput)
    if (!range) return null
    const timeFields = {
      targetTimeMin: range.min,
      targetTimeMax: range.max,
      targetTime: Math.round((range.min + range.max) / 2),
      targetTimeRange: formatTimeRange(range.min, range.max),
    }
    setRecipe(prev => ({ ...prev, ...timeFields }))
    setTargetTimeInput(formatTimeRange(range.min, range.max))
    return timeFields
  }

  const updateField = (field, value) => {
    if (typeof value === 'number' && isNaN(value)) return // NaN guard for numeric inputs
    setRecipe(prev => ({ ...prev, [field]: value }))
  }

  const handleStepsChange = (newSteps) => {
    setRecipe(prev => ({ ...prev, steps: newSteps }))
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={onBack}
            className="text-brew-500 hover:text-brew-700 min-h-[44px] flex items-center gap-1 -ml-2 px-2"
            aria-label="Back to bean selection"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4l-6 6 6 6" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="text-xs text-brew-400 uppercase tracking-widest">Recipe</div>
        </div>
        <h1 className="text-2xl font-semibold text-brew-800">Prepare Your Brew</h1>
      </div>

      {/* Changes from last brew — top position for maximum visibility */}
      {changes.length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-brew-500 mb-2 flex items-center gap-1.5">
              Notes from last brew
            </div>
            {changes.map((c, i) => (
              <div key={i} className={`text-sm text-brew-800 leading-relaxed ${i < changes.length - 1 ? 'mb-1.5' : ''}`}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Indicator */}
      {(beanRecipes.length > 0 || (templates && templates.length > 0)) && (
        <div className="px-4 mt-3">
          <button
            onClick={() => setShowRecipePicker(!showRecipePicker)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        border transition-all min-h-[44px]
                        border-brew-300 bg-brew-50 text-brew-600 hover:border-brew-400 cursor-pointer"
          >
            <span>{beanRecipes.find(r => r.id === selectedRecipeId)?.name || 'Recipe'}</span>
            <span className={`transition-transform ${showRecipePicker ? 'rotate-180' : ''}`}>{'\u25BE'}</span>
          </button>

          {/* Recipe Picker Dropdown */}
          {showRecipePicker && (
            <div className="mt-2 bg-white border border-brew-200 rounded-xl shadow-sm overflow-hidden
                            animate-fade-in motion-reduce:animate-none">
              {beanRecipes.map(r => (
                <div
                  key={r.id}
                  className={`flex items-center border-b border-brew-100 last:border-b-0
                              transition-colors ${
                    r.id === selectedRecipeId
                      ? 'bg-brew-50 text-brew-700'
                      : 'text-brew-600 hover:bg-brew-50'
                  }`}
                >
                  {renamingRecipeId === r.id ? (
                    <div className="flex-1 px-4 py-3">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value.slice(0, 50))}
                        onBlur={() => {
                          const trimmed = renameValue.trim()
                          if (trimmed) {
                            onRecipeRenamed?.(r.id, trimmed)
                          }
                          setRenamingRecipeId(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur()
                          if (e.key === 'Escape') {
                            setRenameValue('')
                            setRenamingRecipeId(null)
                          }
                        }}
                        autoFocus
                        maxLength={50}
                        className="w-full px-2 py-1 rounded-lg border border-brew-300 text-base text-brew-800
                                   focus:outline-none focus:ring-2 focus:ring-brew-400"
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onRecipeSelect(r)
                          setShowRecipePicker(false)
                        }}
                        className={`flex-1 text-left px-4 py-3 text-sm min-h-[44px] ${
                          r.id === selectedRecipeId ? 'font-medium' : ''
                        }`}
                      >
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-brew-400 mt-0.5">
                          {r.coffeeGrams}g / {r.waterGrams}g · grind {r.grindSetting || '—'}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenamingRecipeId(r.id)
                          setRenameValue(r.name || '')
                        }}
                        className="px-3 py-3 text-brew-300 hover:text-brew-500 transition-colors flex-shrink-0"
                        aria-label="Rename recipe"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
              {/* Starter recipes (templates) */}
              {templates && templates.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-brew-300 border-t border-brew-100">
                    {beanRecipes.length > 0 ? 'or start fresh' : 'Starter recipes'}
                  </div>
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onRecipeSelect({ ...t, _isStarter: true })
                        setShowRecipePicker(false)
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-brew-600 hover:bg-brew-50 min-h-[44px]"
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-brew-400 mt-0.5">
                        {t.steps?.length || 0} steps
                      </div>
                    </button>
                  ))}
                </>
              )}
              <button
                onClick={() => {
                  onRecipeSelect(null) // null = new recipe
                  setShowRecipePicker(false)
                }}
                className="w-full text-left px-4 py-3 text-sm text-brew-500 hover:bg-brew-50
                           border-t border-brew-100 min-h-[44px]"
              >
                + New Recipe
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recipe notes (read-only) */}
      {selectedRecipeId && (() => {
        const currentRecipe = beanRecipes.find(r => r.id === selectedRecipeId)
        if (!currentRecipe?.notes) return null
        return (
          <div className="px-4 mt-2">
            <div className="text-xs text-brew-500 italic leading-relaxed">
              {currentRecipe.notes}
            </div>
          </div>
        )
      })()}

      {/* Bean + Brew Params — always editable, no card wrapper */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-brew-800 leading-tight">{bean.name}</h2>
              <p className="text-sm text-brew-400 mt-1">{bean.roaster}</p>
            </div>
            {bean.roastDate && (
              <div className="text-xs text-brew-500 bg-brew-50 px-2.5 py-1.5 rounded-lg shrink-0">
                Roasted {bean.roastDate}
              </div>
            )}
          </div>

          {/* Coffee / Water / Ratio */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center p-3 bg-brew-50 rounded-xl">
              <div className="text-xs text-brew-400 uppercase tracking-wider mb-1">Coffee</div>
              <input
                type="number"
                value={recipe.coffeeGrams}
                onChange={e => updateField('coffeeGrams', Number(e.target.value))}
                min={1} max={100}
                className="w-full text-center text-lg font-medium text-brew-800 bg-transparent
                           border-b border-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400 text-base"
              />
            </div>
            <div className="text-center p-3 bg-brew-50 rounded-xl">
              <div className="text-xs text-brew-400 uppercase tracking-wider mb-1">Water</div>
              <input
                type="number"
                value={recipe.waterGrams}
                onChange={e => updateField('waterGrams', Number(e.target.value))}
                onBlur={handleWaterBlur}
                min={1} max={2000}
                className="w-full text-center text-lg font-medium text-brew-800 bg-transparent
                           border-b border-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400 text-base"
              />
            </div>
            <div className="text-center p-3 bg-brew-50 rounded-xl">
              <div className="text-xs text-brew-400 uppercase tracking-wider mb-1">Ratio</div>
              <div className="text-lg font-medium text-brew-800">{ratio(recipe.coffeeGrams, recipe.waterGrams)}</div>
            </div>
          </div>

          {/* Water scaling banner */}
          {showScaleBanner && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in motion-reduce:animate-none">
              <div className="text-sm text-blue-800">
                Water changed from {scalingOldWaterRef.current}g → {recipe.waterGrams}g. Scale pour steps to match?
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={applyWaterScaling}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium
                             hover:bg-blue-700 min-h-[44px]"
                >
                  Scale
                </button>
                <button
                  onClick={dismissScaleBanner}
                  className="px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-xs font-medium
                             hover:bg-blue-100 min-h-[44px]"
                >
                  Keep
                </button>
              </div>
            </div>
          )}

          {/* Grind / Temp */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center p-3 bg-brew-50 rounded-xl">
              <div className="text-xs text-brew-400 uppercase tracking-wider mb-1">Grind</div>
              {grinder.settingType === 'ode' ? (
                <select
                  value={recipe.grindSetting}
                  onChange={e => updateField('grindSetting', e.target.value)}
                  className="w-full text-center text-sm font-medium text-brew-800 bg-transparent
                             border-b border-brew-300 focus:outline-none text-base"
                >
                  {FELLOW_ODE_POSITIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={recipe.grindSetting}
                  onChange={e => updateField('grindSetting', e.target.value)}
                  maxLength={50}
                  className="w-full text-center text-sm font-medium text-brew-800 bg-transparent
                             border-b border-brew-300 focus:outline-none text-base"
                />
              )}
            </div>
            <div className="text-center p-3 bg-brew-50 rounded-xl">
              <div className="text-xs text-brew-400 uppercase tracking-wider mb-1">Temp</div>
              <input
                type="number"
                value={recipe.waterTemp}
                onChange={e => updateField('waterTemp', Number(e.target.value))}
                min={32} max={212}
                className="w-full text-center text-sm font-medium text-brew-800 bg-transparent
                           border-b border-brew-300 focus:outline-none text-base"
              />
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-xs text-brew-400 uppercase tracking-wider mb-1">Target Time</div>
            <input
              type="text"
              value={targetTimeInput}
              onChange={e => setTargetTimeInput(e.target.value)}
              onBlur={handleTargetTimeBlur}
              placeholder="3:00 - 3:30"
              maxLength={15}
              className="w-32 mx-auto text-center text-lg font-medium text-brew-800 bg-transparent
                         border-b border-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400 text-base block"
            />
          </div>
        </div>
      </div>

      {/* Pour Steps — collapsed by default */}
      <div className="px-4 mt-4">
        <button
          onClick={() => setStepsOpen(!stepsOpen)}
          className="w-full flex items-center justify-between py-2 min-h-[44px]"
        >
          <div className="text-xs text-brew-400 uppercase tracking-widest">Pour Steps</div>
          {!stepsOpen && recipe.steps.length > 0 && (
            <div className="text-xs text-brew-500">
              {recipe.steps.length} steps{recipe.waterGrams ? ` · ${recipe.waterGrams}g` : ''}
            </div>
          )}
          <span className={`text-brew-400 transition-transform text-xs ml-2 ${stepsOpen ? 'rotate-180' : ''}`}>
            {'\u25BE'}
          </span>
        </button>
        {stepsOpen && (
          <div className="pb-2 animate-fade-in motion-reduce:animate-none">
            <StepEditor
              steps={recipe.steps}
              onChange={handleStepsChange}
              cascadeTime
            />
          </div>
        )}
      </div>

      {/* Equipment Section */}
      <div className="px-4 mt-4">
        <button
          onClick={() => setEquipmentOpen(!equipmentOpen)}
          className="w-full flex items-center justify-between py-2 min-h-[44px]"
        >
          <div className="text-xs text-brew-400 uppercase tracking-widest">Equipment</div>
          {!equipmentOpen && (
            <div className="text-xs text-brew-500">
              {methodObj.name} · {grinder.name}{recipe.filterType ? ` · ${recipe.filterType.replace('-', ' ')}` : ''}
            </div>
          )}
          <span className={`text-brew-400 transition-transform text-xs ml-2 ${equipmentOpen ? 'rotate-180' : ''}`}>
            {'\u25BE'}
          </span>
        </button>

        {equipmentOpen && (
          <div className="space-y-4 pb-2 animate-fade-in motion-reduce:animate-none">
            {/* Method */}
            <div>
              <div className="text-xs text-brew-400 mb-1.5">Method</div>
              <div className="flex flex-wrap gap-2">
                {BREW_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setRecipe(prev => ({ ...prev, method: m.id }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all min-h-[44px]
                      ${recipe.method === m.id
                        ? 'border-brew-500 bg-brew-50 text-brew-700'
                        : 'border-brew-200 text-brew-400 hover:border-brew-300'
                      }`}
                  >
                    {m.icon} {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dripper — only for pour-over methods */}
            {methodHasDripper && (
              <div>
                <div className="text-xs text-brew-400 mb-1.5">Dripper</div>
                <div className="flex flex-wrap gap-2">
                  {DRIPPER_MATERIALS.map(mat => (
                    <button
                      key={mat}
                      onClick={() => setRecipe(prev => ({ ...prev, dripper: mat }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize min-h-[44px]
                        ${recipe.dripper === mat
                          ? 'border-brew-500 bg-brew-50 text-brew-700'
                          : 'border-brew-200 text-brew-400 hover:border-brew-300'
                        }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grinder */}
            <div>
              <div className="text-xs text-brew-400 mb-1.5">Grinder</div>
              <select
                value={recipe.grinder}
                onChange={e => handleGrinderChange(e.target.value)}
                className="w-full p-3 rounded-xl border border-brew-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brew-400 text-base"
              >
                {GRINDERS.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Type */}
            <div>
              <div className="text-xs text-brew-400 mb-1.5">Filter</div>
              <div className="flex flex-wrap gap-2">
                {FILTER_TYPES.map(f => (
                  <button
                    key={f}
                    onClick={() => setRecipe(prev => ({ ...prev, filterType: f }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize min-h-[44px]
                      ${recipe.filterType === f
                        ? 'border-brew-500 bg-brew-50 text-brew-700'
                        : 'border-brew-200 text-brew-400 hover:border-brew-300'
                      }`}
                  >
                    {f.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brew This CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-4 pb-safe
                      bg-gradient-to-t from-brew-50 via-brew-50 to-transparent pointer-events-none z-10">
        <button
          onClick={() => {
            commitTargetTimeInputs()
            onStartBrew()
          }}
          className="w-full py-4 bg-brew-800 text-white rounded-2xl text-base font-semibold
                     shadow-lg hover:bg-brew-700 active:scale-[0.98] transition-all
                     pointer-events-auto min-h-[44px]"
        >
          Brew This
        </button>
        <button
          onClick={() => {
            const timeOverrides = commitTargetTimeInputs()
            onLogWithoutTimer(timeOverrides || {})
          }}
          className="w-full py-3 mt-2 text-brew-500 text-sm font-medium
                     hover:text-brew-700 pointer-events-auto min-h-[44px]"
        >
          Log without timer
        </button>
      </div>
    </div>
  )
}

// ─── Phase 2: Active Brew ───────────────────────────────────
function ActiveBrew({ recipe, onFinish, onBrewActiveChange, persistState, savedBrewState }) {
  const timer = useTimer()
  const [tappedSteps, setTappedSteps] = useState(() => savedBrewState?.tappedSteps || {})
  const [skippedSteps, setSkippedSteps] = useState(() => savedBrewState?.skippedSteps || {})
  const stepsContainerRef = useRef(null)
  const stepRefs = useRef({})
  const lastPersistRef = useRef(0)
  const hasStarted = timer.elapsed > 0 || timer.running

  useWakeLock(timer.running)

  // Restore timer from saved state on mount
  useEffect(() => {
    if (savedBrewState?.timerState) {
      timer.restore(savedBrewState.timerState)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = recipe.steps
  const totalDuration = getTotalDuration(steps)

  // Determine current step (memoized to stabilize useEffect deps)
  const currentStepIdx = useMemo(() => {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (timer.elapsed >= steps[i].time && !skippedSteps[steps[i].id]) return i
    }
    return 0
  }, [timer.elapsed, steps, skippedSteps])

  // Pre-compute next non-skipped step index (O(S) once, not O(S²) inside map)
  const nextStepIdx = useMemo(() => {
    if (!hasStarted) return -1
    for (let j = currentStepIdx + 1; j < steps.length; j++) {
      if (!skippedSteps[steps[j].id]) return j
    }
    return -1
  }, [hasStarted, currentStepIdx, steps, skippedSteps])

  // Auto-scroll to current step within the steps container
  useEffect(() => {
    if (!timer.running) return
    const currentStep = steps[currentStepIdx]
    const ref = stepRefs.current[currentStep?.id]
    const container = stepsContainerRef.current
    if (ref && container) {
      const rect = ref.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      container.scrollTo({
        top: container.scrollTop + (rect.top - containerRect.top) - 16,
        behavior: 'smooth'
      })
    }
  }, [currentStepIdx, timer.running, steps])

  // Notify parent of active state
  useEffect(() => {
    if (timer.running) onBrewActiveChange(true)
    return () => onBrewActiveChange(false)
  }, [timer.running, onBrewActiveChange])

  // Persist state — throttled to every 5 seconds, plus immediate on user actions
  const doPersist = useCallback((ts, ss) => {
    lastPersistRef.current = Date.now()
    persistState({
      timerState: timer.getTimerState(),
      tappedSteps: ts,
      skippedSteps: ss,
      elapsed: timer.elapsed,
    })
  }, [persistState, timer])

  useEffect(() => {
    if (!hasStarted) return
    if (Date.now() - lastPersistRef.current < 5000) return
    doPersist(tappedSteps, skippedSteps)
  }, [timer.elapsed, tappedSteps, skippedSteps, hasStarted, doPersist])

  const handleTapStep = (step) => {
    if (tappedSteps[step.id] !== undefined) return // double-tap guard
    const updated = { ...tappedSteps, [step.id]: timer.elapsed }
    setTappedSteps(updated)
    doPersist(updated, skippedSteps) // immediate persist on user action
  }

  const handleSkipStep = (step) => {
    const updated = { ...skippedSteps, [step.id]: true }
    setSkippedSteps(updated)
    doPersist(tappedSteps, updated) // immediate persist on user action
  }

  const targetMax = recipe.targetTimeMax || recipe.targetTime || totalDuration
  const progress = Math.min(timer.elapsed / targetMax, 1)
  const timeStatus = hasStarted
    ? computeTimeStatus(timer.elapsed, recipe.targetTimeMin, recipe.targetTimeMax, recipe.targetTime, totalDuration)
    : null

  // top-12/md:top-14 must match Header h-12/md:h-14 in Header.jsx
  return (
    <div className="fixed top-12 md:top-14 left-0 right-0 bottom-0 flex flex-col bg-white z-10">
      {/* Pinned timer area */}
      <div className="bg-white shadow-md shrink-0">
        {/* Timer Display */}
        <div className="px-5 pt-6 pb-3">
          <div className="flex items-baseline justify-between">
            <div className={`font-mono text-7xl font-medium leading-none tabular-nums tracking-tight ${
              timeStatus?.status === 'over' ? 'text-red-600'
                : timeStatus?.status === 'approaching' ? 'text-amber-600'
                : timeStatus?.status === 'on-target' ? 'text-green-600'
                : 'text-gray-900'
            }`}>
              {formatTime(timer.elapsed)}
            </div>
            <div className="text-right">
              <div className="text-sm text-brew-400">
                Target: {recipe.targetTimeRange || formatTime(recipe.targetTime)}
              </div>
              {timeStatus && hasStarted && (
                <div className={`text-xs mt-0.5 font-medium ${
                  timeStatus.status === 'over' ? 'text-red-500'
                    : timeStatus.status === 'approaching' ? 'text-amber-500'
                    : timeStatus.status === 'on-target' ? 'text-green-500'
                    : 'text-brew-300'
                }`}>
                  {timeStatus.status === 'under' && `${timeStatus.delta}s to go`}
                  {timeStatus.status === 'on-target' && 'On target'}
                  {timeStatus.status === 'approaching' && `${timeStatus.delta}s left`}
                  {timeStatus.status === 'over' && `${timeStatus.delta}s over`}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-brew-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-1000 linear ${
                timeStatus?.status === 'over' ? 'bg-red-500'
                  : timeStatus?.status === 'approaching' ? 'bg-amber-500'
                  : timeStatus?.status === 'on-target' ? 'bg-green-500'
                  : 'bg-brew-500'
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Controls — fixed height container prevents layout shift */}
        <div className="flex flex-col items-center justify-center h-24">
          {!hasStarted && (
            <>
              <button
                onClick={() => timer.play()}
                className="w-[72px] h-[72px] rounded-full bg-brew-800 text-white text-2xl
                           shadow-xl flex items-center justify-center
                           hover:bg-brew-700 active:scale-95 transition-all"
                aria-label="Start brew"
              >
                ▶
              </button>
              <div className="text-xs text-brew-400 mt-1.5">Tap to start brewing</div>
            </>
          )}
          {timer.running && (
            <button
              onClick={() => timer.pause()}
              className="border border-brew-200 rounded-full px-5 py-1.5 text-xs text-brew-400
                         hover:bg-brew-50 min-h-[44px] min-w-[44px]"
            >
              Pause
            </button>
          )}
          {!timer.running && hasStarted && (
            <button
              onClick={() => timer.play()}
              className="bg-brew-800 text-white rounded-full px-6 py-2 text-sm font-semibold
                         hover:bg-brew-700 active:scale-95 transition-all min-h-[44px]"
            >
              Resume
            </button>
          )}
        </div>
      </div>

      {/* Step Teleprompter — Timeline */}
      <div ref={stepsContainerRef} className="flex-1 overflow-y-auto">
        <div className="relative px-4 pb-36">
          {/* Vertical timeline line */}
          {steps.length > 1 && (
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-brew-100" />
          )}

          {steps.map((step, i) => {
            const skipped = skippedSteps[step.id]
            const isCurrent = i === currentStepIdx && hasStarted && !skipped
            const isPast = hasStarted && !skipped && timer.elapsed >= step.time + step.duration
            const isFuture = !isCurrent && !isPast && !skipped
            const isNext = i === nextStepIdx
            const tappedAt = tappedSteps[step.id]
            const variance = tappedAt !== undefined ? tappedAt - step.time : null
            const stepEndTime = (step.time || 0) + (step.duration || 0)
            const timeRange = `${formatTime(step.time)} → ${formatTime(stepEndTime)}`

            // Skipped steps — minimal dot marker
            if (skipped) {
              return (
                <div
                  key={step.id}
                  ref={el => (stepRefs.current[step.id] = el)}
                  className="flex items-center gap-2 py-1.5 pl-1 mb-0.5 opacity-40"
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-brew-300 flex-shrink-0" />
                  <span className="text-sm text-brew-300 line-through truncate">{step.name}</span>
                </div>
              )
            }

            // Past steps — compact one-liner with green checkmark dot
            if (isPast) {
              return (
                <div
                  key={step.id}
                  ref={el => (stepRefs.current[step.id] = el)}
                  className="flex items-center gap-2 py-2 pl-1 mb-0.5 rounded-lg
                             animate-fade-in motion-reduce:animate-none"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-sm text-brew-400 truncate flex-1 min-w-0">
                    <span className="font-mono">{timeRange}</span>
                    <span className="mx-1">&middot;</span>
                    <span>{step.name}</span>
                    {step.waterTo != null && (
                      <>
                        <span className="mx-1">&middot;</span>
                        <span>{step.waterTo}g</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs tabular-nums text-brew-300 flex-shrink-0">
                    {tappedAt !== undefined ? formatTime(tappedAt) : ''}
                  </span>
                </div>
              )
            }

            // Current step — expanded card with progress bar
            if (isCurrent) {
              const stepElapsed = Math.max(0, timer.elapsed - (step.time || 0))
              const stepProgress = step.duration > 0
                ? Math.min(stepElapsed / step.duration, 1)
                : 0

              return (
                <div
                  key={step.id}
                  ref={el => (stepRefs.current[step.id] = el)}
                  onClick={() => timer.running && handleTapStep(step)}
                  className={`relative flex gap-2 pl-1 py-3 mb-1.5 min-h-[44px]
                             ${timer.running ? 'cursor-pointer' : ''}`}
                >
                  {/* Pulsing timeline dot */}
                  <span className="w-2.5 h-2.5 rounded-full bg-brew-500 flex-shrink-0 mt-1
                                   animate-pulse-dot motion-reduce:animate-none" />

                  {/* Card content */}
                  <div className="flex-1 p-3 rounded-lg bg-amber-50 border-l-4 border-l-brew-600
                                  text-brew-900 shadow-sm relative">
                    {/* Skip button */}
                    {timer.running && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSkipStep(step) }}
                        className="absolute top-1 right-1 text-base px-2 py-1 leading-none
                                   min-h-[44px] min-w-[44px] flex items-center justify-center text-brew-300"
                        aria-label={`Skip ${step.name}`}
                      >
                        &#x2715;
                      </button>
                    )}

                    <div className="flex justify-between items-center pr-8">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl font-bold leading-snug">{step.name}</span>
                        {step.waterTo != null && (
                          <span className="text-base font-semibold px-2.5 py-1 rounded-md text-brew-500 bg-brew-50 flex-shrink-0">
                            &rarr; {step.waterTo}g
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm font-mono text-brew-500 mt-1">{timeRange}</div>

                    {step.note && (
                      <div className="text-base mt-1.5 opacity-80 leading-snug">{step.note}</div>
                    )}

                    {/* Mini progress bar */}
                    {step.duration > 0 && (
                      <div className="mt-2 h-1 bg-brew-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brew-500 transition-[width] duration-1000 linear"
                          style={{ width: `${stepProgress * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Variance indicator */}
                    {variance !== null && (
                      <div className={`mt-1.5 text-xs font-semibold ${
                        Math.abs(variance) <= 3 ? 'text-green-600' : 'text-amber-500'
                      }`}>
                        Tapped at {formatTime(tappedAt)} ({variance > 0 ? '+' : ''}{variance}s)
                      </div>
                    )}

                    {/* Tap prompt */}
                    {timer.running && tappedAt === undefined && (
                      <div className="mt-2 text-xs text-brew-400">
                        Tap when you start this step
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            // Future steps — "up next" gets card treatment, others are dimmed one-liners
            if (isNext) {
              return (
                <div
                  key={step.id}
                  ref={el => (stepRefs.current[step.id] = el)}
                  onClick={() => timer.running && handleTapStep(step)}
                  className={`flex gap-2 pl-1 py-2 mb-1 min-h-[44px]
                             ${timer.running ? 'cursor-pointer' : ''}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-brew-300 flex-shrink-0 mt-2.5" />
                  <div className="flex-1 px-3 py-2 rounded-lg bg-brew-50/50 border border-brew-200/50">
                    <span className="text-[10px] uppercase tracking-wider text-brew-400 font-semibold">Up next</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-medium text-brew-700">{step.name}</span>
                      {step.waterTo != null && (
                        <span className="text-sm font-semibold text-brew-400">&rarr; {step.waterTo}g</span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-brew-400 mt-0.5">{timeRange}</div>
                    {step.note && (
                      <div className="text-sm mt-1 text-brew-500 opacity-80 leading-snug">{step.note}</div>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={step.id}
                ref={el => (stepRefs.current[step.id] = el)}
                onClick={() => timer.running && handleTapStep(step)}
                className={`flex items-center gap-2 py-2 pl-1 mb-0.5 min-h-[44px]
                           transition-opacity duration-300 motion-reduce:transition-none opacity-40
                           ${timer.running ? 'cursor-pointer' : ''}`}
              >
                <span className="w-2.5 h-2.5 rounded-full border-2 border-brew-200 flex-shrink-0" />
                <span className="text-sm text-brew-600 truncate flex-1 min-w-0">
                  <span className="font-mono text-brew-400">{timeRange}</span>
                  <span className="text-brew-200 mx-1">&middot;</span>
                  <span className="font-medium">{step.name}</span>
                  {step.waterTo != null && (
                    <>
                      <span className="text-brew-200 mx-1">&middot;</span>
                      <span className="text-brew-400">{step.waterTo}g</span>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Finish Brew — fixed relative to viewport (works because parent has no transform/filter/will-change) */}
      {hasStarted && (
        <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-4 pb-safe
                        bg-gradient-to-t from-white via-white to-transparent pointer-events-none z-10">
          <button
            onClick={() => {
              const finalElapsed = timer.stop()
              onFinish({ elapsed: finalElapsed, tappedSteps, skippedSteps })
            }}
            className="w-full py-4 bg-brew-800 text-white rounded-2xl text-base font-semibold
                       shadow-lg hover:bg-brew-700 active:scale-[0.98] transition-all
                       pointer-events-auto min-h-[44px]"
          >
            Finish Brew
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Phase 3: Rate This Brew ────────────────────────────────
// Brew is already saved to localStorage on "Finish Brew".
// This screen lets user correct actuals, add tasting notes, and plan next brew.
// "Done" calls updateBrew() to merge tasting data into the saved record.
function RateThisBrew({ brew, bean, onComplete, onBrewUpdated, setBeans }) {
  const [notes, setNotes] = useState(brew.notes || '')
  const [nextBrewChanges, setNextBrewChanges] = useState(brew.nextBrewChanges || '')
  const [flavors, setFlavors] = useState(brew.flavors || [])
  const [body, setBody] = useState(brew.body || '')
  const [rating, setRating] = useState(brew.rating ?? null)
  const [issues, setIssues] = useState(brew.issues || [])
  const [grindSetting, setGrindSetting] = useState(brew.grindSetting || '')
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(brew.totalTime)
  const savingRef = useRef(false)

  const isManual = brew.isManualEntry === true
  const steps = brew.recipeSnapshot?.steps || brew.steps || []
  const stepResults = brew.stepResults || {}

  // Compute time status for display
  const totalDuration = getTotalDuration(steps)
  const timeResult = computeTimeStatus(brew.totalTime, brew.targetTimeMin, brew.targetTimeMax, brew.targetTime, totalDuration)

  const handleDone = () => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const resolvedTime = totalTimeSeconds ?? brew.totalTime
      const updates = {
        flavors,
        body,
        rating,
        issues,
        notes,
        nextBrewChanges,
        grindSetting,
        totalTime: resolvedTime,
      }

      // Recompute timeStatus if totalTime was corrected
      if (resolvedTime != null && resolvedTime !== brew.totalTime) {
        const newTimeResult = computeTimeStatus(resolvedTime, brew.targetTimeMin, brew.targetTimeMax, brew.targetTime, totalDuration)
        const status = newTimeResult?.status || null
        updates.timeStatus = status === 'approaching' ? 'on-target' : status
      }

      const updatedBrews = updateBrew(brew.id, updates)
      onBrewUpdated(updatedBrews)

      // Update bean with "what to try next"
      if (nextBrewChanges.trim() && bean?.id) {
        updateBean(bean.id, { lastBrewChanges: nextBrewChanges.trim() })
        setBeans(getBeans())
      }

      clearActiveBrew()
      onComplete({ ...brew, ...updates })
    } finally {
      savingRef.current = false
    }
  }

  return (
    <div className="px-4 pt-4 pb-28">
      {/* Summary */}
      <div className="text-center mb-6">
        <div className="text-xs text-brew-400 uppercase tracking-widest mb-1">
          {isManual ? 'Log Brew' : 'Brew Complete'}
        </div>
        <h1 className="text-2xl font-semibold text-brew-800">Rate This Brew</h1>
        {isManual && brew.totalTime == null ? (
          <div className="text-sm text-brew-400 mt-2">Enter your brew time below</div>
        ) : (
          <>
            <div className="font-mono text-5xl text-brew-500 mt-2 tabular-nums">
              {formatTime(brew.totalTime)}
            </div>
            <div className="text-sm text-brew-400 mt-1">
              Target: {brew.targetTimeRange || formatTime(brew.targetTime)}
            </div>
            {timeResult && (
              <div className={`text-sm font-semibold mt-1 ${
                timeResult.status === 'under' ? 'text-amber-500'
                  : timeResult.status === 'over' ? 'text-red-500'
                  : 'text-green-600'
              }`}>
                {timeResult.status === 'under' ? `${timeResult.delta}s under target`
                  : timeResult.status === 'over' ? `${timeResult.delta}s over target`
                  : 'On target'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Step Results — hidden for manual brews (no timer data) */}
      {!isManual && steps.length > 0 && (
        <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
          <h3 className="text-lg font-semibold text-brew-800 mb-3">Step Timing</h3>
          {steps.map(step => {
            const result = stepResults[step.id]
            const tappedAt = result?.tappedAt
            const skipped = result?.skipped
            const variance = result?.variance
            const notReached = !skipped && tappedAt == null && brew.totalTime != null && step.time > brew.totalTime

            return (
              <div
                key={step.id}
                className={`flex justify-between items-center py-2.5 border-b border-brew-50
                            last:border-0 ${skipped || notReached ? 'opacity-40' : ''}`}
              >
                <div>
                  <span className={`font-semibold text-sm ${skipped ? 'line-through' : ''} text-brew-800`}>
                    {step.name}
                  </span>
                  {skipped && <span className="text-xs text-red-500 ml-2">Skipped</span>}
                  {notReached && <span className="text-xs text-brew-400 ml-2">Not reached</span>}
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums text-brew-800">
                    {skipped || notReached ? '—' : tappedAt != null ? formatTime(tappedAt) : formatTime(step.time)}
                  </div>
                  {variance != null && !skipped && (
                    <div className={`text-xs font-semibold ${
                      Math.abs(variance) <= 3 ? 'text-green-600' : 'text-amber-500'
                    }`}>
                      {variance > 0 ? '+' : ''}{variance}s
                    </div>
                  )}
                  {!skipped && !notReached && tappedAt == null && (
                    <div className="text-xs text-brew-300">as planned</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Brew Details — actuals, notes, next-brew changes */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-1">Brew Details</h3>
        <p className="text-xs text-brew-400 mb-3">
          {isManual ? 'Enter the details for this brew.' : 'Adjust if the actual values differed from planned.'}
        </p>
        {isManual && (
          <div className="mb-3">
            <label className="text-xs text-brew-400 block mb-1">Total Brew Time</label>
            <TimeInput
              value={totalTimeSeconds}
              onChange={setTotalTimeSeconds}
              placeholder="3:30"
              className="w-full p-3 rounded-xl border border-brew-300 bg-brew-50
                         text-base text-brew-800 font-mono text-center
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-brew-400 block mb-1">Grind Setting</label>
            <input
              type="text"
              value={grindSetting}
              onChange={e => setGrindSetting(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-brew-200 bg-brew-50
                         text-base text-brew-800 focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
          {!isManual && (
            <div>
              <label className="text-xs text-brew-400 block mb-1">Total Time</label>
              <TimeInput
                value={totalTimeSeconds}
                onChange={setTotalTimeSeconds}
                placeholder="3:30"
                className="w-full p-2.5 rounded-xl border border-brew-200 bg-brew-50
                           text-base text-brew-800 font-mono focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            </div>
          )}
        </div>

        {/* Notes divider */}
        <div className="border-t border-brew-100 mt-4 pt-4">
          <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Bed looked uneven after bloom, water temp dropped fast..."
            maxLength={2000}
            className="w-full min-h-[80px] p-3 rounded-xl border border-brew-200 bg-brew-50
                       text-base text-brew-800 resize-y focus:outline-none focus:ring-2 focus:ring-brew-400"
          />
        </div>

        {/* Try Next Time — amber inset */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 mt-4 p-4">
          <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Try Next Time</div>
          <p className="text-xs text-brew-400 mb-2">
            These notes will appear as suggestions next time you brew this bean.
          </p>
          <textarea
            value={nextBrewChanges}
            onChange={e => setNextBrewChanges(e.target.value)}
            placeholder="Try coarser grind, extend bloom to 45s..."
            maxLength={500}
            className="w-full min-h-[80px] p-3 rounded-xl border border-amber-200 bg-white
                       text-base text-brew-800 resize-y focus:outline-none focus:ring-2 focus:ring-brew-400"
          />
        </div>
      </div>

      {/* Tasting — FlavorPicker, Body, Rating, Issues */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-3">Tasting</h3>

        {/* Flavors */}
        <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Flavors</div>
        <FlavorPicker selected={flavors} onChange={setFlavors} />

        {/* Body */}
        <div className="mt-4">
          <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Body</div>
          <div className="flex flex-wrap gap-1.5">
            {BODY_OPTIONS.map(b => (
              <button
                key={b}
                onClick={() => setBody(body === b ? '' : b)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors min-h-[44px] ${
                  body === b
                    ? 'border-brew-500 bg-brew-500 text-white'
                    : 'border-brew-200 text-brew-500 hover:bg-brew-50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="mt-4">
          <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Rating</div>
          <div className="flex gap-2">
            {RATING_SCALE.map(r => (
              <button
                key={r.value}
                onClick={() => setRating(rating === r.value ? null : r.value)}
                className={`flex-1 py-2 rounded-xl text-center transition-all border min-h-[44px] ${
                  rating === r.value
                    ? 'border-brew-500 bg-brew-500 text-white'
                    : 'border-brew-200 text-brew-600 hover:bg-brew-50'
                }`}
              >
                <div className="text-lg">{r.emoji}</div>
                <div className="text-[10px] mt-0.5">{r.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div className="mt-4">
          <div className="text-xs text-brew-400 uppercase tracking-wider mb-2">Issues</div>
          <div className="flex flex-wrap gap-1.5">
            {BREW_ISSUES.map(issue => (
              <button
                key={issue}
                onClick={() => setIssues(prev =>
                  prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
                )}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors min-h-[44px] ${
                  issues.includes(issue)
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-brew-200 text-brew-500 hover:bg-brew-50'
                }`}
              >
                {issue}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Done Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-4 pb-safe
                      bg-gradient-to-t from-brew-50 via-brew-50 to-transparent pointer-events-none z-10">
        <button
          onClick={handleDone}
          className="w-full py-4 bg-brew-800 text-white rounded-2xl text-base font-semibold
                     shadow-lg hover:bg-brew-700 active:scale-[0.98] transition-all
                     pointer-events-auto min-h-[44px]"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// Field display labels for fork prompt (raw field → user-friendly name)
const FIELD_LABELS = {
  coffeeGrams: 'Coffee', waterGrams: 'Water', grindSetting: 'Grind',
  waterTemp: 'Temp', targetTime: 'Target time', targetTimeRange: 'Time range',
  targetTimeMin: 'Min time', targetTimeMax: 'Max time',
  pourTemplateId: 'Template', method: 'Method', grinder: 'Grinder',
  dripper: 'Dripper', filterType: 'Filter',
}

// Fields to skip in fork prompt display (arrays/objects don't display well inline)
const SKIP_DISPLAY_FIELDS = new Set(['steps'])

// ─── Phase 4: Brew Success ──────────────────────────────────
// Post-brew success screen. Shows confirmation and (when applicable) recipe fork prompt.
function BrewSuccess({ brew, selectedRecipeId, recipes, recipeWasAutoCreated, onStartNewBrew, onViewHistory, onUpdateRecipe, onSaveAsNewRecipe }) {
  const [forkDismissed, setForkDismissed] = useState(false)

  // Compute whether brew settings differ from source recipe
  const sourceRecipe = useMemo(() => {
    if (!selectedRecipeId || recipeWasAutoCreated) return null
    return (recipes || []).find(r => r.id === selectedRecipeId) || null
  }, [selectedRecipeId, recipeWasAutoCreated, recipes])

  const changedFields = useMemo(() => {
    if (!sourceRecipe || !brew) return []
    const changes = []
    RECIPE_FIELDS.forEach(field => {
      const brewVal = brew[field]
      const recipeVal = sourceRecipe[field]
      // Compare stringified for arrays/objects, direct for primitives
      const brewStr = JSON.stringify(brewVal ?? null)
      const recipeStr = JSON.stringify(recipeVal ?? null)
      if (brewStr !== recipeStr) {
        changes.push({ field, brewVal, recipeVal })
      }
    })
    return changes
  }, [sourceRecipe, brew])

  const showForkPrompt = changedFields.length > 0 && sourceRecipe && !forkDismissed

  return (
    <div className="flex flex-col items-center justify-center p-10 pb-32 text-center
                    animate-fade-in motion-reduce:animate-none min-h-[calc(100vh-3rem)]">
      <div className="w-20 h-20 rounded-full bg-brew-50 flex items-center justify-center
                      text-4xl text-brew-500 mb-5">
        ✓
      </div>
      <h2 className="text-2xl font-semibold text-brew-800 mb-2">Brew Saved</h2>
      <p className="text-sm text-brew-400 leading-relaxed max-w-[260px]">
        Your brew is saved. You can edit it anytime from your brew history.
      </p>

      {showForkPrompt && (
        <div className="mt-6 w-full max-w-[320px] bg-white border border-amber-200 rounded-2xl p-5 text-left">
          <p className="text-sm font-semibold text-brew-800 mb-2">
            Your settings differed from "{sourceRecipe.name}"
          </p>
          <ul className="text-xs text-brew-500 mb-4 space-y-1">
            {changedFields.filter(({ field }) => !SKIP_DISPLAY_FIELDS.has(field)).map(({ field, brewVal, recipeVal }) => (
              <li key={field}>
                <span className="font-medium text-brew-600">{FIELD_LABELS[field] || field}:</span>{' '}
                {String(recipeVal ?? '–')} → {String(brewVal ?? '–')}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onUpdateRecipe(selectedRecipeId)
                setForkDismissed(true)
              }}
              className="bg-brew-800 text-white rounded-xl px-4 py-3 text-sm font-semibold
                         hover:bg-brew-700 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Update Recipe
            </button>
            <button
              onClick={() => {
                onSaveAsNewRecipe(selectedRecipeId)
                setForkDismissed(true)
              }}
              className="border border-brew-200 text-brew-600 rounded-xl px-4 py-3 text-sm font-semibold
                         hover:bg-brew-50 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Save as New Recipe
            </button>
            <button
              onClick={() => setForkDismissed(true)}
              className="text-brew-400 text-xs mt-1 hover:text-brew-600 transition-colors"
            >
              Keep Original
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-6 w-full max-w-[260px]">
        <button
          onClick={onStartNewBrew}
          className="bg-brew-800 text-white rounded-xl px-8 py-3.5 text-sm font-semibold
                     hover:bg-brew-700 active:scale-[0.98] transition-all min-h-[44px]"
        >
          Start New Brew
        </button>
        <button
          onClick={onViewHistory}
          className="border border-brew-200 text-brew-600 rounded-xl px-8 py-3.5 text-sm font-semibold
                     hover:bg-brew-50 active:scale-[0.98] transition-all min-h-[44px]"
        >
          View in History
        </button>
      </div>
    </div>
  )
}

// ─── Main BrewScreen Component ──────────────────────────────
export default function BrewScreen({ equipment, beans, setBeans, recipes, setRecipes, initialBean, onBrewSaved, onBrewActiveChange, onNavigate, onFlowChange }) {

  const [phase, setPhase] = useState(() => initialBean ? 'recipe' : 'pick')
  const [selectedBean, setSelectedBean] = useState(initialBean || null)
  const [ratingBrew, setRatingBrew] = useState(null)   // Brew record being rated (set on Finish Brew or recovery)
  const [savedBrewState, setSavedBrewState] = useState(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState(null) // Tracks which recipe entity is active
  const [recipeWasAutoCreated, setRecipeWasAutoCreated] = useState(false) // True when linkRecipeToBrew auto-created (skip fork prompt)
  const [finalBrewState, setFinalBrewState] = useState(null) // Post-rating brew state for fork prompt
  const savingRef = useRef(false) // Double-tap guard for brew save

  const templates = useMemo(() => getPourTemplates(), [])

  // Pre-compute recipe previews for BeanPicker
  const beanPreviews = useMemo(() => {
    const formatPreview = (obj, timeField) => {
      const parts = []
      if (obj.coffeeGrams && obj.waterGrams) parts.push(`${obj.coffeeGrams}g / ${obj.waterGrams}g`)
      if (obj.grindSetting) parts.push(`grind ${obj.grindSetting}`)
      if (obj[timeField]) parts.push(formatTime(obj[timeField]))
      return parts.length > 0 ? parts.join(' \u00b7 ') : null
    }
    // Build last-brew-per-bean index in a single O(B) pass
    const brews = getBrews()
    const lastBrewByBean = new Map()
    for (const b of brews) {
      const key = normalizeName(b.beanName)
      if (key && !lastBrewByBean.has(key)) lastBrewByBean.set(key, b)
    }
    const map = new Map()
    for (const bean of beans) {
      const beanRecipes = (recipes || []).filter(r => r.beanId === bean.id)
        .sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''))
      const recipe = beanRecipes[0]
      if (recipe) {
        const preview = formatPreview(recipe, 'targetTime')
        if (preview) { map.set(bean.id, preview); continue }
      }
      const lastBrew = lastBrewByBean.get(normalizeName(bean.name))
      if (lastBrew) {
        const preview = formatPreview(lastBrew, 'totalTime')
        if (preview) map.set(bean.id, preview)
      }
    }
    return map
  }, [beans, recipes])

  // Build recipe defaults from equipment profile
  const getRecipeDefaults = useCallback(() => {
    const method = BREW_METHODS.find(m => m.id === equipment?.brewMethod) || BREW_METHODS[0]
    return {
      coffeeGrams: 15, waterGrams: 240, grindSetting: '', waterTemp: 200,
      targetTime: method.defaultTotalTime, targetTimeRange: '',
      targetTimeMin: null, targetTimeMax: null,
      steps: [], pourTemplateId: null,
      method: equipment?.brewMethod || 'v60',
      grinder: equipment?.grinder || 'fellow-ode',
      dripper: equipment?.dripper || 'ceramic',
      filterType: equipment?.filterType || 'paper-tabbed',
    }
  }, [equipment])

  // Build recipe form state from a recipe entity or defaults
  const buildRecipeFromEntity = useCallback((beanId) => {
    const defaults = getRecipeDefaults()
    if (!beanId) return { recipe: defaults, recipeId: null }

    // Look up recipes for this bean, sorted by lastUsedAt (most recent first)
    const beanRecipes = (recipes || []).filter(r => r.beanId === beanId)
    if (beanRecipes.length === 0) {
      // No recipe entity — auto-populate steps from default template
      const defaultTemplate = templates.find(t => t.id === 'standard-3pour-v60') || templates[0]
      if (defaultTemplate) {
        defaults.steps = structuredClone(defaultTemplate.steps)
        defaults.pourTemplateId = defaultTemplate.id
      }
      return { recipe: defaults, recipeId: null }
    }

    // Auto-select the most recently used recipe
    const sorted = [...beanRecipes].sort((a, b) => (b?.lastUsedAt || '').localeCompare(a?.lastUsedAt || ''))
    const selected = sorted[0]
    return {
      recipe: recipeEntityToFormState(selected, defaults),
      recipeId: selected.id,
    }
  }, [recipes, getRecipeDefaults, templates])

  // Recipe state — initialized lazily from recipe entity or defaults
  const [recipe, setRecipe] = useState(() => {
    const { recipe: r, recipeId } = buildRecipeFromEntity(selectedBean?.id)
    if (recipeId) setSelectedRecipeId(recipeId)
    return r
  })

  // Changes from last brew — scoped to recipe when available, else bean-level
  const changes = useMemo(() => {
    if (!selectedBean) return []
    const changesStr = selectedRecipeId
      ? getChangesForRecipe(selectedRecipeId)
      : getChangesForBean(selectedBean.name)
    if (!changesStr) return []
    return changesStr.split('\n').filter(s => s.trim())
  }, [selectedBean, selectedRecipeId])

  // When bean is selected from picker, reinitialize recipe from entity
  const handleBeanSelect = useCallback((bean) => {
    setSelectedBean(bean)
    const { recipe: r, recipeId } = buildRecipeFromEntity(bean.id)
    setRecipe(r)
    setSelectedRecipeId(recipeId)
    setPhase('recipe')
  }, [buildRecipeFromEntity])

  // Report flow state to parent (hides MobileNav during active flow phases)
  useEffect(() => {
    onFlowChange(phase !== 'pick' && phase !== 'success')
  }, [phase, onFlowChange])

  // Reset all flow state for a new brew
  const handleStartNewBrew = useCallback(() => {
    setSelectedBean(null)
    setRatingBrew(null)
    setSavedBrewState(null)
    setSelectedRecipeId(null)
    setRecipeWasAutoCreated(false)
    setFinalBrewState(null)
    setRecipe(getRecipeDefaults())
    savingRef.current = false
    setPhase('pick')
  }, [getRecipeDefaults])

  // Fork prompt handler: update existing recipe with brew's values
  const handleUpdateRecipeFromFork = useCallback((recipeId) => {
    if (!finalBrewState || !recipeId) return
    const fields = {}
    RECIPE_FIELDS.forEach(f => { if (finalBrewState[f] !== undefined) fields[f] = finalBrewState[f] })
    updateRecipe(recipeId, fields)
    setRecipes(getRecipes())
  }, [finalBrewState, setRecipes])

  // Shared helper: save a copy of an existing recipe with new field values
  const saveRecipeAsNewCopy = useCallback((recipeId, recipeFields, { linkBrewId } = {}) => {
    if (!selectedBean?.id) return null
    const sourceRecipe = (recipes || []).find(r => r.id === recipeId)
    if (!sourceRecipe) return null
    const beanRecipes = (recipes || []).filter(r => r.beanId === selectedBean.id)
    const newName = generateRecipeCopyName(sourceRecipe.name, beanRecipes)
    const newRecipe = saveRecipe({
      beanId: selectedBean.id,
      name: newName,
      ...recipeFields,
      lastUsedAt: new Date().toISOString(),
    })
    if (newRecipe && linkBrewId) {
      updateBrew(linkBrewId, { recipeId: newRecipe.id })
    }
    setRecipes(getRecipes())
    return newRecipe
  }, [selectedBean, recipes, setRecipes])

  // Fork prompt handler: save as new recipe from brew's values
  const handleSaveAsNewFromFork = useCallback((recipeId) => {
    if (!finalBrewState) return
    const fields = {}
    RECIPE_FIELDS.forEach(f => { if (finalBrewState[f] !== undefined) fields[f] = finalBrewState[f] })
    saveRecipeAsNewCopy(recipeId, fields, { linkBrewId: ratingBrew?.id })
  }, [finalBrewState, ratingBrew, saveRecipeAsNewCopy])

  // Build a brew record from current recipe + bean state
  // recipeOverrides: flushed edits that haven't hit React state yet (e.g., target time
  // from commitTargetTimeInputs). Merged into recipe for snapshot + top-level fields.
  // Needed for "Log without timer" path where buildBrewRecord runs in the same tick.
  const buildBrewRecord = useCallback((overrides = {}, recipeOverrides = {}) => {
    const mergedRecipe = { ...recipe, ...recipeOverrides }
    const totalDuration = getTotalDuration(mergedRecipe.steps)
    const recipeSnapshot = formStateToRecipeFields(mergedRecipe)
    return {
      id: uuidv4(),
      schemaVersion: 2,
      isManualEntry: false,
      recipeId: selectedRecipeId || null,
      beanName: selectedBean.name.trim(),
      roaster: selectedBean.roaster || '',
      roastDate: selectedBean.roastDate || '',
      recipeSnapshot,
      // Top-level recipe fields (backward compat — sourced from recipeSnapshot)
      ...recipeSnapshot,
      // Override snapshot fields that differ at top level
      targetTime: mergedRecipe.targetTime || totalDuration,
      targetTimeRange: mergedRecipe.targetTimeRange || formatTime(mergedRecipe.targetTime || totalDuration),
      targetTimeMin: mergedRecipe.targetTimeMin || null,
      targetTimeMax: mergedRecipe.targetTimeMax || null,
      steps: mergedRecipe.steps.map(s => ({ ...s })),
      // Brew execution fields
      timeStatus: null,
      totalTime: null,
      stepResults: null,
      // Tasting fields
      flavors: [], body: '', rating: null, issues: [], notes: '', nextBrewChanges: '',
      brewedAt: new Date().toISOString(),
      ...overrides,
    }
  }, [recipe, selectedBean, selectedRecipeId])

  // Auto-create or update recipe on brew save
  const linkRecipeToBrew = useCallback((brew) => {
    const now = new Date().toISOString()
    if (selectedRecipeId) {
      // Existing recipe — update lastUsedAt
      updateRecipe(selectedRecipeId, { lastUsedAt: now })
      setRecipes(getRecipes())
      return selectedRecipeId
    }
    // No existing recipe — auto-create from current recipe state
    if (selectedBean?.id) {
      const newRecipe = saveRecipe({
        beanId: selectedBean.id,
        name: getMethodName(recipe.method),
        ...formStateToRecipeFields(recipe),
        lastUsedAt: now,
      })
      if (!newRecipe) return null // write failed — skip recipe linking
      setSelectedRecipeId(newRecipe.id)
      setRecipeWasAutoCreated(true)
      setRecipes(getRecipes())
      return newRecipe.id
    }
    return null
  }, [selectedRecipeId, selectedBean, recipe, setRecipes])

  // Handle "Finish Brew" — construct brew record, save immediately, transition to rate
  const handleFinishBrew = useCallback((data) => {
    if (savingRef.current) return
    savingRef.current = true
    const { elapsed, tappedSteps, skippedSteps } = data

    const stepResults = {}
    recipe.steps.forEach(step => {
      const tappedAt = tappedSteps[step.id]
      stepResults[step.id] = {
        tappedAt: tappedAt != null ? tappedAt : null,
        skipped: !!skippedSteps[step.id],
        variance: tappedAt != null ? tappedAt - step.time : null,
      }
    })

    const totalDuration = getTotalDuration(recipe.steps)
    const timeResult = computeTimeStatus(elapsed, recipe.targetTimeMin, recipe.targetTimeMax, recipe.targetTime, totalDuration)

    // Normalize 'approaching' → 'on-target' at persist time (approaching is transient, only meaningful during live timer)
    const persistedStatus = timeResult?.status === 'approaching' ? 'on-target' : (timeResult?.status || null)
    const brew = buildBrewRecord({
      totalTime: elapsed,
      stepResults,
      timeStatus: persistedStatus,
    })

    // Link recipe (create if needed) and stamp recipeId on brew
    const recipeId = linkRecipeToBrew(brew)
    if (recipeId) brew.recipeId = recipeId

    // Clear active brew BEFORE saving to prevent duplicate-on-crash (053)
    clearActiveBrew()
    const updatedBrews = saveBrew(brew)
    onBrewSaved(updatedBrews)

    // Persist for crash recovery during rating
    saveActiveBrew({ phase: 'rate', brewId: brew.id, beanName: selectedBean.name, recipeId, recipe })

    setRatingBrew(brew)
    setSavedBrewState(null)
    setPhase('rate')
  }, [recipe, selectedBean, onBrewSaved, buildBrewRecord, linkRecipeToBrew])

  // Handle "Log without timer" — skip-timer brew, save immediately, transition to rate.
  // timeOverrides: flushed target time fields from RecipeAssembly (React batching workaround).
  const handleLogWithoutTimer = useCallback((timeOverrides = {}) => {
    if (savingRef.current) return
    savingRef.current = true
    const brew = buildBrewRecord({ isManualEntry: true }, timeOverrides)

    // Link recipe (create if needed) and stamp recipeId on brew
    const recipeId = linkRecipeToBrew(brew)
    if (recipeId) brew.recipeId = recipeId

    const updatedBrews = saveBrew(brew)
    onBrewSaved(updatedBrews)

    // Persist for crash recovery during rating (parity with handleFinishBrew)
    saveActiveBrew({ phase: 'rate', brewId: brew.id, beanName: selectedBean.name, recipeId, recipe })

    setRatingBrew(brew)
    setSavedBrewState(null)
    setPhase('rate')
  }, [buildBrewRecord, onBrewSaved, selectedBean, recipe, linkRecipeToBrew])

  // Persist active brew state to localStorage
  const persistState = useCallback((brewState) => {
    saveActiveBrew({
      ...brewState,
      beanId: selectedBean?.id,
      beanName: selectedBean?.name,
      recipeId: selectedRecipeId,
      recipe,
    })
  }, [selectedBean, selectedRecipeId, recipe])

  // Check for in-progress brew on mount
  useEffect(() => {
    const active = getActiveBrew()
    if (active && active.beanName) {
      if (active.phase === 'rate' && active.brewId) {
        // Recovery into rating screen — brew already saved
        const brew = getBrews().find(b => b.id === active.brewId)
        const bean = beans.find(b => normalizeName(b.name) === normalizeName(active.beanName))
        if (brew && bean) {
          setSelectedBean(bean)
          setRatingBrew(brew)
          setPhase('rate')
        } else {
          clearActiveBrew()
        }
      } else {
        // Recovery into active brew (timer)
        const resume = window.confirm(`Resume brew in progress for ${active.beanName}?`)
        if (resume) {
          const bean = beans.find(b => normalizeName(b.name) === normalizeName(active.beanName))
          if (bean) {
            setSelectedBean(bean)
            setRecipe(active.recipe)
            if (active.recipeId) setSelectedRecipeId(active.recipeId)
            setSavedBrewState(active)
            setPhase('brew')
          }
        } else {
          clearActiveBrew()
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // beforeunload guard during active brew
  useEffect(() => {
    if (phase !== 'brew') return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  return (
    <div>
      {phase === 'pick' && (
        <BeanPicker beans={beans} previews={beanPreviews} onSelect={handleBeanSelect} onNavigate={onNavigate} />
      )}

      {phase === 'recipe' && selectedBean && (
        <RecipeAssembly
          bean={selectedBean}
          recipe={recipe}
          setRecipe={setRecipe}
          changes={changes}
          beanRecipes={(recipes || []).filter(r => r.beanId === selectedBean.id)}
          selectedRecipeId={selectedRecipeId}
          templates={templates}
          onRecipeSelect={(recipeEntity) => {
            if (recipeEntity === null) {
              // "+ New Recipe" — reset to defaults
              setSelectedRecipeId(null)
              setRecipe(getRecipeDefaults())
            } else if (recipeEntity._isStarter) {
              // Starter recipe (template) — pre-fill steps + defaults, no recipe entity yet
              setSelectedRecipeId(null)
              const defaults = getRecipeDefaults()
              const steps = normalizeSteps(recipeEntity.steps || [])
              setRecipe({ ...defaults, steps })
            } else {
              // Select an existing recipe
              setSelectedRecipeId(recipeEntity.id)
              setRecipe(recipeEntityToFormState(recipeEntity, getRecipeDefaults()))
            }
          }}
          onStartBrew={() => setPhase('brew')}
          onLogWithoutTimer={handleLogWithoutTimer}
          onBack={() => setPhase('pick')}
          onRecipeRenamed={(recipeId, newName) => {
            updateRecipe(recipeId, { name: newName })
            setRecipes(getRecipes())
          }}
        />
      )}

      {phase === 'brew' && (
        <ActiveBrew
          recipe={recipe}
          onFinish={handleFinishBrew}
          onBrewActiveChange={onBrewActiveChange}
          persistState={persistState}
          savedBrewState={savedBrewState}
        />
      )}

      {phase === 'rate' && ratingBrew && selectedBean && (
        <RateThisBrew
          brew={ratingBrew}
          bean={selectedBean}
          onComplete={(finalBrew) => {
            setFinalBrewState(finalBrew)
            setPhase('success')
          }}
          onBrewUpdated={onBrewSaved}
          setBeans={setBeans}
        />
      )}

      {phase === 'success' && (
        <BrewSuccess
          brew={finalBrewState}
          selectedRecipeId={selectedRecipeId}
          recipes={recipes}
          recipeWasAutoCreated={recipeWasAutoCreated}
          onStartNewBrew={handleStartNewBrew}
          onViewHistory={() => onNavigate('history')}
          onUpdateRecipe={handleUpdateRecipeFromFork}
          onSaveAsNewRecipe={handleSaveAsNewFromFork}
        />
      )}
    </div>
  )
}
