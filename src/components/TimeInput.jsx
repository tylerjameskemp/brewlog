import { useState } from 'react'
import { formatTime, parseFlexTime } from '../data/storage'

// ============================================================
// TIME INPUT — Smart time input accepting seconds or MM:SS
// ============================================================
// Displays MM:SS when blurred. On focus, shows formatted value for editing.
// Accepts flexible input: "90" → 90s, "1:30" → 90s, "1:3" → 63s.
// Commits on blur only — never fires onChange during typing.
//
// Props:
//   value      — time in seconds (number or null)
//   onChange   — called with parsed seconds (integer) on blur
//   className  — optional CSS classes (overrides default styling)
//   placeholder — optional placeholder text
//   disabled   — locks editing
//   label      — optional accessible label text

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
    // Invalid or empty → revert (display snaps back to previous value)
  }

  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-[10px] text-brew-400">{label}</span>}
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
    </div>
  )
}
