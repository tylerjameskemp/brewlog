import { useState, useEffect, useMemo } from 'react'
import { normalizeSteps, formatTime } from '../data/storage'
import TimeInput from './TimeInput'

// ============================================================
// STEP EDITOR — Timeline-based pour step editor for brew recipes
// ============================================================
// Each step captures: name, time (seconds), duration (seconds), waterTo (grams), technique note.
// Used in RecipeAssembly (planning), BrewForm (editing actuals), and anywhere steps are edited.
//
// Props:
//   steps      — array of step objects
//   onChange   — called with updated steps array
//   disabled   — locks all editing
//   hint       — optional help text
//   cascadeTime — when true, duration changes auto-cascade start times; time field becomes read-only
//   plannedSteps — when provided, shows inline diff annotations comparing each step against the plan

// Match actual steps against planned steps by id for diff annotations
function buildDiffMap(actualSteps, plannedSteps) {
  if (!plannedSteps || plannedSteps.length === 0) return null
  const planned = normalizeSteps(plannedSteps)
  const plannedById = new Map(planned.map(s => [s.id, s]))
  const actualIds = new Set(actualSteps.map(s => s.id))

  const stepDiffs = new Map()
  for (const step of actualSteps) {
    const plan = plannedById.get(step.id)
    if (!plan) {
      stepDiffs.set(step.id, { isAdded: true })
      continue
    }
    const fieldDiffs = {}
    for (const field of ['name', 'duration', 'waterTo', 'time']) {
      if (step[field] !== plan[field] && (step[field] != null || plan[field] != null)) {
        fieldDiffs[field] = plan[field]
      }
    }
    if (Object.keys(fieldDiffs).length > 0) {
      stepDiffs.set(step.id, { fields: fieldDiffs })
    }
  }

  // Find removed steps (in plan but not in actuals)
  const removed = planned.filter(s => !actualIds.has(s.id))

  return { stepDiffs, removed }
}

function DiffTag({ children }) {
  return (
    <span className="text-[10px] text-amber-500 font-medium ml-1">
      {children}
    </span>
  )
}

// Build "0:00 → 0:40" time range string from a step
function stepTimeRange(step) {
  const startTime = step.time || 0
  const endTime = step.duration != null ? startTime + step.duration : null
  return `${formatTime(startTime)} → ${endTime != null ? formatTime(endTime) : ''}`
}

// ─── Collapsed One-Liner ───────────────────────────────────
// Shows: timeRange · name · pour to Xg
function StepOneLiner({ step, index, diff, onClick, disabled }) {
  const timeRange = stepTimeRange(step)
  const name = step.name || `Step ${index + 1}`
  const water = step.waterTo != null ? `pour to ${step.waterTo}g` : null

  const borderClass = diff?.isAdded
    ? 'border-l-2 border-green-400'
    : diff?.fields ? 'border-l-2 border-amber-400'
    : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2.5 rounded-lg bg-brew-50/50
                  border border-brew-100 ${borderClass}
                  flex items-center gap-2 min-h-[44px]
                  hover:bg-brew-50 transition-colors
                  disabled:hover:bg-brew-50/50 disabled:cursor-default`}
    >
      {/* Timeline dot */}
      <span className="w-2 h-2 rounded-full bg-brew-300 flex-shrink-0" />
      {/* Content */}
      <span className="text-sm text-brew-700 truncate flex-1 min-w-0">
        <span className="font-mono text-brew-500">{timeRange}</span>
        <span className="text-brew-300 mx-1">&middot;</span>
        <span className="font-medium">{name}</span>
        {water && (
          <>
            <span className="text-brew-300 mx-1">&middot;</span>
            <span className="text-brew-400">{water}</span>
          </>
        )}
      </span>
      {diff?.isAdded && (
        <span className="text-[10px] text-green-600 font-medium bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">
          added
        </span>
      )}
      {/* Expand chevron */}
      {!disabled && (
        <span className={`text-brew-400 transition-transform text-xs flex-shrink-0`}>
          &#x25BE;
        </span>
      )}
    </button>
  )
}

// ─── Expanded Step Card ────────────────────────────────────
// Full editing view with time range, water target, note, split/remove
function StepExpanded({ step, index, onChange, onRemove, onSplit, onCollapse,
                        disabled, cascadeTime, diff }) {

  const handleEndTimeChange = (endSeconds) => {
    const startTime = step.time || 0
    const newDuration = Math.max(0, endSeconds - startTime)
    onChange({ ...step, duration: newDuration })
  }

  const handleStartTimeChange = (startSeconds) => {
    onChange({ ...step, time: startSeconds })
  }

  return (
    <div className={`p-3 rounded-xl border bg-parchment-50 shadow-sm
                    animate-fade-in motion-reduce:animate-none ${
      diff?.isAdded ? 'border-green-200' : 'border-brew-200'
    }`}>
      {/* Header: step number + name + collapse/remove buttons */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-brew-500 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-brew-400 uppercase w-4 flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={step.name || ''}
            onChange={(e) => onChange({ ...step, name: e.target.value })}
            placeholder="e.g., Bloom, First pour"
            disabled={disabled}
            className="w-full px-2 py-1.5 rounded-xl border border-brew-200 text-base text-brew-800
                       placeholder:text-ceramic-400 focus:outline-none focus:ring-2 focus:ring-brew-400
                       disabled:bg-brew-50 disabled:text-ceramic-400"
          />
          {diff?.fields?.name != null && (
            <DiffTag>planned: {diff.fields.name || '(empty)'}</DiffTag>
          )}
        </div>
        {diff?.isAdded && (
          <span className="text-[10px] text-green-600 font-medium bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">
            added
          </span>
        )}
        <button
          onClick={onCollapse}
          className="text-brew-400 hover:text-brew-700 transition-colors p-1 flex-shrink-0 min-h-[44px] min-w-[44px]
                     flex items-center justify-center"
          aria-label="Collapse step"
        >
          <span className="text-xs rotate-180">&#x25BE;</span>
        </button>
        {!disabled && (
          <button
            onClick={onRemove}
            className="text-brew-300 hover:text-red-400 transition-colors p-1 flex-shrink-0
                       min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Remove step"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Time range row: from → to (duration) */}
      <div className="ml-8 flex items-center gap-2 mb-2 flex-wrap">
        <TimeInput
          label="from"
          value={step.time}
          onChange={handleStartTimeChange}
          disabled={disabled || cascadeTime}
          placeholder="0"
        />
        <span className="text-brew-300 text-sm">&rarr;</span>
        <TimeInput
          label="to"
          value={(step.time || 0) + (step.duration || 0)}
          onChange={handleEndTimeChange}
          disabled={disabled}
          placeholder="40"
        />
        <span className="text-[10px] text-brew-400 ml-1">
          ({formatTime(step.duration || 0)})
        </span>
        {diff?.fields?.duration != null && (
          <DiffTag>planned: {formatTime(diff.fields.duration)}</DiffTag>
        )}
        {diff?.fields?.time != null && !cascadeTime && (
          <DiffTag>planned: {formatTime(diff.fields.time)}</DiffTag>
        )}
      </div>

      {/* Water target row */}
      <div className="ml-8 flex items-center gap-2 mb-2">
        <span className="text-[10px] text-brew-400">pour to</span>
        <input
          type="number"
          value={step.waterTo ?? ''}
          onChange={(e) => onChange({ ...step, waterTo: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="\u2014"
          disabled={disabled}
          className="w-16 px-2 py-1.5 rounded-xl border border-brew-200 text-base font-mono text-brew-800 text-center
                     placeholder:text-ceramic-400 focus:outline-none focus:ring-2 focus:ring-brew-400
                     disabled:bg-brew-50 disabled:text-ceramic-400"
        />
        <span className="text-[10px] text-brew-400">g</span>
        {diff?.fields?.waterTo != null && (
          <DiffTag>planned: {diff.fields.waterTo ?? '\u2014'}g</DiffTag>
        )}
      </div>

      {/* Technique note */}
      <div className="ml-8 mb-2">
        <input
          type="text"
          value={step.note || ''}
          onChange={(e) => onChange({ ...step, note: e.target.value })}
          placeholder="Technique note (optional)"
          disabled={disabled}
          className="w-full px-2 py-1.5 rounded-xl border border-brew-100 text-base text-brew-700
                     placeholder:text-ceramic-400 focus:outline-none focus:ring-2 focus:ring-brew-400
                     disabled:bg-brew-50 disabled:text-ceramic-400"
        />
      </div>

      {/* Split button — only in planning context (cascadeTime) */}
      {!disabled && cascadeTime && (step.duration || 0) > 0 && (
        <div className="ml-8">
          <button
            onClick={onSplit}
            className="text-[10px] text-brew-400 hover:text-brew-700 transition-colors py-1 min-h-[44px]
                       flex items-center"
          >
            Split step
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Removed Step (one-liner for diff mode) ────────────────
function RemovedStepOneLiner({ step }) {
  const timeRange = stepTimeRange(step)
  const name = step.name || `Step #${step.id}`

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50/30 border border-red-200/50 opacity-60 min-h-[44px]">
      <span className="w-2 h-2 rounded-full bg-red-300 flex-shrink-0" />
      <span className="text-sm text-red-400 line-through truncate flex-1 min-w-0">
        <span className="font-mono">{timeRange}</span>
        <span className="mx-1">&middot;</span>
        <span>{name}</span>
        {step.waterTo != null && (
          <>
            <span className="mx-1">&middot;</span>
            <span>{step.waterTo}g</span>
          </>
        )}
      </span>
      <span className="text-[10px] text-red-400 font-medium bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">
        removed
      </span>
    </div>
  )
}

// Recalculate start times from step durations (step 0 keeps its time).
// Mutates the array in-place for use with already-cloned arrays.
function recascade(steps) {
  for (let i = 1; i < steps.length; i++) {
    const prevEnd = (steps[i - 1].time || 0) + (steps[i - 1].duration || 0)
    steps[i] = { ...steps[i], time: prevEnd }
  }
  return steps
}

export default function StepEditor({ steps = [], onChange, disabled = false, hint, cascadeTime = false, plannedSteps }) {
  const [expandedStepId, setExpandedStepId] = useState(null)

  // Collapse expanded step when editing becomes disabled
  useEffect(() => {
    if (disabled) setExpandedStepId(null)
  }, [disabled])

  const diffData = useMemo(
    () => plannedSteps ? buildDiffMap(steps, plannedSteps) : null,
    [steps, plannedSteps]
  )

  const handleToggle = (stepId) => {
    setExpandedStepId(prev => prev === stepId ? null : stepId)
  }

  const handleStepChange = (index, updatedStep) => {
    const newSteps = [...steps]
    newSteps[index] = updatedStep
    if (cascadeTime && updatedStep.duration !== steps[index].duration) recascade(newSteps)
    onChange(newSteps)
  }

  const handleRemove = (index) => {
    const newSteps = steps.filter((_, i) => i !== index)
    if (cascadeTime) recascade(newSteps)
    onChange(newSteps)
    // If the removed step was expanded, collapse
    if (steps[index] && expandedStepId === steps[index].id) {
      setExpandedStepId(null)
    }
  }

  const handleSplit = (index) => {
    const step = steps[index]
    const d1 = Math.floor((step.duration || 0) / 2)
    const d2 = (step.duration || 0) - d1
    const ids = steps.map(s => s.id || 0)
    const newId = (ids.length > 0 ? Math.max(...ids) : 0) + 1
    // Strip existing "(N)" suffix before re-numbering to prevent accumulation
    const baseName = (step.name || `Step ${index + 1}`).replace(/\s*\(\d+\)$/, '')

    const newSteps = [...steps]
    newSteps.splice(index, 1,
      { ...step, duration: d1, name: `${baseName} (1)` },
      { id: newId, name: `${baseName} (2)`, time: (step.time || 0) + d1,
        duration: d2, waterTo: null, note: '' }
    )
    if (cascadeTime) recascade(newSteps)
    onChange(newSteps)
    setExpandedStepId(newId) // auto-expand the new second half
  }

  const handleAdd = () => {
    const lastStep = steps[steps.length - 1]
    const nextTime = lastStep ? (lastStep.time || 0) + (lastStep.duration || 40) : 0
    const newId = (steps.length > 0 ? Math.max(...steps.map(s => s.id || 0)) : 0) + 1
    onChange([...steps, {
      id: newId,
      name: '',
      time: nextTime,
      duration: 40,
      waterTo: null,
      note: '',
    }])
    setExpandedStepId(newId) // auto-expand new step
  }

  return (
    <div className="space-y-1.5">
      {hint && (
        <p className="text-[10px] text-brew-400 mb-1">{hint}</p>
      )}

      {steps.length === 0 && !diffData?.removed?.length && (
        <p className="text-xs text-brew-400 text-center py-2">
          No steps yet. Add your first pour step below.
        </p>
      )}

      {/* Timeline container */}
      <div className="relative">
        {/* Vertical timeline line */}
        {steps.length > 1 && (
          <div className="absolute left-[7px] top-4 bottom-4 w-px bg-brew-200" />
        )}

        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const isExpanded = expandedStepId === step.id
            const diff = diffData?.stepDiffs?.get(step.id)

            return isExpanded && !disabled ? (
              <StepExpanded
                key={step.id}
                step={step}
                index={index}
                onChange={(updated) => handleStepChange(index, updated)}
                onRemove={() => handleRemove(index)}
                onSplit={() => handleSplit(index)}
                onCollapse={() => setExpandedStepId(null)}
                disabled={disabled}
                cascadeTime={cascadeTime}
                diff={diff}
              />
            ) : (
              <StepOneLiner
                key={step.id}
                step={step}
                index={index}
                diff={diff}
                onClick={() => !disabled && handleToggle(step.id)}
                disabled={disabled}
              />
            )
          })}

          {/* Removed steps from plan (diff mode) */}
          {diffData?.removed?.map((step) => (
            <RemovedStepOneLiner key={`removed-${step.id}`} step={step} />
          ))}
        </div>
      </div>

      {!disabled && (
        <button
          onClick={handleAdd}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-brew-200 text-sm
                     font-medium text-brew-400 hover:border-brew-300 hover:text-brew-500
                     transition-colors min-h-[44px]"
        >
          + Add Step
        </button>
      )}
    </div>
  )
}
