import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveBrew, updateBrew, getLastBrew, getLastBrewOfBean, saveBean, getBeans, formatTime, parseTimeRange, formatTimeRange, normalizeSteps } from '../data/storage'
import { BREW_METHODS, GRINDERS, FELLOW_ODE_POSITIONS, BODY_OPTIONS, RATING_SCALE, BREW_ISSUES } from '../data/defaults'
import FlavorPicker from './FlavorPicker'
import StepEditor from './StepEditor'

// ============================================================
// BREW FORM — The main brew logging interface
// ============================================================
// Structured into three phases that mirror the actual brewing workflow:
//   1. RECIPE — the plan (bean, dose, grind, water, bloom)
//   2. BREW — what happened (timing, actual bloom, issues, notes)
//   3. TASTING — the results (flavors, body, rating)
//
// DESIGN PRINCIPLE: Start with the defaults, change what's different.
// Pre-fills recipe from your last brew of the SAME BEAN ("dial-in" pattern).

export default function BrewForm({ equipment, beans, setBeans, editBrew, onBrewSaved, onEditComplete }) {
  const getRecipeSteps = (brew) => {
    if (Array.isArray(brew?.recipeSteps) && brew.recipeSteps.length > 0) return normalizeSteps(brew.recipeSteps)
    return []
  }

  const getActualSteps = (brew) => {
    if (Array.isArray(brew?.steps) && brew.steps.length > 0) return normalizeSteps(brew.steps)
    return []
  }

  // Get the user's grinder config for setting display
  const grinder = GRINDERS.find(g => g.id === equipment?.grinder) || GRINDERS[0]
  const method = BREW_METHODS.find(m => m.id === equipment?.brewMethod) || BREW_METHODS[0]

  const isEditing = !!editBrew

  // Pre-fill from last brew or use sensible defaults (lazy — parse once, not every render)
  const [lastBrew] = useState(() => isEditing ? null : getLastBrew())

  const [form, setForm] = useState(() => {
    const source = editBrew || lastBrew
    return {
      // Bean info
      beanName: source?.beanName || '',
      roaster: source?.roaster || '',
      roastDate: source?.roastDate || '',

      // Recipe params
      coffeeGrams: source?.coffeeGrams || 20,
      waterGrams: source?.waterGrams || 320,
      grindSetting: source?.grindSetting ?? (grinder.settingType === 'ode' ? '6' : 6),
      waterTemp: source?.waterTemp || 205,
      targetTime: source?.targetTime || method.defaultTotalTime,
      targetTimeRange: source?.targetTimeRange || '',
      targetTimeMin: source?.targetTimeMin || null,
      targetTimeMax: source?.targetTimeMax || null,

      // Brew execution — edit mode populates from saved data, new mode starts empty
      totalTime: editBrew?.totalTime || '',

      // Tasting — edit mode populates from saved data, new mode starts empty
      flavors: editBrew?.flavors || [],
      body: editBrew?.body || '',
      rating: editBrew?.rating || 0,
      issues: editBrew?.issues || [],

      // Notes
      notes: editBrew?.notes || '',

      // Pour steps (copy-on-write: recipe = plan, steps = actual)
      recipeSteps: getRecipeSteps(source),
      steps: editBrew ? getActualSteps(editBrew) : [],
    }
  })

  const [targetTimeInput, setTargetTimeInput] = useState(() => {
    const source = editBrew || lastBrew
    return source?.targetTimeRange || formatTime(source?.targetTime || method.defaultTotalTime)
  })

  const [saved, setSaved] = useState(false)
  const savingRef = useRef(false)
  const stepsModifiedRef = useRef(false)
  const recipeStepsModifiedRef = useRef(false)
  const [beanRecipeSource, setBeanRecipeSource] = useState(null)
  const [lastBeanBrew, setLastBeanBrew] = useState(null)
  const [pendingStepChoice, setPendingStepChoice] = useState(false)

  // Helper to update form fields
  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  // Bean name change handler — pre-fills recipe from last brew of same bean
  // Also fills roaster from bean library and roastDate from last brew (fallback to library)
  // Only looks up localStorage when typed name exactly matches a known bean (not on every keystroke)
  const handleBeanNameChange = (newName) => {
    // In edit mode, just update the name — don't trigger recipe pre-fill
    if (isEditing) {
      setForm(prev => ({ ...prev, beanName: newName }))
      setSaved(false)
      return
    }

    const trimmed = newName.trim()
    const matchedBean = trimmed && beans.find(b => b.name?.trim().toLowerCase() === trimmed.toLowerCase())

    if (matchedBean) {
      const beanBrew = getLastBrewOfBean(trimmed)
      if (beanBrew) {
        const recipeSteps = getRecipeSteps(beanBrew)
        const actualSteps = getActualSteps(beanBrew)
        const hasRecipe = recipeSteps.length > 0
        const hasActual = actualSteps.length > 0
        const canChooseSource = hasRecipe && hasActual && JSON.stringify(recipeSteps) !== JSON.stringify(actualSteps)

        // Pre-fill recipe + bean info from last brew and library
        setForm(prev => ({
          ...prev,
          beanName: newName,
          roaster: matchedBean.roaster || prev.roaster,
          roastDate: beanBrew.roastDate || matchedBean.roastDate || prev.roastDate,
          coffeeGrams: beanBrew.coffeeGrams || prev.coffeeGrams,
          waterGrams: beanBrew.waterGrams || prev.waterGrams,
          grindSetting: beanBrew.grindSetting ?? prev.grindSetting,
          waterTemp: beanBrew.waterTemp || prev.waterTemp,
          targetTime: beanBrew.targetTime || prev.targetTime,
          targetTimeRange: beanBrew.targetTimeRange || prev.targetTimeRange,
          targetTimeMin: beanBrew.targetTimeMin || prev.targetTimeMin,
          targetTimeMax: beanBrew.targetTimeMax || prev.targetTimeMax,
          recipeSteps: canChooseSource
            ? recipeSteps
            : (hasRecipe ? recipeSteps : actualSteps),
          steps: [],
        }))
        setTargetTimeInput(beanBrew.targetTimeRange || formatTime(beanBrew.targetTime || form.targetTime))
        setBeanRecipeSource(beanBrew.beanName)
        setLastBeanBrew(beanBrew)
        setPendingStepChoice(canChooseSource)
        setSaved(false)
        return
      }

      // Known bean but never brewed — fill roaster and roastDate from library only
      setForm(prev => ({
        ...prev,
        beanName: newName,
        roaster: matchedBean.roaster || prev.roaster,
        roastDate: matchedBean.roastDate || prev.roastDate,
      }))
      setPendingStepChoice(false)
      setSaved(false)
      return
    }

    // No match — just update the bean name
    setForm(prev => ({ ...prev, beanName: newName }))
    setBeanRecipeSource(null)
    setLastBeanBrew(null)
    setPendingStepChoice(false)
    setSaved(false)
  }

  // Calculate the brew ratio
  const ratio = form.coffeeGrams > 0
    ? (form.waterGrams / form.coffeeGrams).toFixed(1)
    : '—'

  const applyBeanStepSource = (source) => {
    if (!lastBeanBrew) return
    const nextRecipeSteps = source === 'actual' ? getActualSteps(lastBeanBrew) : getRecipeSteps(lastBeanBrew)
    setForm(prev => ({
      ...prev,
      recipeSteps: nextRecipeSteps,
      steps: [],
    }))
    setPendingStepChoice(false)
    setSaved(false)
  }

  // Save the brew (guarded against double-tap)
  const handleSave = () => {
    if (savingRef.current) return
    savingRef.current = true

    const trimmedName = form.beanName.trim()

    // Resolve steps: preserve original data unless user actively modified
    let finalRecipeSteps = form.recipeSteps
    let finalSteps

    if (isEditing) {
      // Preserve original exactly as stored — including undefined/missing
      if (!recipeStepsModifiedRef.current) {
        finalRecipeSteps = editBrew.recipeSteps
      }
      if (!stepsModifiedRef.current) {
        finalSteps = editBrew.steps ?? editBrew.recipeSteps ?? []
      } else {
        finalSteps = form.steps.length > 0 ? form.steps : finalRecipeSteps
      }
    } else {
      finalSteps = form.steps.length > 0 ? form.steps : form.recipeSteps
    }

    // Edit mode — update existing brew and navigate back
    // Preserve fields the form doesn't manage (per documented learning:
    // edit-form-overwrites-fields-it-doesnt-manage)
    if (isEditing) {
      const updatedBrews = updateBrew(editBrew.id, {
        ...form,
        beanName: trimmedName,
        targetTime: form.targetTime || undefined,
        totalTime: form.totalTime || form.targetTime || undefined,
        recipeSteps: finalRecipeSteps,
        steps: finalSteps,
        // Preserve schema V2 fields the form doesn't manage
        stepResults: editBrew.stepResults,
        timeStatus: editBrew.timeStatus,
        schemaVersion: editBrew.schemaVersion,
        pourTemplateId: editBrew.pourTemplateId,
        nextBrewChanges: editBrew.nextBrewChanges,
      })
      if (trimmedName) {
        saveBean({ name: trimmedName, roaster: form.roaster, roastDate: form.roastDate })
        setBeans(getBeans())
      }
      onBrewSaved(updatedBrews)
      savingRef.current = false
      onEditComplete()
      return
    }

    const brew = {
      id: uuidv4(),
      ...form,
      beanName: trimmedName,
      targetTime: form.targetTime || undefined,
      totalTime: form.totalTime || form.targetTime || undefined,
      recipeSteps: form.recipeSteps,
      steps: finalSteps,
      method: equipment?.brewMethod,
      grinder: equipment?.grinder,
      dripper: equipment?.dripper,
      brewedAt: new Date().toISOString(),
      schemaVersion: 2,
    }

    const updatedBrews = saveBrew(brew)
    onBrewSaved(updatedBrews)
    setSaved(true)

    // If this is a new bean, save it to the library (saveBean deduplicates)
    if (trimmedName) {
      const updatedBeans = saveBean({
        id: uuidv4(),
        name: trimmedName,
        roaster: form.roaster,
        roastDate: form.roastDate,
        addedAt: new Date().toISOString(),
      })
      setBeans(updatedBeans)
    }

    savingRef.current = false
  }

  // --- FORM LAYOUT ---
  // Organized into three phases: Recipe → Brew → Tasting
  // Each phase has a header and one or more collapsible sections.

  return (
    <div className="mt-6 space-y-4">

      {/* Editing banner */}
      {isEditing && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center
                        animate-fade-in-up motion-reduce:animate-none">
          Editing brew — {editBrew.beanName || 'Unknown'}
        </div>
      )}

      {/* ===== PHASE 1: RECIPE ===== */}
      <PhaseHeader number={1} title="Recipe" subtitle="Your plan for this brew" phase="recipe" />

      {/* ---- BEAN INFO ---- */}
      <Section title="Coffee" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-brew-500 mb-1 block">Bean Name</label>
            <input
              type="text"
              value={form.beanName}
              onChange={(e) => handleBeanNameChange(e.target.value)}
              placeholder="e.g., Heart Columbia Javier Omar"
              list="bean-suggestions"
              className="w-full p-3 rounded-xl border border-brew-200 text-base
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
            {/* Autocomplete from bean library */}
            <datalist id="bean-suggestions">
              {beans.map(b => <option key={b.id} value={b.name} />)}
            </datalist>
            {/* Bean-specific pre-fill hint */}
            {beanRecipeSource && (
              <div className="mt-2 px-3 py-2 bg-brew-50 rounded-lg text-xs text-brew-500
                              animate-fade-in motion-reduce:animate-none">
                Recipe pre-filled from your last brew of <strong>{beanRecipeSource}</strong>
              </div>
            )}
            {pendingStepChoice && lastBeanBrew && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[11px] text-amber-700 mb-2">
                  Use step plan or what actually happened last time?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyBeanStepSource('recipe')}
                    className="px-2.5 py-1.5 rounded-md bg-white border border-amber-200 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                  >
                    Use Planned Steps
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBeanStepSource('actual')}
                    className="px-2.5 py-1.5 rounded-md bg-white border border-amber-200 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                  >
                    Use Actual Steps
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Roaster</label>
            <input
              type="text"
              value={form.roaster}
              onChange={(e) => update('roaster', e.target.value)}
              placeholder="e.g., Heart, Tandem"
              className="w-full p-3 rounded-xl border border-brew-200 text-base
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Roast Date</label>
            <input
              type="date"
              value={form.roastDate}
              onChange={(e) => update('roastDate', e.target.value)}
              className="w-full p-3 rounded-xl border border-brew-200 text-base
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
        </div>
      </Section>

      {/* ---- RECIPE PARAMETERS ---- */}
      <Section title="Brew Parameters" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          {/* Coffee dose */}
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">
              Coffee (g)
            </label>
            <input
              type="number"
              value={form.coffeeGrams}
              onChange={(e) => update('coffeeGrams', Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Water */}
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">
              Water (g)
            </label>
            <input
              type="number"
              value={form.waterGrams}
              onChange={(e) => update('waterGrams', Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Ratio display */}
          <div className="col-span-2 px-3 py-2 bg-brew-50 rounded-lg text-center">
            <span className="text-xs text-brew-500">Ratio: </span>
            <span className="text-sm font-mono font-semibold text-brew-700">
              1:{ratio}
            </span>
          </div>

          {/* Grind setting */}
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">
              Grind ({grinder.name})
            </label>
            {grinder.settingType === 'ode' ? (
              <select
                value={form.grindSetting}
                onChange={(e) => update('grindSetting', e.target.value)}
                className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              >
                {FELLOW_ODE_POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            ) : grinder.settingType === 'numeric' || grinder.settingType === 'clicks' ? (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={grinder.min}
                  max={grinder.max}
                  step={grinder.step || 1}
                  value={form.grindSetting}
                  onChange={(e) => update('grindSetting', Number(e.target.value))}
                  className="flex-1 accent-brew-500"
                />
                <span className="text-sm font-mono font-semibold text-brew-700 w-8 text-center">
                  {form.grindSetting}
                </span>
              </div>
            ) : (
              <input
                type="text"
                value={form.grindSetting}
                onChange={(e) => update('grindSetting', e.target.value)}
                placeholder="Describe grind..."
                className="w-full p-3 rounded-xl border border-brew-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            )}
          </div>

          {/* Water temp */}
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">
              Water Temp ({'\u00B0'}F)
            </label>
            <input
              type="number"
              value={form.waterTemp}
              onChange={(e) => update('waterTemp', Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Target brew time */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-brew-500 mb-1 block">Target Time (M:SS or M:SS - M:SS)</label>
            <input
              type="text"
              value={targetTimeInput}
              onChange={e => setTargetTimeInput(e.target.value)}
              onBlur={() => {
                const range = parseTimeRange(targetTimeInput)
                if (range) {
                  setTargetTimeInput(formatTimeRange(range.min, range.max))
                  setForm(prev => ({
                    ...prev,
                    targetTime: Math.round((range.min + range.max) / 2),
                    targetTimeMin: range.min,
                    targetTimeMax: range.max,
                    targetTimeRange: formatTimeRange(range.min, range.max),
                  }))
                  setSaved(false)
                }
              }}
              placeholder="3:00 - 3:30"
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono text-center
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
        </div>
      </Section>

      {/* ---- POUR STEPS (Recipe) ---- */}
      <Section title="Pour Steps" defaultOpen={form.recipeSteps.length > 0}>
        <StepEditor
          steps={form.recipeSteps}
          onChange={(steps) => { recipeStepsModifiedRef.current = true; update('recipeSteps', steps) }}
          hint="Plan each pour stage — bloom, main pours, drawdown."
        />
      </Section>

      {/* ===== PHASE 2: BREW ===== */}
      <PhaseHeader number={2} title="Brew" subtitle="What happened" phase="brew" />

      {/* ---- TIMING ---- */}
      <Section title="Timing">
        <div>
          <label className="text-xs font-medium text-brew-500 mb-1 block">Total Time (sec)</label>
          <input
            type="number"
            value={form.totalTime}
            onChange={(e) => update('totalTime', Number(e.target.value))}
            placeholder={form.targetTime || method.defaultTotalTime}
            className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                       placeholder:text-brew-300
                       focus:outline-none focus:ring-2 focus:ring-brew-400"
          />
          {form.totalTime && (
            <div className="text-xs text-brew-400 mt-1 text-center">
              {formatTime(form.totalTime)}
            </div>
          )}
          {form.targetTime && !form.totalTime && (
            <div className="text-xs text-brew-400 mt-1 text-center">
              Leave blank if brew time matched your target
            </div>
          )}
        </div>
      </Section>

      {/* ---- POUR STEPS (Brew — copy-on-write from recipe) ---- */}
      {form.recipeSteps.length > 0 && (
        <Section title="Pour Steps" defaultOpen>
          <StepEditor
            steps={form.steps.length > 0 ? form.steps : form.recipeSteps}
            onChange={(steps) => { stepsModifiedRef.current = true; update('steps', steps) }}
            hint="Your planned steps are shown below. Modify anything that went differently, or delete steps you skipped."
          />
        </Section>
      )}

      {/* ---- ISSUES ---- */}
      <Section title="Issues">
        <div className="flex flex-wrap gap-2">
          {BREW_ISSUES.map(issue => (
            <button
              key={issue}
              onClick={() => {
                const issues = form.issues.includes(issue)
                  ? form.issues.filter(i => i !== issue)
                  : [...form.issues, issue]
                update('issues', issues)
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all
                ${form.issues.includes(issue)
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-brew-200 text-brew-500 hover:border-brew-300'
                }`}
            >
              {issue}
            </button>
          ))}
        </div>
      </Section>

      {/* ---- NOTES ---- */}
      <Section title="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any adjustments during the brew? How did the cup turn out?"
          rows={4}
          className="w-full p-3 rounded-xl border border-brew-200 text-base
                     text-brew-800 placeholder:text-brew-300
                     focus:outline-none focus:ring-2 focus:ring-brew-400 resize-y"
        />
      </Section>

      {/* ===== PHASE 3: TASTING ===== */}
      <PhaseHeader number={3} title="Tasting" subtitle="How did it taste?" phase="tasting" />

      {/* ---- TASTING NOTES ---- */}
      <Section title="Tasting">
        {/* Flavor picker */}
        <div className="mb-4">
          <label className="text-xs font-medium text-brew-500 mb-2 block">Flavors</label>
          <FlavorPicker
            selected={form.flavors}
            onChange={(flavors) => update('flavors', flavors)}
          />
        </div>

        {/* Body */}
        <div className="mb-4">
          <label className="text-xs font-medium text-brew-500 mb-2 block">Body</label>
          <div className="flex flex-wrap gap-2">
            {BODY_OPTIONS.map(body => (
              <button
                key={body}
                onClick={() => update('body', form.body === body ? '' : body)}
                className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all
                  ${form.body === body
                    ? 'border-brew-500 bg-brew-500 text-white'
                    : 'border-brew-200 text-brew-500 hover:border-brew-300'
                  }`}
              >
                {body}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="text-xs font-medium text-brew-500 mb-2 block">Rating</label>
          <div className="flex gap-2">
            {RATING_SCALE.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => update('rating', value)}
                className={`flex-1 py-3 rounded-xl text-center transition-all
                  ${form.rating === value
                    ? 'bg-brew-100 ring-2 ring-brew-500 scale-105'
                    : 'bg-brew-50 hover:bg-brew-100'
                  }`}
              >
                <div className="text-xl">{emoji}</div>
                <div className="text-[10px] text-brew-500 mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ---- SAVE / CANCEL BUTTONS ---- */}
      <button
        onClick={handleSave}
        disabled={saved}
        className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all
          ${saved
            ? 'bg-green-500 text-white'
            : 'bg-brew-600 text-white hover:bg-brew-700 active:scale-[0.98]'
          }`}
      >
        {saved ? '\u2713 Brew Saved!' : isEditing ? 'Update Brew' : 'Save Brew'}
      </button>
      {isEditing && (
        <button
          onClick={onEditComplete}
          className="w-full py-3 rounded-2xl font-medium text-brew-500
                     hover:bg-brew-50 transition-colors"
        >
          Cancel
        </button>
      )}

      {/* Quick diff from last brew */}
      {!saved && !isEditing && (beanRecipeSource || lastBrew) && (
        <div className="p-3 bg-brew-50 rounded-xl text-xs text-brew-500">
          {beanRecipeSource && lastBeanBrew ? (
            <>
              <strong>Last brew of {beanRecipeSource}:</strong>{' '}
              {lastBeanBrew.coffeeGrams}g / {lastBeanBrew.waterGrams}g {'\u2014'}{' '}
              grind {lastBeanBrew.grindSetting} {'\u2014'}{' '}
              {(() => {
                const ratingInfo = RATING_SCALE.find(r => r.value === lastBeanBrew.rating)
                return ratingInfo ? `${ratingInfo.emoji} ${lastBeanBrew.rating}/5` : 'no rating'
              })()}
            </>
          ) : lastBrew ? (
            <>
              <strong>Last brew:</strong> {lastBrew.beanName || 'Unknown'} {'\u2014'}{' '}
              {lastBrew.coffeeGrams}g / {lastBrew.waterGrams}g {'\u2014'}{' '}
              grind {lastBrew.grindSetting} {'\u2014'}{' '}
              {lastBrew.rating ? RATING_SCALE.find(r => r.value === lastBrew.rating)?.emoji : ''}
              {lastBrew.rating ? ` ${lastBrew.rating}/5` : 'no rating'}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// --- COLLAPSIBLE SECTION COMPONENT ---
// Keeps the form clean by letting sections collapse
function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-2xl border border-brew-100 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex justify-between items-center text-left
                   hover:bg-brew-50/50 transition-colors"
      >
        <span className="text-sm font-semibold text-brew-800">{title}</span>
        <span className={`text-brew-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          {'\u25BE'}
        </span>
      </button>
      <div
        aria-hidden={!open}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
          open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {open && <div className="px-5 pb-5">
          {children}
        </div>}
      </div>
    </div>
  )
}

// --- PHASE HEADER COMPONENT ---
// Non-collapsible visual group header for the three brew phases
const PHASE_ACCENTS = {
  recipe: 'border-brew-400',
  brew: 'border-amber-400',
  tasting: 'border-green-500',
}

function PhaseHeader({ number, title, subtitle, phase }) {
  return (
    <div className={`flex items-center gap-2 px-1 pt-6 pb-2 border-l-4 ${PHASE_ACCENTS[phase]} pl-3`}>
      <span className="text-xs font-semibold text-brew-600 uppercase tracking-wide">
        {number}. {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-brew-400">{subtitle}</span>
      )}
    </div>
  )
}
