import { useState } from 'react'
import { normalizeSteps } from '../data/storage'

// ============================================================
// STEP EDITOR — Inline pour step editor for brew recipes
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

function formatTimeDisplay(seconds) {
  if (seconds == null || seconds === '') return ''
  const s = Number(seconds)
  if (isNaN(s)) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

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
    <span className="text-[9px] text-amber-500 font-medium ml-1">
      {children}
    </span>
  )
}

function StepRow({ step, index, onChange, onRemove, disabled, cascadeTime, diff }) {
  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border ${
      diff?.isAdded ? 'bg-green-50/50 border-green-200' : 'bg-brew-50/50 border-brew-100'
    }`}>
      {/* Row 1: Name, Duration, Time, Water, Remove */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-brew-400 uppercase w-5 flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={step.name || ''}
            onChange={(e) => onChange({ ...step, name: e.target.value })}
            placeholder="e.g., Bloom, First pour"
            disabled={disabled}
            className="w-full px-2 py-1.5 rounded-lg border border-brew-200 text-sm text-brew-800
                       placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                       disabled:bg-brew-50 disabled:text-brew-500"
          />
          {diff?.fields?.name != null && (
            <DiffTag>planned: {diff.fields.name || '(empty)'}</DiffTag>
          )}
        </div>
        {diff?.isAdded && (
          <span className="text-[9px] text-green-600 font-medium bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">
            added
          </span>
        )}
        {!disabled && (
          <button
            onClick={onRemove}
            className="text-brew-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
            aria-label="Remove step"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Duration + Time + Water */}
      <div className="ml-7 flex items-center gap-3 flex-wrap">
        {/* Duration */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            value={step.duration ?? ''}
            onChange={(e) => onChange({ ...step, duration: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="40"
            disabled={disabled}
            className="w-14 px-2 py-1.5 rounded-lg border border-brew-200 text-sm font-mono text-brew-800 text-center
                       placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                       disabled:bg-brew-50 disabled:text-brew-500"
          />
          <span className="text-[10px] text-brew-400">sec</span>
          {diff?.fields?.duration != null && (
            <DiffTag>planned: {diff.fields.duration ?? '—'}s</DiffTag>
          )}
        </div>

        {/* Time (start time) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {cascadeTime ? (
            <span className="w-14 px-2 py-1.5 text-sm font-mono text-brew-500 text-center">
              {formatTimeDisplay(step.time)}
            </span>
          ) : (
            <input
              type="number"
              value={step.time ?? ''}
              onChange={(e) => onChange({ ...step, time: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="0"
              disabled={disabled}
              className="w-14 px-2 py-1.5 rounded-lg border border-brew-200 text-sm font-mono text-brew-800 text-center
                         placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                         disabled:bg-brew-50 disabled:text-brew-500"
            />
          )}
          <span className="text-[10px] text-brew-400">@</span>
          {diff?.fields?.time != null && !cascadeTime && (
            <DiffTag>planned: {formatTimeDisplay(diff.fields.time)}</DiffTag>
          )}
        </div>

        {/* Water */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            value={step.waterTo ?? ''}
            onChange={(e) => onChange({ ...step, waterTo: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="—"
            disabled={disabled}
            className="w-14 px-2 py-1.5 rounded-lg border border-brew-200 text-sm font-mono text-brew-800 text-center
                       placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                       disabled:bg-brew-50 disabled:text-brew-500"
          />
          <span className="text-[10px] text-brew-400">g</span>
          {diff?.fields?.waterTo != null && (
            <DiffTag>planned: {diff.fields.waterTo ?? '—'}g</DiffTag>
          )}
        </div>
      </div>

      {/* Row 3: Note */}
      <div className="ml-7">
        <input
          type="text"
          value={step.note || ''}
          onChange={(e) => onChange({ ...step, note: e.target.value })}
          placeholder="Technique note (optional)"
          disabled={disabled}
          className="w-full px-2 py-1.5 rounded-lg border border-brew-100 text-xs text-brew-700
                     placeholder:text-brew-300 focus:outline-none focus:ring-1 focus:ring-brew-300
                     disabled:bg-brew-50 disabled:text-brew-500"
        />
      </div>
    </div>
  )
}

// Removed step row — shown in diff mode for steps in plan but not in actuals
function RemovedStepRow({ step, index }) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-red-50/30 rounded-xl border border-red-200/50 opacity-60">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-red-300 uppercase w-5 flex-shrink-0">
          {'\u2212'}
        </span>
        <span className="text-sm text-red-400 line-through flex-1">{step.name || `Step ${index + 1}`}</span>
        <span className="text-[9px] text-red-400 font-medium bg-red-100 px-1.5 py-0.5 rounded">
          removed
        </span>
      </div>
      <div className="ml-7 text-[10px] text-red-300">
        {step.duration ? `${step.duration}s` : ''}{step.waterTo ? ` · ${step.waterTo}g` : ''}
      </div>
    </div>
  )
}

export default function StepEditor({ steps = [], onChange, disabled = false, hint, cascadeTime = false, plannedSteps }) {
  const diffData = plannedSteps ? buildDiffMap(steps, plannedSteps) : null

  const handleStepChange = (index, updatedStep) => {
    const newSteps = [...steps]
    newSteps[index] = updatedStep

    // Cascade start times when duration changes
    if (cascadeTime && updatedStep.duration !== steps[index].duration) {
      for (let i = 1; i < newSteps.length; i++) {
        const prevEnd = (newSteps[i - 1].time || 0) + (newSteps[i - 1].duration || 0)
        newSteps[i] = { ...newSteps[i], time: prevEnd }
      }
    }

    onChange(newSteps)
  }

  const handleRemove = (index) => {
    const newSteps = steps.filter((_, i) => i !== index)
    // Re-cascade if needed
    if (cascadeTime) {
      for (let i = 1; i < newSteps.length; i++) {
        const prevEnd = (newSteps[i - 1].time || 0) + (newSteps[i - 1].duration || 0)
        newSteps[i] = { ...newSteps[i], time: prevEnd }
      }
    }
    onChange(newSteps)
  }

  const handleAdd = () => {
    // Default new step: guess start time from last step
    const lastStep = steps[steps.length - 1]
    const nextTime = lastStep ? (lastStep.time || 0) + (lastStep.duration || 40) : 0
    onChange([...steps, {
      id: (steps.length > 0 ? Math.max(...steps.map(s => s.id || 0)) : 0) + 1,
      name: '',
      time: nextTime,
      duration: 40,
      waterTo: null,
      note: '',
    }])
  }

  return (
    <div className="space-y-2">
      {hint && (
        <p className="text-[10px] text-brew-400 mb-1">{hint}</p>
      )}

      {steps.length === 0 && !diffData?.removed?.length && (
        <p className="text-xs text-brew-400 text-center py-2">
          No steps yet. Add your first pour step below.
        </p>
      )}

      {steps.map((step, index) => (
        <StepRow
          key={step.id || index}
          step={step}
          index={index}
          onChange={(updated) => handleStepChange(index, updated)}
          onRemove={() => handleRemove(index)}
          disabled={disabled}
          cascadeTime={cascadeTime}
          diff={diffData?.stepDiffs?.get(step.id)}
        />
      ))}

      {/* Removed steps from plan */}
      {diffData?.removed?.map((step, i) => (
        <RemovedStepRow key={`removed-${step.id}`} step={step} index={i} />
      ))}

      {!disabled && (
        <button
          onClick={handleAdd}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-brew-200 text-sm
                     font-medium text-brew-400 hover:border-brew-300 hover:text-brew-500
                     transition-colors"
        >
          + Add Step
        </button>
      )}
    </div>
  )
}
