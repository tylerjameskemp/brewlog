import { useState } from 'react'
import { formatTime, parseFlexTime } from '../data/storage'

// Smart time input: displays MM:SS, accepts "90" or "1:30", commits on blur.
export default function TimeInput({ value, onChange, className, placeholder, disabled, label }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const display = value != null ? formatTime(value) : ''

  const handleFocus = () => {
    setEditing(true)
    setDraft(display)
  }

  const handleBlur = () => {
    setEditing(false)
    const parsed = parseFlexTime(draft)
    if (parsed != null) {
      onChange(parsed)
    }
  }

  const inputEl = (
    <input
      type="text"
      inputMode="text"
      aria-label={label}
      value={editing ? draft : display}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder || '0:00'}
      className={className || `w-14 px-2 py-1.5 rounded-lg border border-brew-200 text-base font-mono text-brew-800 text-center
                 placeholder:text-brew-300 focus:outline-none focus:ring-2 focus:ring-brew-400
                 disabled:bg-brew-50 disabled:text-brew-500`}
    />
  )

  if (!label) return inputEl

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-brew-400">{label}</span>
      {inputEl}
    </div>
  )
}
