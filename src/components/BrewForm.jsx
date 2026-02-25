import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveBrew, getLastBrew, getLastBrewOfBean, saveBean, getBeans } from '../data/storage'
import { BREW_METHODS, GRINDERS, BODY_OPTIONS, RATING_SCALE, BREW_ISSUES } from '../data/defaults'
import FlavorPicker from './FlavorPicker'

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

export default function BrewForm({ equipment, beans, setBeans, onBrewSaved }) {
  // Get the user's grinder config for setting display
  const grinder = GRINDERS.find(g => g.id === equipment?.grinder) || GRINDERS[0]
  const method = BREW_METHODS.find(m => m.id === equipment?.brewMethod) || BREW_METHODS[0]

  // Pre-fill from last brew or use sensible defaults (lazy — parse once, not every render)
  const [lastBrew] = useState(() => getLastBrew())

  const [form, setForm] = useState({
    // Bean info
    beanName: lastBrew?.beanName || '',
    roaster: lastBrew?.roaster || '',
    roastDate: lastBrew?.roastDate || '',

    // Recipe params — pre-filled from last brew
    coffeeGrams: lastBrew?.coffeeGrams || 20,
    waterGrams: lastBrew?.waterGrams || 320,
    grindSetting: lastBrew?.grindSetting ?? 6,
    waterTemp: lastBrew?.waterTemp || 205,
    bloomTime: lastBrew?.bloomTime || method.defaultBloomTime,
    bloomWater: lastBrew?.bloomWater || 60,
    targetTime: lastBrew?.targetTime || method.defaultTotalTime,

    // Brew execution — entered after brewing
    totalTime: '',
    actualBloomTime: '',
    actualBloomWater: '',

    // Tasting
    flavors: [],
    body: '',
    rating: 0,
    issues: [],

    // Notes
    notes: '',
  })

  const [saved, setSaved] = useState(false)
  const savingRef = useRef(false)
  const [beanRecipeSource, setBeanRecipeSource] = useState(null)
  const [lastBeanBrew, setLastBeanBrew] = useState(null)

  // Helper to update form fields
  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  // Bean name change handler — pre-fills recipe from last brew of same bean
  // Only looks up localStorage when typed name exactly matches a known bean (not on every keystroke)
  const handleBeanNameChange = (newName) => {
    const trimmed = newName.trim()
    const knownBean = trimmed && beans.some(b => b.name?.trim().toLowerCase() === trimmed.toLowerCase())

    if (knownBean) {
      const beanBrew = getLastBrewOfBean(trimmed)
      if (beanBrew) {
        // Pre-fill RECIPE fields only (not tasting, not brew execution) — single setForm call
        setForm(prev => ({
          ...prev,
          beanName: newName,
          coffeeGrams: beanBrew.coffeeGrams || prev.coffeeGrams,
          waterGrams: beanBrew.waterGrams || prev.waterGrams,
          grindSetting: beanBrew.grindSetting ?? prev.grindSetting,
          waterTemp: beanBrew.waterTemp || prev.waterTemp,
          bloomTime: beanBrew.bloomTime || prev.bloomTime,
          bloomWater: beanBrew.bloomWater || prev.bloomWater,
          targetTime: beanBrew.targetTime || prev.targetTime,
        }))
        setBeanRecipeSource(beanBrew.beanName)
        setLastBeanBrew(beanBrew)
        setSaved(false)
        return
      }
    }

    // No match — just update the bean name
    setForm(prev => ({ ...prev, beanName: newName }))
    setBeanRecipeSource(null)
    setLastBeanBrew(null)
    setSaved(false)
  }

  // Calculate the brew ratio
  const ratio = form.coffeeGrams > 0
    ? (form.waterGrams / form.coffeeGrams).toFixed(1)
    : '—'

  // Format time display (e.g., "3:30")
  const formatTime = (seconds) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Save the brew (guarded against double-tap)
  const handleSave = () => {
    if (savingRef.current) return
    savingRef.current = true

    const trimmedName = form.beanName.trim()

    const brew = {
      id: uuidv4(),
      ...form,
      beanName: trimmedName,
      // Default actual values to planned values if not specified
      targetTime: form.targetTime || undefined,
      totalTime: form.totalTime || form.targetTime || undefined,
      actualBloomTime: form.actualBloomTime || form.bloomTime,
      actualBloomWater: form.actualBloomWater || form.bloomWater,
      method: equipment?.brewMethod,
      grinder: equipment?.grinder,
      dripper: equipment?.dripper,
      brewedAt: new Date().toISOString(),
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
            {grinder.settingType === 'numeric' || grinder.settingType === 'clicks' ? (
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

          {/* Bloom time (planned) */}
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Bloom (sec)</label>
            <input
              type="number"
              value={form.bloomTime}
              onChange={(e) => update('bloomTime', Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Bloom water (planned) */}
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Bloom Water (g)</label>
            <input
              type="number"
              value={form.bloomWater}
              onChange={(e) => update('bloomWater', Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>

          {/* Target brew time */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-brew-500 mb-1 block">Target Time (sec)</label>
            <input
              type="number"
              value={form.targetTime}
              onChange={(e) => update('targetTime', Number(e.target.value))}
              placeholder={method.defaultTotalTime}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
            {form.targetTime && (
              <div className="text-xs text-brew-400 mt-1 text-center">
                {formatTime(form.targetTime)}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ===== PHASE 2: BREW ===== */}
      <PhaseHeader number={2} title="Brew" subtitle="What happened" phase="brew" />

      {/* ---- TIMING & ACTUAL BLOOM ---- */}
      <Section title="Timing & Bloom">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
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

          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Actual Bloom (sec)</label>
            <input
              type="number"
              value={form.actualBloomTime}
              onChange={(e) => update('actualBloomTime', Number(e.target.value))}
              placeholder={form.bloomTime || ''}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         placeholder:text-brew-300
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brew-500 mb-1 block">Actual Bloom Water (g)</label>
            <input
              type="number"
              value={form.actualBloomWater}
              onChange={(e) => update('actualBloomWater', Number(e.target.value))}
              placeholder={form.bloomWater || ''}
              className="w-full p-3 rounded-xl border border-brew-200 text-base font-mono
                         placeholder:text-brew-300
                         focus:outline-none focus:ring-2 focus:ring-brew-400"
            />
          </div>
          <div className="col-span-2 text-[10px] text-brew-400 -mt-1">
            Leave blank if bloom went as planned
          </div>
        </div>
      </Section>

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

      {/* ---- SAVE BUTTON ---- */}
      <button
        onClick={handleSave}
        disabled={saved}
        className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all
          ${saved
            ? 'bg-green-500 text-white'
            : 'bg-brew-600 text-white hover:bg-brew-700 active:scale-[0.98]'
          }`}
      >
        {saved ? '\u2713 Brew Saved!' : 'Save Brew'}
      </button>

      {/* Quick diff from last brew */}
      {!saved && (beanRecipeSource || lastBrew) && (
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
