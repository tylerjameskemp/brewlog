import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  getLastBrewOfBean, getChangesForBean, normalizeSteps, formatTime,
  getPourTemplates, saveBrew, saveBean, getBeans, updateBean,
  saveActiveBrew, getActiveBrew, clearActiveBrew,
} from '../data/storage'
import { BREW_METHODS, GRINDERS, FELLOW_ODE_POSITIONS, BODY_OPTIONS, RATING_SCALE, BREW_ISSUES } from '../data/defaults'
import FlavorPicker from './FlavorPicker'
import useTimer from '../hooks/useTimer'
import useWakeLock from '../hooks/useWakeLock'

// ============================================================
// BREW SCREEN — Guided three-phase brewing experience
// ============================================================
// Phase 0: Bean picker (if no bean pre-selected)
// Phase 1: Recipe Assembly — review, adjust, select pour template
// Phase 2: Active Brew — timer, step teleprompter, variance tracking
// Phase 3: Post-Brew Commit — report, notes, tasting, commit

const ratio = (c, w) => c > 0 ? `1:${(w / c).toFixed(1)}` : '—'

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
        className={dragging ? '' : 'transition-transform duration-300 ease-out'}
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
            className={`h-1.5 rounded-full transition-all duration-300 ${
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
  const phases = ['recipe', 'brew', 'commit']
  return (
    <div className="flex gap-1.5 px-5 py-3">
      {phases.map((p, i) => (
        <div
          key={p}
          className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
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
    const q = search.trim().toLowerCase()
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
            {bean.tastingNotes?.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {bean.tastingNotes.map(n => (
                  <span key={n} className="text-xs bg-brew-50 text-brew-400 px-2 py-0.5 rounded-full">{n}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Phase 1: Recipe Assembly ───────────────────────────────
function RecipeAssembly({ bean, recipe, setRecipe, changes, templates, onStartBrew, equipment }) {
  const [cardIndex, setCardIndex] = useState(0)
  const [changesAccepted, setChangesAccepted] = useState({})
  const [editing, setEditing] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(recipe.pourTemplateId || templates[0]?.id || null)

  const grinder = GRINDERS.find(g => g.id === equipment?.grinder) || GRINDERS[0]

  const handleSwipe = (dir) => {
    setCardIndex(prev => Math.max(0, Math.min(2, prev + dir)))
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplateId(template.id)
    setRecipe(prev => ({
      ...prev,
      steps: template.steps,
      pourTemplateId: template.id,
    }))
  }

  const updateField = (field, value) => {
    setRecipe(prev => ({ ...prev, [field]: value }))
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

      {bean.tastingNotes?.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {bean.tastingNotes.map(n => (
            <span key={n} className="text-xs bg-brew-50 text-brew-400 px-3 py-1 rounded-full">{n}</span>
          ))}
        </div>
      )}

      {/* Coffee / Water / Ratio */}
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          { label: 'Coffee', value: `${recipe.coffeeGrams}g`, field: 'coffeeGrams', type: 'number' },
          { label: 'Water', value: `${recipe.waterGrams}g`, field: 'waterGrams', type: 'number' },
          { label: 'Ratio', value: ratio(recipe.coffeeGrams, recipe.waterGrams) },
        ].map(item => (
          <div key={item.label} className="text-center p-3 bg-brew-50 rounded-xl">
            <div className="text-[11px] text-brew-400 uppercase tracking-wider mb-1">{item.label}</div>
            {editing && item.field ? (
              <input
                type={item.type}
                value={recipe[item.field]}
                onChange={e => updateField(item.field, Number(e.target.value))}
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
              className="w-full text-center text-sm font-medium text-brew-800 bg-transparent
                         border-b border-brew-300 focus:outline-none text-base"
            />
          ) : (
            <div className="text-sm font-medium text-brew-800">{recipe.waterTemp ? `${recipe.waterTemp}°F` : '—'}</div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-brew-400 text-center">
        Target time: <span className="text-brew-800 font-medium">{recipe.targetTimeRange || formatTime(recipe.targetTime)}</span>
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
                <span className="text-xs text-brew-400">
                  {formatTime(step.time)} → {formatTime(step.time + step.duration)}
                </span>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {step.waterTo != null && (
                  <span className="text-xs text-brew-500 font-medium">↑ {step.waterTo}g</span>
                )}
                <span className="text-xs text-brew-400">{step.note}</span>
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
        { label: 'Origin', value: bean.origin },
        { label: 'Grower', value: bean.grower },
        { label: 'Process', value: bean.process },
        { label: 'Variety', value: bean.variety },
        { label: 'Elevation', value: bean.elevation },
      ].map(item => (
        <div key={item.label} className="flex justify-between py-2.5 border-b border-brew-50 text-sm last:border-0">
          <span className="text-brew-400">{item.label}</span>
          <span className="font-medium text-brew-800">{item.value || '—'}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-[11px] text-brew-400 uppercase tracking-widest mb-1">Recipe</div>
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-brew-800">Prepare Your Brew</h1>
          <button
            onClick={() => setEditing(!editing)}
            className="border border-brew-200 rounded-lg px-3 py-1.5 text-xs text-brew-400
                       hover:bg-brew-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Changes from last brew */}
      {changes.length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-brew-500 mb-2 flex items-center gap-1.5">
              Notes from last brew
            </div>
            {changes.map((c, i) => (
              <div
                key={i}
                className={`flex gap-2.5 items-start ${i < changes.length - 1 ? 'mb-2' : ''} transition-opacity duration-300`}
                style={{ opacity: changesAccepted[i] === false ? 0.4 : 1 }}
              >
                <div className="flex-1 text-sm text-brew-800 leading-relaxed">
                  {changesAccepted[i] === true && <span className="text-green-600">✓ </span>}
                  {c}
                </div>
                {changesAccepted[i] === undefined && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setChangesAccepted(p => ({ ...p, [i]: true }))}
                      className="bg-green-600 text-white rounded-md px-2.5 py-1 text-[11px] font-semibold
                                 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setChangesAccepted(p => ({ ...p, [i]: false }))}
                      className="bg-brew-50 text-brew-400 border border-brew-200 rounded-md px-2.5 py-1
                                 text-[11px] min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
      </div>
    </div>
  )
}

// ─── Phase 2: Active Brew ───────────────────────────────────
function ActiveBrew({ recipe, equipment, onFinish, onBrewActiveChange, persistState }) {
  const timer = useTimer()
  const [tappedSteps, setTappedSteps] = useState({})
  const [skippedSteps, setSkippedSteps] = useState({})
  const stepsContainerRef = useRef(null)
  const stepRefs = useRef({})
  const hasStarted = timer.elapsed > 0 || timer.running

  useWakeLock(timer.running)

  const steps = recipe.steps
  const totalDuration = steps.length > 0
    ? steps[steps.length - 1].time + steps[steps.length - 1].duration
    : 210

  // Determine current step
  let currentStepIdx = 0
  for (let i = steps.length - 1; i >= 0; i--) {
    if (timer.elapsed >= steps[i].time && !skippedSteps[steps[i].id]) {
      currentStepIdx = i
      break
    }
  }

  // Auto-scroll to current step
  useEffect(() => {
    if (!timer.running) return
    const currentStep = steps[currentStepIdx]
    const ref = stepRefs.current[currentStep?.id]
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStepIdx, timer.running, steps])

  // Notify parent of active state
  useEffect(() => {
    if (timer.running) onBrewActiveChange(true)
    return () => onBrewActiveChange(false)
  }, [timer.running, onBrewActiveChange])

  // Persist state on significant actions
  useEffect(() => {
    if (!hasStarted) return
    persistState({
      timerState: timer.getTimerState(),
      tappedSteps,
      skippedSteps,
      elapsed: timer.elapsed,
    })
  }, [timer.elapsed, tappedSteps, skippedSteps, hasStarted, persistState, timer])

  const handleTapStep = (step) => {
    if (tappedSteps[step.id] !== undefined) return // double-tap guard
    setTappedSteps(p => ({ ...p, [step.id]: timer.elapsed }))
  }

  const handleSkipStep = (step) => {
    setSkippedSteps(p => ({ ...p, [step.id]: true }))
  }

  const progress = Math.min(timer.elapsed / totalDuration, 1)
  const overTime = timer.elapsed > totalDuration

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 ${
      timer.running ? 'bg-white' : 'bg-brew-50'
    }`}>
      {/* Timer Display */}
      <div className="text-center pt-10 pb-5 px-5">
        <div className="font-mono text-7xl font-light text-brew-800 leading-none tabular-nums tracking-tight">
          {formatTime(timer.elapsed)}
        </div>
        <div className="text-xs text-brew-400 mt-2">
          Target: {recipe.targetTimeRange || formatTime(recipe.targetTime)}
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-4 max-w-[200px] h-0.5 bg-brew-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 linear ${
              overTime ? 'bg-red-500' : 'bg-brew-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      {!hasStarted && (
        <div className="text-center pb-5">
          <button
            onClick={() => timer.play()}
            className="w-[72px] h-[72px] rounded-full bg-brew-800 text-white text-2xl
                       shadow-xl flex items-center justify-center mx-auto
                       hover:bg-brew-700 active:scale-95 transition-all min-h-[44px]"
            aria-label="Start brew"
          >
            ▶
          </button>
          <div className="text-sm text-brew-400 mt-2.5">Tap to start brewing</div>
        </div>
      )}

      {timer.running && (
        <div className="text-center pb-3">
          <button
            onClick={() => timer.pause()}
            className="border border-brew-200 rounded-full px-5 py-1.5 text-xs text-brew-400
                       hover:bg-brew-50 min-h-[44px] min-w-[44px]"
          >
            Pause
          </button>
        </div>
      )}

      {!timer.running && hasStarted && (
        <div className="text-center pb-3 flex gap-3 justify-center">
          <button
            onClick={() => timer.play()}
            className="bg-brew-800 text-white rounded-full px-6 py-2 text-sm font-semibold
                       hover:bg-brew-700 active:scale-95 transition-all min-h-[44px]"
          >
            Resume
          </button>
        </div>
      )}

      {/* Step Teleprompter */}
      <div ref={stepsContainerRef} className="flex-1 px-4 pb-36 overflow-y-auto">
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIdx && timer.running
          const isPast = timer.elapsed >= step.time + step.duration || skippedSteps[step.id]
          const isFuture = !isCurrent && !isPast
          const tappedAt = tappedSteps[step.id]
          const variance = tappedAt !== undefined ? tappedAt - step.time : null
          const skipped = skippedSteps[step.id]

          return (
            <div
              key={step.id}
              ref={el => (stepRefs.current[step.id] = el)}
              onClick={() => timer.running && !isPast && !skipped && handleTapStep(step)}
              className={`p-4 mb-2 rounded-xl relative transition-all duration-400 ${
                skipped
                  ? 'bg-brew-50 text-brew-200 line-through opacity-40'
                  : isCurrent
                    ? 'bg-brew-800 text-white'
                    : isPast
                      ? 'bg-brew-50 text-brew-400'
                      : 'bg-white border border-brew-100'
              } ${timer.running && isFuture ? 'opacity-50' : ''} ${
                timer.running && !isPast && !skipped ? 'cursor-pointer' : ''
              }`}
            >
              {/* Skip button */}
              {timer.running && !isPast && !skipped && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSkipStep(step) }}
                  className={`absolute top-2 right-2 text-base px-2 py-1 leading-none
                              min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    isCurrent ? 'text-white/40' : 'text-brew-200'
                  }`}
                  aria-label={`Skip ${step.name}`}
                >
                  ✕
                </button>
              )}

              <div className="flex justify-between items-center pr-8">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm">{step.name}</span>
                  {step.waterTo != null && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      isCurrent
                        ? 'text-amber-200 bg-white/10'
                        : 'text-brew-500 bg-brew-50'
                    }`}>
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
                  isCurrent
                    ? Math.abs(variance) <= 3 ? 'text-green-300' : 'text-amber-300'
                    : Math.abs(variance) <= 3 ? 'text-green-600' : 'text-amber-500'
                }`}>
                  Tapped at {formatTime(tappedAt)} ({variance > 0 ? '+' : ''}{variance}s)
                </div>
              )}

              {/* Tap prompt */}
              {isCurrent && tappedAt === undefined && !skipped && (
                <div className="mt-2 text-[11px] text-white/50">
                  Tap when you start this step
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Finish Brew */}
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

// ─── Phase 3: Post-Brew Commit ──────────────────────────────
function PostBrewCommit({ recipe, bean, brewData, equipment, onCommit, onBrewSaved, setBeans, onNavigate }) {
  const [brewNotes, setBrewNotes] = useState('')
  const [nextBrewChanges, setNextBrewChanges] = useState('')
  const [flavors, setFlavors] = useState([])
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(null)
  const [issues, setIssues] = useState([])
  const [committed, setCommitted] = useState(false)
  const savingRef = useRef(false)

  const steps = recipe.steps

  const handleCommit = () => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const stepResults = {}
      steps.forEach(step => {
        const tappedAt = brewData.tappedSteps[step.id]
        const skipped = !!brewData.skippedSteps[step.id]
        stepResults[step.id] = {
          tappedAt: tappedAt !== undefined ? tappedAt : null,
          skipped,
          variance: tappedAt !== undefined ? tappedAt - step.time : null,
        }
      })

      const totalDuration = steps.length > 0
        ? steps[steps.length - 1].time + steps[steps.length - 1].duration
        : 210

      const brew = {
        id: uuidv4(),
        brewScreenVersion: 1,
        beanName: bean.name.trim(),
        roaster: bean.roaster || '',
        roastDate: bean.roastDate || '',
        coffeeGrams: recipe.coffeeGrams,
        waterGrams: recipe.waterGrams,
        grindSetting: recipe.grindSetting,
        waterTemp: recipe.waterTemp,
        targetTime: totalDuration,
        targetTimeRange: recipe.targetTimeRange || formatTime(totalDuration),
        totalTime: brewData.elapsed,
        recipeSteps: recipe.steps,
        steps: recipe.steps,
        stepResults,
        flavors,
        body,
        rating,
        issues,
        notes: '',
        brewNotes,
        nextBrewChanges,
        pourTemplateId: recipe.pourTemplateId || null,
        method: equipment?.brewMethod,
        grinder: equipment?.grinder,
        dripper: equipment?.dripper,
        brewedAt: new Date().toISOString(),
      }

      const updatedBrews = saveBrew(brew)
      onBrewSaved(updatedBrews)

      // Side effects: save bean (idempotent), update lastBrewChanges
      saveBean({
        id: bean.id || uuidv4(),
        name: bean.name.trim(),
        roaster: bean.roaster || '',
        roastDate: bean.roastDate || '',
        origin: bean.origin || '',
        process: bean.process || '',
        addedAt: bean.addedAt || new Date().toISOString(),
      })
      setBeans(getBeans())

      if (nextBrewChanges.trim() && bean.id) {
        updateBean(bean.id, { lastBrewChanges: nextBrewChanges.trim() })
        setBeans(getBeans())
      }

      clearActiveBrew()
      setCommitted(true)
    } finally {
      savingRef.current = false
    }
  }

  if (committed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center
                      animate-fade-in motion-reduce:animate-none">
        <div className="w-20 h-20 rounded-full bg-brew-50 flex items-center justify-center
                        text-4xl text-brew-500 mb-5">
          ✓
        </div>
        <h2 className="text-2xl font-semibold text-brew-800 mb-2">Brew Committed</h2>
        <p className="text-sm text-brew-400 leading-relaxed max-w-[260px]">
          Your brew report is saved. You can edit it anytime from your brew history.
        </p>
        <button
          onClick={() => onNavigate('history')}
          className="mt-6 bg-brew-800 text-white rounded-xl px-8 py-3.5 text-sm font-semibold
                     hover:bg-brew-700 active:scale-[0.98] transition-all min-h-[44px]"
        >
          View in History
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-28">
      {/* Summary */}
      <div className="text-center mb-6">
        <div className="text-[11px] text-brew-400 uppercase tracking-widest mb-1">Brew Complete</div>
        <h1 className="text-2xl font-semibold text-brew-800">Brew Report</h1>
        <div className="font-mono text-5xl text-brew-500 mt-2 tabular-nums">
          {formatTime(brewData.elapsed)}
        </div>
        <div className="text-sm text-brew-400 mt-1">
          Target: {recipe.targetTimeRange || formatTime(recipe.targetTime)}
        </div>
      </div>

      {/* Step Results */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-3">Step Timing</h3>
        {steps.map(step => {
          const tappedAt = brewData.tappedSteps[step.id]
          const skipped = brewData.skippedSteps[step.id]
          const variance = tappedAt !== undefined ? tappedAt - step.time : null

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
                  {skipped ? '—' : tappedAt !== undefined ? formatTime(tappedAt) : formatTime(step.time)}
                </div>
                {variance !== null && !skipped && (
                  <div className={`text-[11px] font-semibold ${
                    Math.abs(variance) <= 3 ? 'text-green-600' : 'text-amber-500'
                  }`}>
                    {variance > 0 ? '+' : ''}{variance}s
                  </div>
                )}
                {!skipped && tappedAt === undefined && (
                  <div className="text-[11px] text-brew-300">as planned</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Brew Notes */}
      <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-5 mb-4">
        <h3 className="text-lg font-semibold text-brew-800 mb-1">Brew Notes</h3>
        <p className="text-xs text-brew-400 mb-2.5">What happened during this brew?</p>
        <textarea
          value={brewNotes}
          onChange={e => setBrewNotes(e.target.value)}
          placeholder="Bed looked uneven after bloom, water temp dropped fast..."
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

      {/* Tasting Notes Placeholder */}
      <div className="bg-white rounded-2xl border border-dashed border-brew-200 p-5 text-center mb-4">
        <h3 className="text-sm font-medium text-brew-400 mb-1">Tasting Notes</h3>
        <p className="text-xs text-brew-300">Coming soon — taste as the cup cools and log your experience</p>
      </div>

      {/* Commit Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-4 pb-safe
                      bg-gradient-to-t from-brew-50 via-brew-50 to-transparent pointer-events-none z-10">
        <button
          onClick={handleCommit}
          className="w-full py-4 bg-brew-800 text-white rounded-2xl text-base font-semibold
                     shadow-lg hover:bg-brew-700 active:scale-[0.98] transition-all
                     pointer-events-auto min-h-[44px]"
        >
          Commit Brew
        </button>
      </div>
    </div>
  )
}

// ─── Main BrewScreen Component ──────────────────────────────
export default function BrewScreen({ equipment, beans, setBeans, initialBean, onBrewSaved, onBrewActiveChange, onNavigate }) {
  const [phase, setPhase] = useState(() => initialBean ? 'recipe' : 'pick')
  const [selectedBean, setSelectedBean] = useState(initialBean || null)
  const [brewData, setBrewData] = useState(null)

  const templates = useState(() => getPourTemplates())[0]

  // Recipe state — initialized lazily from last brew of selected bean
  const [recipe, setRecipe] = useState(() => {
    if (!selectedBean) return { coffeeGrams: 15, waterGrams: 240, grindSetting: '', waterTemp: 200, targetTime: 210, targetTimeRange: '', steps: templates[0]?.steps || [], pourTemplateId: templates[0]?.id || null }
    const lastBrew = getLastBrewOfBean(selectedBean.name)
    const method = BREW_METHODS.find(m => m.id === equipment?.brewMethod) || BREW_METHODS[0]
    const steps = lastBrew?.recipeSteps
      ? normalizeSteps(lastBrew.recipeSteps)
      : templates[0]?.steps || []
    return {
      coffeeGrams: lastBrew?.coffeeGrams || 15,
      waterGrams: lastBrew?.waterGrams || 240,
      grindSetting: lastBrew?.grindSetting || '',
      waterTemp: lastBrew?.waterTemp || 200,
      targetTime: lastBrew?.targetTime || method.defaultTotalTime,
      targetTimeRange: lastBrew?.targetTimeRange || '',
      steps,
      pourTemplateId: lastBrew?.pourTemplateId || templates[0]?.id || null,
    }
  })

  // Changes from last brew
  const [changes] = useState(() => {
    if (!selectedBean) return []
    const changesStr = getChangesForBean(selectedBean.name)
    if (!changesStr) return []
    return changesStr.split('\n').filter(s => s.trim())
  })

  // When bean is selected from picker, reinitialize recipe
  const handleBeanSelect = useCallback((bean) => {
    setSelectedBean(bean)
    const lastBrew = getLastBrewOfBean(bean.name)
    const method = BREW_METHODS.find(m => m.id === equipment?.brewMethod) || BREW_METHODS[0]
    const steps = lastBrew?.recipeSteps
      ? normalizeSteps(lastBrew.recipeSteps)
      : templates[0]?.steps || []
    setRecipe({
      coffeeGrams: lastBrew?.coffeeGrams || 15,
      waterGrams: lastBrew?.waterGrams || 240,
      grindSetting: lastBrew?.grindSetting || '',
      waterTemp: lastBrew?.waterTemp || 200,
      targetTime: lastBrew?.targetTime || method.defaultTotalTime,
      targetTimeRange: lastBrew?.targetTimeRange || '',
      steps,
      pourTemplateId: lastBrew?.pourTemplateId || templates[0]?.id || null,
    })
    setPhase('recipe')
  }, [equipment, templates])

  // Persist active brew state to localStorage
  const persistState = useCallback((brewState) => {
    saveActiveBrew({
      ...brewState,
      beanId: selectedBean?.id,
      beanName: selectedBean?.name,
      recipe,
    })
  }, [selectedBean, recipe])

  // Check for in-progress brew on mount
  useEffect(() => {
    const active = getActiveBrew()
    if (active && active.beanName) {
      const resume = window.confirm(`Resume brew in progress for ${active.beanName}?`)
      if (resume) {
        // Restore state
        const bean = beans.find(b => b.name?.trim().toLowerCase() === active.beanName?.trim().toLowerCase())
        if (bean) {
          setSelectedBean(bean)
          setRecipe(active.recipe)
          setPhase('brew')
          // Timer restore happens inside ActiveBrew via the saved timerState
        }
      } else {
        clearActiveBrew()
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
      {phase !== 'pick' && <PhaseIndicator phase={phase} />}

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
          onStartBrew={() => setPhase('brew')}
        />
      )}

      {phase === 'brew' && (
        <ActiveBrew
          recipe={recipe}
          equipment={equipment}
          onFinish={(data) => { setBrewData(data); setPhase('commit') }}
          onBrewActiveChange={onBrewActiveChange}
          persistState={persistState}
        />
      )}

      {phase === 'commit' && brewData && selectedBean && (
        <PostBrewCommit
          recipe={recipe}
          bean={selectedBean}
          brewData={brewData}
          equipment={equipment}
          onCommit={() => { setPhase('pick'); setBrewData(null); setSelectedBean(null) }}
          onBrewSaved={onBrewSaved}
          setBeans={setBeans}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
