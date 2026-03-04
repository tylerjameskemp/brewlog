import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  getBrews, getLastBrewOfBean, getChangesForBean, getChangesForRecipe,
  normalizeSteps, formatTime, parseTime, parseTimeRange, formatTimeRange,
  computeTimeStatus, getPourTemplates, saveBrew, updateBrew, getBeans,
  updateBean, saveActiveBrew, getActiveBrew, clearActiveBrew,
  normalizeName, getRecipes, getRecipesForBean, saveRecipe, updateRecipe,
  RECIPE_FIELDS, recipeEntityToFormState, formStateToRecipeFields,
} from '../data/storage'
import { getMethodName } from '../data/defaults'
import { BREW_METHODS, GRINDERS, FELLOW_ODE_POSITIONS, DRIPPER_MATERIALS, FILTER_TYPES, BODY_OPTIONS, RATING_SCALE, BREW_ISSUES } from '../data/defaults'
import FlavorPicker from './FlavorPicker'
import useTimer from '../hooks/useTimer'
import useWakeLock from '../hooks/useWakeLock'

// ============================================================
// BREW SCREEN — Guided brewing experience
// ============================================================
// Phase state machine: pick → recipe → brew → rate → success
// pick:    Bean picker (if no bean pre-selected)
// recipe:  Recipe Assembly — review, adjust, select pour template
// brew:    Active Brew — timer, step teleprompter, variance tracking
// rate:    Rate This Brew — tasting notes, correct actuals, "what to try next"
// success: Done — start new brew or view history

const ratio = (c, w) => c > 0 ? `1:${(w / c).toFixed(1)}` : '—'

const getTotalDuration = (steps) =>
  steps.length > 0
    ? steps[steps.length - 1].time + steps[steps.length - 1].duration
    : 210

// ─── Swipe Cards ────────────────────────────────────────────
function SwipeCards({ cards, currentIndex, onSwipe }) {
  const startX = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState(0)

  const handleStart = (e) => {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX
    setDragging(true)
  }
  const handleMove = (e) => {
    if (!dragging) return
    const x = e.touches ? e.touches[0].clientX : e.clientX
    setOffset(x - startX.current)
  }
  const handleEnd = () => {
    setDragging(false)
    if (Math.abs(offset) > 60) {
      onSwipe(offset < 0 ? 1 : -1)
    }
    setOffset(0)
  }

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={dragging ? handleMove : undefined}
      onMouseUp={handleEnd}
    >
      <div
        className={dragging ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'}
        style={{ display: 'flex', transform: `translateX(calc(${-currentIndex * 100}% + ${offset}px))` }}
      >
        {cards.map((card, i) => (
          <div key={i} className="min-w-full px-4 box-border">
            {card}
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {cards.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
              i === currentIndex ? 'w-5 bg-brew-500' : 'w-1.5 bg-brew-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Phase Indicator ────────────────────────────────────────
function PhaseIndicator({ phase }) {
  const phases = ['recipe', 'brew', 'rate']
  return (
    <div className="flex gap-1.5 px-5 py-3">
      {phases.map((p, i) => (
        <div
          key={p}
          className={`flex-1 h-0.5 rounded-full transition-colors duration-500 motion-reduce:transition-none ${
            i <= phases.indexOf(phase) ? 'bg-brew-500' : 'bg-brew-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Phase 0: Bean Picker ───────────────────────────────────
function BeanPicker({ beans, onSelect }) {
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
                   focus:outline-none focus:border-brew-500 mb-4"
      />

      {filtered.length === 0 && (
        <div className="text-center py-12 text-brew-400">
          {beans.length === 0
            ? 'No beans in your library yet. Add some from the Beans tab!'
            : 'No beans match your search.'}
        </div>
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
              <div>
                <div className="font-semibold text-brew-800">{bean.name}</div>
                <div className="text-sm text-brew-400 mt-0.5">{bean.roaster || 'Unknown roaster'}</div>
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
function RecipeAssembly({ bean, recipe, setRecipe, changes, templates, onStartBrew, onLogWithoutTimer, onBack, onBeanUpdate, equipment, beanRecipes, selectedRecipeId, onRecipeSelect, onSaveToRecipe }) {

  const [cardIndex, setCardIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(recipe.pourTemplateId || templates[0]?.id || null)
  const [showRecipePicker, setShowRecipePicker] = useState(false)
  const [templatePicked, setTemplatePicked] = useState(() => recipe.steps.length > 0 || !!recipe.pourTemplateId)
  const [beanOverrides, setBeanOverrides] = useState({})
  const [targetTimeInput, setTargetTimeInput] = useState(
    () => recipe.targetTimeRange || formatTime(recipe.targetTime)
  )

  const [equipmentOpen, setEquipmentOpen] = useState(false)

  const grinder = GRINDERS.find(g => g.id === recipe.grinder) || GRINDERS[0]
  const methodObj = BREW_METHODS.find(m => m.id === recipe.method) || BREW_METHODS[0]
  const displayBean = Object.keys(beanOverrides).length > 0 ? { ...bean, ...beanOverrides } : bean

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

  const commitTargetTimeInputs = () => {
    const range = parseTimeRange(targetTimeInput)
    if (!range) return
    setRecipe(prev => ({
      ...prev,
      targetTimeMin: range.min,
      targetTimeMax: range.max,
      targetTime: Math.round((range.min + range.max) / 2),
      targetTimeRange: formatTimeRange(range.min, range.max),
    }))
    setTargetTimeInput(formatTimeRange(range.min, range.max))
  }

  const handleDoneEditing = () => {
    commitTargetTimeInputs()
    setEditing(false)
    if (Object.keys(beanOverrides).length > 0) {
      onBeanUpdate(beanOverrides)
      setBeanOverrides({})
    }
  }


  const handleSwipe = (dir) => {
    setCardIndex(prev => Math.max(0, Math.min(2, prev + dir)))
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplateId(template?.id ?? null)
    setRecipe(prev => ({
      ...prev,
      steps: template?.steps ?? [],
      pourTemplateId: template?.id ?? null,
    }))
    setTemplatePicked(true)
  }

  const updateField = (field, value) => {
    if (typeof value === 'number' && isNaN(value)) return // NaN guard for numeric inputs
    setRecipe(prev => ({ ...prev, [field]: value }))
  }

  const updateStep = (stepIndex, field, value) => {
    if (typeof value === 'number' && isNaN(value)) return
    setRecipe(prev => {
      const updatedSteps = prev.steps.map((s, i) => i === stepIndex ? { ...s, [field]: value } : s)
      // Recalculate start times when duration changes
      if (field === 'duration') {
        for (let i = 1; i < updatedSteps.length; i++) {
          updatedSteps[i] = { ...updatedSteps[i], time: updatedSteps[i - 1].time + updatedSteps[i - 1].duration }
        }
      }
      return { ...prev, steps: updatedSteps }
    })
  }


  const essentialsCard = (
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
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          { label: 'Coffee', value: `${recipe.coffeeGrams}g`, field: 'coffeeGrams', type: 'number', min: 1, max: 100 },
          { label: 'Water', value: `${recipe.waterGrams}g`, field: 'waterGrams', type: 'number', min: 1, max: 2000 },
          { label: 'Ratio', value: ratio(recipe.coffeeGrams, recipe.waterGrams) },
        ].map(item => (
          <div key={item.label} className="text-center p-3 bg-brew-50 rounded-xl">
            <div className="text-[11px] text-brew-400 uppercase tracking-wider mb-1">{item.label}</div>
            {editing && item.field ? (
              <input
                type={item.type}
                value={recipe[item.field]}
                onChange={e => updateField(item.field, Number(e.target.value))}
                min={item.min} max={item.max}
                className="w-full text-center text-lg font-medium text-brew-800 bg-transparent
                           border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
              />
            ) : (
              <div className="text-lg font-medium text-brew-800">{item.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Grind / Temp */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="text-center p-3 bg-brew-50 rounded-xl">
          <div className="text-[11px] text-brew-400 uppercase tracking-wider mb-1">Grind</div>
          {editing ? (
            grinder.settingType === 'ode' ? (
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
            )
          ) : (
            <div className="text-sm font-medium text-brew-800">{recipe.grindSetting || '—'}</div>
          )}
        </div>
        <div className="text-center p-3 bg-brew-50 rounded-xl">
          <div className="text-[11px] text-brew-400 uppercase tracking-wider mb-1">Temp</div>
          {editing ? (
            <input
              type="number"
              value={recipe.waterTemp}
              onChange={e => updateField('waterTemp', Number(e.target.value))}
              min={32} max={212}
              className="w-full text-center text-sm font-medium text-brew-800 bg-transparent
                         border-b border-brew-300 focus:outline-none text-base"
            />
          ) : (
            <div className="text-sm font-medium text-brew-800">{recipe.waterTemp ? `${recipe.waterTemp}°F` : '—'}</div>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="text-[11px] text-brew-400 uppercase tracking-wider mb-1">Target Time</div>
        {editing ? (
          <input
            type="text"
            value={targetTimeInput}
            onChange={e => setTargetTimeInput(e.target.value)}
            onBlur={handleTargetTimeBlur}
            placeholder="3:00 - 3:30"
            maxLength={15}
            className="w-32 mx-auto text-center text-lg font-medium text-brew-800 bg-transparent
                       border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base block"
          />
        ) : (
          <div className="text-brew-800 font-medium">
            {recipe.targetTimeRange || formatTime(recipe.targetTime)}
          </div>
        )}
      </div>
    </div>
  )

  const stepsCard = (
    <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-brew-800 mb-4">Brew Steps</h3>
      <div className="flex flex-col gap-2.5">
        {recipe.steps.map((step, i) => (
          <div key={step.id} className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-brew-50 text-brew-500 flex items-center
                            justify-center text-xs font-semibold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm text-brew-800">{step.name}</span>
                {editing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={step.duration}
                      onChange={e => updateStep(i, 'duration', Number(e.target.value))}
                      className="w-12 text-center text-brew-800 bg-transparent
                                 border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
                    />
                    <span className="text-xs text-brew-400">sec</span>
                  </div>
                ) : (
                  <span className="text-xs text-brew-400">
                    {formatTime(step.time)} → {formatTime(step.time + step.duration)}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-1 flex-wrap items-center">
                {editing ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-brew-400">→</span>
                      <input
                        type="number"
                        value={step.waterTo ?? ''}
                        onChange={e => updateStep(i, 'waterTo', e.target.value ? Number(e.target.value) : null)}
                        placeholder="—"
                        className="w-12 text-center text-brew-500 font-medium bg-transparent
                                   border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
                      />
                      <span className="text-xs text-brew-400">g</span>
                    </div>
                    <input
                      type="text"
                      value={step.note || ''}
                      onChange={e => updateStep(i, 'note', e.target.value)}
                      placeholder="Note..."
                      className="flex-1 min-w-[80px] text-brew-400 bg-transparent
                                 border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
                    />
                  </>
                ) : (
                  <>
                    {step.waterTo != null && (
                      <span className="text-xs text-brew-500 font-medium">↑ {step.waterTo}g</span>
                    )}
                    <span className="text-xs text-brew-400">{step.note}</span>
                  </>
                )}

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const originCard = (
    <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-brew-800 mb-4">Origin Details</h3>
      {[
        { label: 'Origin', value: displayBean.origin, field: 'origin' },
        { label: 'Process', value: displayBean.process, field: 'process' },
        { label: 'Roaster', value: displayBean.roaster, field: 'roaster' },
      ].map(item => (
        <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-brew-50 text-sm last:border-0">
          <span className="text-brew-400">{item.label}</span>
          {editing ? (
            <input
              type="text"
              value={item.value || ''}
              onChange={e => setBeanOverrides(prev => ({ ...prev, [item.field]: e.target.value }))}
              placeholder="—"
              className="text-right font-medium text-brew-800 bg-transparent w-1/2
                         border-b border-brew-300 focus:outline-none focus:border-brew-500 text-base"
            />
          ) : (
            <span className="font-medium text-brew-800">{item.value || '—'}</span>
          )}

        </div>
      ))}
    </div>
  )

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
          <div className="text-[11px] text-brew-400 uppercase tracking-widest">Recipe</div>
        </div>
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-brew-800">Prepare Your Brew</h1>
          <button
            onClick={() => editing ? handleDoneEditing() : setEditing(true)}

            className="border border-brew-200 rounded-lg px-3 py-1.5 text-xs text-brew-400
                       hover:bg-brew-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Recipe Indicator */}
      {beanRecipes.length > 0 && (
        <div className="px-4 mt-3">
          <button
            onClick={() => beanRecipes.length > 1 ? setShowRecipePicker(!showRecipePicker) : null}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        border transition-all min-h-[32px] ${
              beanRecipes.length > 1
                ? 'border-brew-300 bg-brew-50 text-brew-600 hover:border-brew-400 cursor-pointer'
                : 'border-brew-200 bg-brew-50/50 text-brew-500 cursor-default'
            }`}
          >
            <span>{beanRecipes.find(r => r.id === selectedRecipeId)?.name || 'Recipe'}</span>
            {beanRecipes.length > 1 && (
              <span className={`transition-transform ${showRecipePicker ? 'rotate-180' : ''}`}>{'\u25BE'}</span>
            )}
          </button>

          {/* Recipe Picker Dropdown */}
          {showRecipePicker && (
            <div className="mt-2 bg-white border border-brew-200 rounded-xl shadow-sm overflow-hidden
                            animate-fade-in motion-reduce:animate-none">
              {beanRecipes.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    onRecipeSelect(r)
                    setShowRecipePicker(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-brew-100 last:border-b-0
                              transition-colors min-h-[44px] ${
                    r.id === selectedRecipeId
                      ? 'bg-brew-50 text-brew-700 font-medium'
                      : 'text-brew-600 hover:bg-brew-50'
                  }`}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-brew-400 mt-0.5">
                    {r.coffeeGrams}g / {r.waterGrams}g · grind {r.grindSetting || '—'}
                  </div>
                </button>
              ))}
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

      {/* Changes from last brew */}
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

      {/* Template Picker (new beans with no prior brews) */}
      {!templatePicked ? (
        <div className="px-4 mt-4">
          <div className="text-sm font-medium text-brew-700 mb-1">Choose a pour template</div>
          <div className="text-xs text-brew-400 mb-3">Pick a starting recipe, or go custom</div>
          <div className="space-y-2">
            {templates.map(t => {
              const totalWater = t.steps.reduce((max, s) => Math.max(max, s.waterTo || 0), 0)
              return (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left p-4 rounded-2xl border border-brew-200
                             bg-white shadow-sm hover:bg-brew-50 hover:border-brew-400
                             active:scale-[0.99] transition-all min-h-[44px]"
                >
                  <div className="font-medium text-brew-800 text-sm">{t.name}</div>
                  <div className="text-xs text-brew-400 mt-1">
                    {t.steps.length} steps · {totalWater}g total water
                  </div>
                </button>
              )
            })}
            <button
              onClick={() => handleTemplateSelect(null)}
              className="w-full text-left p-4 rounded-2xl border border-dashed border-brew-300
                         bg-brew-50/50 shadow-sm hover:bg-brew-50 hover:border-brew-400
                         active:scale-[0.99] transition-all min-h-[44px]"
            >
              <div className="font-medium text-brew-600 text-sm">Custom</div>
              <div className="text-xs text-brew-400 mt-1">Timer only — no step guidance</div>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Swipeable Cards */}
          <div className="mt-4">
            <SwipeCards cards={[essentialsCard, stepsCard, originCard]} currentIndex={cardIndex} onSwipe={handleSwipe} />
          </div>

          {/* Pour Template Selector */}
          {templates.length > 0 && (
            <div className="px-4 mt-4">
              <div className="text-[11px] text-brew-400 uppercase tracking-widest mb-2">Pour Templates</div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm border transition-all
                                min-h-[44px] shrink-0 ${
                      t.id === selectedTemplateId
                        ? 'bg-brew-50 border-brew-500 text-brew-500 font-semibold'
                        : 'bg-white border-brew-200 text-brew-400'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Revert to template — shown when returning bean has modified steps */}
          {(() => {
            const originalTemplate = recipe.pourTemplateId
              ? templates.find(t => t.id === recipe.pourTemplateId)
              : null
            const stepsMatch = originalTemplate && originalTemplate.steps.length === recipe.steps.length &&
              originalTemplate.steps.every((s, i) => s.name === recipe.steps[i].name && s.waterTo === recipe.steps[i].waterTo &&
                s.time === recipe.steps[i].time && s.duration === recipe.steps[i].duration)
            if (originalTemplate && !stepsMatch) {
              return (
                <div className="px-4 mt-2">
                  <button
                    onClick={() => {
                      setRecipe(prev => ({
                        ...prev,
                        steps: structuredClone(originalTemplate.steps),
                        pourTemplateId: originalTemplate.id,
                      }))
                      setSelectedTemplateId(originalTemplate.id)
                    }}
                    className="text-xs text-brew-500 hover:text-brew-700 underline min-h-[44px]"
                  >
                    Revert steps to {originalTemplate.name}
                  </button>
                </div>
              )
            }
            if (!recipe.pourTemplateId && recipe.steps.length > 0) {
              return (
                <div className="px-4 mt-2">
                  <button
                    onClick={() => setTemplatePicked(false)}
                    className="text-xs text-brew-500 hover:text-brew-700 underline min-h-[44px]"
                  >
                    Choose a pour template
                  </button>
                </div>
              )
            }
            return null
          })()}

          {/* Equipment Section */}
          <div className="px-4 mt-4">
            <button
              onClick={() => setEquipmentOpen(!equipmentOpen)}
              className="w-full flex items-center justify-between py-2 min-h-[44px]"
            >
              <div className="text-[11px] text-brew-400 uppercase tracking-widest">Equipment</div>
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
                  <div className="text-[11px] text-brew-400 mb-1.5">Method</div>
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
                    <div className="text-[11px] text-brew-400 mb-1.5">Dripper</div>
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
                  <div className="text-[11px] text-brew-400 mb-1.5">Grinder</div>
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
                  <div className="text-[11px] text-brew-400 mb-1.5">Filter</div>
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

          {/* Save to Recipe — shown when form values differ from loaded recipe */}
          {selectedRecipeId && onSaveToRecipe && (() => {
            const loaded = beanRecipes.find(r => r.id === selectedRecipeId)
            if (!loaded) return null
            const differs = RECIPE_FIELDS.some(f => {
              if (f === 'steps') return JSON.stringify(recipe[f]) !== JSON.stringify(loaded[f] || [])
              return recipe[f] !== loaded[f]
            })
            if (!differs) return null
            return (
              <div className="px-4 mt-3">
                <button
                  onClick={() => onSaveToRecipe(selectedRecipeId)}
                  className="w-full py-2.5 text-sm font-medium text-brew-600 border border-brew-300
                             rounded-xl hover:bg-brew-50 active:scale-[0.99] transition-all min-h-[44px]"
                >
                  Save changes to recipe
                </button>
              </div>
            )
          })()}

          {/* Brew This CTA */}
          <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-4 pb-safe
                          bg-gradient-to-t from-brew-50 via-brew-50 to-transparent pointer-events-none z-10">
            <button
              onClick={onStartBrew}
              className="w-full py-4 bg-brew-800 text-white rounded-2xl text-base font-semibold
                         shadow-lg hover:bg-brew-700 active:scale-[0.98] transition-all
                         pointer-events-auto min-h-[44px]"
            >
              Brew This
            </button>
            <button
              onClick={onLogWithoutTimer}
              className="w-full py-3 mt-2 text-brew-500 text-sm font-medium
                         hover:text-brew-700 pointer-events-auto min-h-[44px]"
            >
              Log without timer
            </button>
          </div>
        </>
      )}
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

  // Determine current step
  let currentStepIdx = 0
  for (let i = steps.length - 1; i >= 0; i--) {
    if (timer.elapsed >= steps[i].time && !skippedSteps[steps[i].id]) {
      currentStepIdx = i
      break
    }
  }

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
  const overTime = timer.elapsed > targetMax

  // top-12/md:top-14 must match Header h-12/md:h-14 in Header.jsx
  return (
    <div className="fixed top-12 md:top-14 left-0 right-0 bottom-0 flex flex-col bg-white z-10">
      {/* Pinned timer area */}
      <div className="bg-white shadow-md shrink-0">
        {/* Timer Display */}
        <div className="px-5 pt-6 pb-3">
          <div className="flex items-baseline justify-between">
            <div className={`font-mono text-7xl font-medium leading-none tabular-nums tracking-tight ${
              overTime ? 'text-red-600' : 'text-gray-900'
            }`}>
              {formatTime(timer.elapsed)}
            </div>
            <div className="text-sm text-brew-400">
              Target: {recipe.targetTimeRange || formatTime(recipe.targetTime)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-1000 linear ${
                overTime ? 'bg-red-500' : 'bg-brew-500'
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

      {/* Step Teleprompter */}
      <div ref={stepsContainerRef} className="flex-1 px-4 pb-36 overflow-y-auto">
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIdx && hasStarted
          const skipped = skippedSteps[step.id]
          const isPast = hasStarted && (timer.elapsed >= step.time + step.duration || skipped)
          const isFuture = !isCurrent && !isPast
          const isNext = isFuture && i === currentStepIdx + 1 && hasStarted
          const tappedAt = tappedSteps[step.id]
          const variance = tappedAt !== undefined ? tappedAt - step.time : null

          // Past steps (not skipped) collapse to a compact single line
          if (isPast && !skipped) {
            return (
              <div
                key={step.id}
                ref={el => (stepRefs.current[step.id] = el)}
                className="py-2 px-3 mb-1 rounded-lg bg-gray-50 animate-fade-in
                           motion-reduce:animate-none"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-xs">✓</span>
                    <span className="text-sm text-gray-400">{step.name}</span>
                  </div>
                  <span className="text-xs tabular-nums text-gray-300">
                    {tappedAt !== undefined ? formatTime(tappedAt) : formatTime(step.time)}
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div
              key={step.id}
              ref={el => (stepRefs.current[step.id] = el)}
              onClick={() => timer.running && !isPast && !skipped && handleTapStep(step)}
              className={`p-3 mb-1.5 rounded-lg relative transition-[background-color,color,opacity,border-color,box-shadow] duration-400 min-h-[44px]
                          motion-reduce:transition-none ${
                skipped
                  ? 'bg-gray-50 text-gray-300 line-through opacity-40'
                  : isCurrent
                    ? 'bg-amber-50 border-l-4 border-l-brew-600 text-brew-900 shadow-sm'
                    : 'bg-white border border-gray-100'
              } ${hasStarted && isFuture ? (isNext ? 'opacity-70' : 'opacity-40') : ''
              } ${timer.running && !isPast && !skipped ? 'cursor-pointer' : ''
              }`}
            >
              {/* Skip button */}
              {timer.running && !isPast && !skipped && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSkipStep(step) }}
                  className="absolute top-1 right-1 text-base px-2 py-1 leading-none
                              min-h-[44px] min-w-[44px] flex items-center justify-center text-brew-300"
                  aria-label={`Skip ${step.name}`}
                >
                  ✕
                </button>
              )}

              <div className="flex justify-between items-center pr-8">
                <div className="flex items-center gap-2.5">
                  <span className={`text-sm ${isCurrent ? 'font-bold' : 'font-semibold'}`}>{step.name}</span>
                  {step.waterTo != null && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md text-brew-500 bg-brew-50">
                      → {step.waterTo}g
                    </span>
                  )}
                </div>
                <span className="text-sm tabular-nums">{formatTime(step.time)}</span>
              </div>

              <div className="text-sm mt-1.5 opacity-80 leading-snug">{step.note}</div>

              {/* Variance indicator */}
              {variance !== null && !skipped && (
                <div className={`mt-1.5 text-[11px] font-semibold ${
                  Math.abs(variance) <= 3 ? 'text-green-600' : 'text-amber-500'
                }`}>
                  Tapped at {formatTime(tappedAt)} ({variance > 0 ? '+' : ''}{variance}s)
                </div>
              )}

              {/* Tap prompt — only while running (user can't tap during pause) */}
              {isCurrent && timer.running && tappedAt === undefined && !skipped && (
                <div className="mt-2 text-[11px] text-brew-400">
                  Tap when you start this step
                </div>
              )}
            </div>
          )
        })}
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
            className="w-full py-4 bg-brew-500 text-white rounded-2xl text-base font-semibold
                       shadow-lg hover:bg-brew-600 active:scale-[0.98] transition-all
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
  const [totalTimeStr, setTotalTimeStr] = useState(brew.totalTime != null ? formatTime(brew.totalTime) : '')
  const savingRef = useRef(false)

  const isManual = brew.isManualEntry === true
  const steps = brew.recipeSteps || []
  const stepResults = brew.stepResults || {}

  // Compute time status for display
  const totalDuration = getTotalDuration(steps)
  const timeResult = computeTimeStatus(brew.totalTime, brew.targetTimeMin, brew.targetTimeMax, brew.targetTime, totalDuration)

  const handleDone = () => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const parsedTime = parseTime(totalTimeStr)
      const updates = {
        flavors,
        body,
        rating,
        issues,
        notes,
        nextBrewChanges,
        grindSetting,
        totalTime: parsedTime ?? brew.totalTime,
      }

      // Recompute timeStatus if totalTime was corrected
      if (parsedTime != null && parsedTime !== brew.totalTime) {
        const newTimeResult = computeTimeStatus(parsedTime, brew.targetTimeMin, brew.targetTimeMax, brew.targetTime, totalDuration)
        updates.timeStatus = newTimeResult?.status || null
      }

      const updatedBrews = updateBrew(brew.id, updates)
      onBrewUpdated(updatedBrews)

      // Update bean with "what to try next"
      if (nextBrewChanges.trim() && bean?.id) {
        updateBean(bean.id, { lastBrewChanges: nextBrewChanges.trim() })
        setBeans(getBeans())
      }

      clearActiveBrew()
      onComplete()
    } finally {
      savingRef.current = false
    }
  }

  return (
    <div className="px-4 pt-4 pb-28">
      {/* Summary */}
      <div className="text-center mb-6">
        <div className="text-[11px] text-brew-400 uppercase tracking-widest mb-1">
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

            return (
              <div
                key={step.id}
                className={`flex justify-between items-center py-2.5 border-b border-brew-50
                            last:border-0 ${skipped ? 'opacity-40' : ''}`}
              >
                <div>
                  <span className={`font-semibold text-sm ${skipped ? 'line-through' : ''} text-brew-800`}>
                    {step.name}
                  </span>
                  {skipped && <span className="text-[11px] text-red-500 ml-2">Skipped</span>}
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums text-brew-800">
                    {skipped ? '—' : tappedAt != null ? formatTime(tappedAt) : formatTime(step.time)}
                  </div>
                  {variance != null && !skipped && (
                    <div className={`text-[11px] font-semibold ${
                      Math.abs(variance) <= 3 ? 'text-green-600' : 'text-amber-500'
                    }`}>
                      {variance > 0 ? '+' : ''}{variance}s
                    </div>
                  )}
                  {!skipped && tappedAt == null && (
                    <div className="text-[11px] text-brew-300">as planned</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Correct Actuals */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-1">
          {isManual ? 'Brew Details' : 'Correct Actuals'}
        </h3>
        <p className="text-xs text-brew-400 mb-3">
          {isManual ? 'Enter the details for this brew.' : 'Adjust if the actual values differed from planned.'}
        </p>
        {isManual && (
          <div className="mb-3">
            <label className="text-xs text-brew-400 block mb-1">Total Brew Time</label>
            <input
              type="text"
              value={totalTimeStr}
              onChange={e => setTotalTimeStr(e.target.value)}
              placeholder="M:SS (e.g. 3:30)"
              className="w-full p-3 rounded-xl border border-brew-300 bg-brew-50
                         text-lg text-brew-800 font-mono text-center
                         focus:outline-none focus:border-brew-500 focus:ring-2 focus:ring-brew-400 text-base"
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
                         text-sm text-brew-800 focus:outline-none focus:border-brew-500 text-base"
            />
          </div>
          {!isManual && (
            <div>
              <label className="text-xs text-brew-400 block mb-1">Total Time</label>
              <input
                type="text"
                value={totalTimeStr}
                onChange={e => setTotalTimeStr(e.target.value)}
                placeholder="3:30"
                className="w-full p-2.5 rounded-xl border border-brew-200 bg-brew-50
                           text-sm text-brew-800 font-mono focus:outline-none focus:border-brew-500 text-base"
              />
            </div>
          )}
        </div>
      </div>

      {/* Brew Notes */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-1">Brew Notes</h3>
        <p className="text-xs text-brew-400 mb-2.5">What happened during this brew?</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Bed looked uneven after bloom, water temp dropped fast..."
          maxLength={2000}
          className="w-full min-h-[80px] p-3 rounded-xl border border-brew-200 bg-brew-50
                     text-sm text-brew-800 resize-y focus:outline-none focus:border-brew-500 text-base"
        />
      </div>

      {/* Changes for Next Brew */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-500 mb-1">Changes for Next Brew</h3>
        <p className="text-xs text-brew-400 mb-2.5">
          These notes will appear as suggestions next time you brew this bean.
        </p>
        <textarea
          value={nextBrewChanges}
          onChange={e => setNextBrewChanges(e.target.value)}
          placeholder="Try coarser grind, extend bloom to 45s..."
          maxLength={500}
          className="w-full min-h-[80px] p-3 rounded-xl border border-amber-200 bg-white
                     text-sm text-brew-800 resize-y focus:outline-none focus:border-brew-500 text-base"
        />
      </div>

      {/* Tasting — FlavorPicker, Body, Rating, Issues */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-3">Tasting</h3>

        {/* Flavors */}
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

// ─── Main BrewScreen Component ──────────────────────────────
export default function BrewScreen({ equipment, beans, setBeans, recipes, setRecipes, initialBean, onBrewSaved, onBrewActiveChange, onNavigate, onFlowChange }) {

  const [phase, setPhase] = useState(() => initialBean ? 'recipe' : 'pick')
  const [selectedBean, setSelectedBean] = useState(initialBean || null)
  const [ratingBrew, setRatingBrew] = useState(null)   // Brew record being rated (set on Finish Brew or recovery)
  const [savedBrewState, setSavedBrewState] = useState(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState(null) // Tracks which recipe entity is active

  const templates = useMemo(() => getPourTemplates(), [])

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
      // No recipe entity — fall back to last brew for backward compat during transition
      return { recipe: defaults, recipeId: null }
    }

    // Auto-select the most recently used recipe
    const sorted = [...beanRecipes].sort((a, b) => (b?.lastUsedAt || '').localeCompare(a?.lastUsedAt || ''))
    const selected = sorted[0]
    return {
      recipe: recipeEntityToFormState(selected, defaults),
      recipeId: selected.id,
    }
  }, [recipes, getRecipeDefaults])

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
    setRecipe(getRecipeDefaults())
    setPhase('pick')
  }, [getRecipeDefaults])

  // Update bean fields — batched, called once when editing completes
  const handleBeanUpdate = useCallback((overrides) => {
    setSelectedBean(prev => ({ ...prev, ...overrides }))
    if (selectedBean?.id) {
      const updated = updateBean(selectedBean.id, overrides)
      setBeans(updated)
    }
  }, [selectedBean, setBeans])


  // Build a brew record from current recipe + bean state
  const buildBrewRecord = useCallback((overrides = {}) => {
    const totalDuration = getTotalDuration(recipe.steps)
    const recipeSnapshot = formStateToRecipeFields(recipe)
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
      targetTime: recipe.targetTime || totalDuration,
      targetTimeRange: recipe.targetTimeRange || formatTime(recipe.targetTime || totalDuration),
      targetTimeMin: recipe.targetTimeMin || null,
      targetTimeMax: recipe.targetTimeMax || null,
      steps: recipe.steps.map(s => ({ ...s })),
      recipeSteps: recipe.steps,
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
      setRecipes(getRecipes())
      return newRecipe.id
    }
    return null
  }, [selectedRecipeId, selectedBean, recipe, setRecipes])

  // Handle "Finish Brew" — construct brew record, save immediately, transition to rate
  const handleFinishBrew = useCallback((data) => {
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

    const brew = buildBrewRecord({
      totalTime: elapsed,
      stepResults,
      timeStatus: timeResult?.status || null,
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

  // Handle "Log without timer" — skip-timer brew, save immediately, transition to rate
  const handleLogWithoutTimer = useCallback(() => {
    const brew = buildBrewRecord({ isManualEntry: true })

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
      {phase !== 'pick' && phase !== 'success' && <PhaseIndicator phase={phase} />}

      {phase === 'pick' && (
        <BeanPicker beans={beans} onSelect={handleBeanSelect} />
      )}

      {phase === 'recipe' && selectedBean && (
        <RecipeAssembly
          bean={selectedBean}
          recipe={recipe}
          setRecipe={setRecipe}
          changes={changes}
          templates={templates}
          equipment={equipment}
          beanRecipes={(recipes || []).filter(r => r.beanId === selectedBean.id)}
          selectedRecipeId={selectedRecipeId}
          onRecipeSelect={(recipeEntity) => {
            if (recipeEntity === null) {
              // "+ New Recipe" — reset to defaults
              setSelectedRecipeId(null)
              setRecipe(getRecipeDefaults())
            } else {
              // Select an existing recipe
              setSelectedRecipeId(recipeEntity.id)
              setRecipe(recipeEntityToFormState(recipeEntity, getRecipeDefaults()))
            }
          }}
          onSaveToRecipe={(recipeId) => {
            updateRecipe(recipeId, formStateToRecipeFields(recipe))
            setRecipes(getRecipes())
          }}
          onStartBrew={() => setPhase('brew')}
          onLogWithoutTimer={handleLogWithoutTimer}
          onBack={() => setPhase('pick')}
          onBeanUpdate={handleBeanUpdate}
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
          onComplete={() => setPhase('success')}
          onBrewUpdated={onBrewSaved}
          setBeans={setBeans}
        />
      )}

      {phase === 'success' && (
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
          <div className="flex flex-col gap-3 mt-6 w-full max-w-[260px]">
            <button
              onClick={handleStartNewBrew}
              className="bg-brew-800 text-white rounded-xl px-8 py-3.5 text-sm font-semibold
                         hover:bg-brew-700 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Start New Brew
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="border border-brew-200 text-brew-600 rounded-xl px-8 py-3.5 text-sm font-semibold
                         hover:bg-brew-50 active:scale-[0.98] transition-all min-h-[44px]"
            >
              View in History
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
