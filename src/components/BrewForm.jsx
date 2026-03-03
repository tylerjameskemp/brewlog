import { useState, useRef } from 'react'
import { updateBrew, saveBean, getBeans, formatTime, parseTimeRange, formatTimeRange, normalizeSteps } from '../data/storage'
import { BREW_METHODS, GRINDERS, FELLOW_ODE_POSITIONS, BODY_OPTIONS, RATING_SCALE, BREW_ISSUES } from '../data/defaults'
import FlavorPicker from './FlavorPicker'
import StepEditor from './StepEditor'

// ============================================================
// BREW FORM — Edit-only brew form
// ============================================================
// Used exclusively for editing existing brews from BrewHistory.
// New brews are created via BrewScreen's guided flow.
//
// Structured into three phases that mirror the actual brewing workflow:
//   1. RECIPE — the plan (bean, dose, grind, water, bloom)
//   2. BREW — what happened (timing, actual bloom, issues, notes)
//   3. TASTING — the results (flavors, body, rating)

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

  const [form, setForm] = useState(() => {
    return {
      // Bean info
      beanName: editBrew?.beanName || '',
      roaster: editBrew?.roaster || '',
      roastDate: editBrew?.roastDate || '',

      // Recipe params
      coffeeGrams: editBrew?.coffeeGrams || 20,
      waterGrams: editBrew?.waterGrams || 320,
      grindSetting: editBrew?.grindSetting ?? (grinder.settingType === 'ode' ? '6' : 6),
      waterTemp: editBrew?.waterTemp || 205,
      targetTime: editBrew?.targetTime || method.defaultTotalTime,
      targetTimeRange: editBrew?.targetTimeRange || '',
      targetTimeMin: editBrew?.targetTimeMin || null,
      targetTimeMax: editBrew?.targetTimeMax || null,

      // Brew execution
      totalTime: editBrew?.totalTime || '',

      // Tasting
      flavors: editBrew?.flavors || [],
      body: editBrew?.body || '',
      rating: editBrew?.rating ?? null,
      issues: editBrew?.issues || [],

      // Notes
      notes: editBrew?.notes || '',

      // Pour steps (copy-on-write: recipe = plan, steps = actual)
      recipeSteps: getRecipeSteps(editBrew),
      steps: getActualSteps(editBrew),
    }
  })

  const [targetTimeInput, setTargetTimeInput] = useState(
    () => editBrew?.targetTimeRange || formatTime(editBrew?.targetTime || method.defaultTotalTime)
  )

  const [saved, setSaved] = useState(false)
  const savingRef = useRef(false)
  const stepsModifiedRef = useRef(false)
  const recipeStepsModifiedRef = useRef(false)

  // Helper to update form fields
  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  // Bean name change handler — in edit mode, just update the name
  const handleBeanNameChange = (newName) => {
    setForm(prev => ({ ...prev, beanName: newName }))
    setSaved(false)
  }

  // Calculate the brew ratio
  const ratio = form.coffeeGrams > 0
    ? (form.waterGrams / form.coffeeGrams).toFixed(1)
    : '—'

  // Save the brew (guarded against double-tap)
  const handleSave = () => {
    if (savingRef.current) return
    savingRef.current = true

    const trimmedName = form.beanName.trim()

    // Resolve steps: preserve original data unless user actively modified
    let finalRecipeSteps = form.recipeSteps
    let finalSteps

    // Preserve original exactly as stored — including undefined/missing
    if (!recipeStepsModifiedRef.current) {
      finalRecipeSteps = editBrew.recipeSteps
    }
    if (!stepsModifiedRef.current) {
      finalSteps = editBrew.steps ?? editBrew.recipeSteps ?? []
    } else {
      finalSteps = form.steps.length > 0 ? form.steps : finalRecipeSteps
    }

    // Update existing brew and navigate back
    // Preserve fields the form doesn't manage (per documented learning:
    // edit-form-overwrites-fields-it-doesnt-manage)
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
      recipeSnapshot: editBrew.recipeSnapshot,
      method: editBrew.method,
      grinder: editBrew.grinder,
      dripper: editBrew.dripper,
      filterType: editBrew.filterType,
    })
    if (trimmedName) {
      saveBean({ name: trimmedName, roaster: form.roaster, roastDate: form.roastDate })
      setBeans(getBeans())
    }
    onBrewSaved(updatedBrews)
    savingRef.current = false
    onEditComplete()
  }

  // --- FORM LAYOUT ---
  // Organized into three phases: Recipe → Brew → Tasting
  // Each phase has a header and one or more collapsible sections.

  return (
    <div className="mt-6 space-y-4">

      {/* Editing banner */}
      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center
                      animate-fade-in-up motion-reduce:animate-none">
        Editing brew — {editBrew.beanName || 'Unknown'}
      </div>

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
              maxLength={100}
              className="w-full p-3 rounded-xl border border-brew-200 text-base
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
            {/* Autocomplete from bean library */}
            <datalist id="bean-suggestions">
              {beans.map(b => <option key={b.id} value={b.name} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Roaster</label>
            <input
              type="text"
              value={form.roaster}
              onChange={(e) => update('roaster', e.target.value)}
              placeholder="e.g., Heart, Tandem"
              maxLength={100}
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
              min={1} max={100}
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
              min={1} max={2000}
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
                maxLength={50}
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
              min={32} max={212}
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
              maxLength={15}
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
            min={0} max={3600}
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
          maxLength={2000}
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
        {saved ? '\u2713 Brew Updated!' : 'Update Brew'}
      </button>
      <button
        onClick={onEditComplete}
        className="w-full py-3 rounded-2xl font-medium text-brew-500
                   hover:bg-brew-50 transition-colors"
      >
        Cancel
      </button>
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
