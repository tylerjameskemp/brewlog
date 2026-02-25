import { useState } from 'react'

// ============================================================
// STEP EDITOR — Inline pour step editor for brew recipes
// ============================================================
// Each step captures: label, start time, target water, technique note.
// Used in both Recipe phase (planning) and Brew phase (copy-on-write).
// Modeled after FlavorPicker's prop interface: steps + onChange.

function formatTimeDisplay(seconds) {
  if (seconds == null || seconds === '') return ''
  const s = Number(seconds)
  if (isNaN(s)) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function StepRow({ step, index, onChange, onRemove, disabled }) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-brew-50/50 rounded-xl border border-brew-100">
      {/* Row 1: Label, Time, Water, Remove */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-brew-400 uppercase w-5 flex-shrink-0">
          {index + 1}
        </span>
        <input
          type="text"
          value={step.label}
          onChange={(e) => onChange({ ...step, label: e.target.value })}
          placeholder="e.g., Bloom, First pour"
          disabled={disabled}
          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-brew-200 text-sm text-brew-800
                     placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                     disabled:bg-brew-50 disabled:text-brew-500"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            value={step.startTime ?? ''}
            onChange={(e) => onChange({ ...step, startTime: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="0"
            disabled={disabled}
            className="w-16 px-2 py-1.5 rounded-lg border border-brew-200 text-sm font-mono text-brew-800 text-center
                       placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                       disabled:bg-brew-50 disabled:text-brew-500"
          />
          <span className="text-[10px] text-brew-400">sec</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            value={step.targetWater ?? ''}
            onChange={(e) => onChange({ ...step, targetWater: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="—"
            disabled={disabled}
            className="w-16 px-2 py-1.5 rounded-lg border border-brew-200 text-sm font-mono text-brew-800 text-center
                       placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                       disabled:bg-brew-50 disabled:text-brew-500"
          />
          <span className="text-[10px] text-brew-400">g</span>
        </div>
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

      {/* Time display hint */}
      {step.startTime != null && step.startTime !== '' && (
        <div className="ml-7 text-[10px] text-brew-400 -mt-1">
          {formatTimeDisplay(step.startTime)}
        </div>
      )}

      {/* Row 2: Note */}
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

export default function StepEditor({ steps = [], onChange, disabled = false, hint }) {
  const handleStepChange = (index, updatedStep) => {
    const newSteps = [...steps]
    newSteps[index] = updatedStep
    onChange(newSteps)
  }

  const handleRemove = (index) => {
    onChange(steps.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    // Default new step: guess start time from last step
    const lastStep = steps[steps.length - 1]
    const nextTime = lastStep?.startTime != null ? lastStep.startTime + 40 : 0
    onChange([...steps, {
      label: '',
      startTime: nextTime,
      targetWater: null,
      note: '',
    }])
  }

  return (
    <div className="space-y-2">
      {hint && (
        <p className="text-[10px] text-brew-400 mb-1">{hint}</p>
      )}

      {steps.length === 0 && (
        <p className="text-xs text-brew-400 text-center py-2">
          No steps yet. Add your first pour step below.
        </p>
      )}

      {steps.map((step, index) => (
        <StepRow
          key={index}
          step={step}
          index={index}
          onChange={(updated) => handleStepChange(index, updated)}
          onRemove={() => handleRemove(index)}
          disabled={disabled}
        />
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
