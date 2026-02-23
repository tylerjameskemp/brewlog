import { useState } from 'react'
import { FLAVOR_DESCRIPTORS } from '../data/defaults'

// ============================================================
// FLAVOR PICKER — Clickable flavor tag selector
// ============================================================
// FROM YOUR TRANSCRIPT (Feb 6): "pop up a bunch of [flavors] and
// you could click on them or put a custom one in there"
//
// This component shows flavor tags grouped by category.
// Click to toggle them on/off. Selected flavors get highlighted.
// There's also a custom input for flavors not in the list.

export default function FlavorPicker({ selected = [], onChange }) {
  const [customInput, setCustomInput] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)

  // Toggle a flavor on or off
  const toggleFlavor = (flavor) => {
    if (selected.includes(flavor)) {
      onChange(selected.filter(f => f !== flavor))
    } else {
      onChange([...selected, flavor])
    }
  }

  // Add a custom flavor
  const addCustom = () => {
    const trimmed = customInput.trim()
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed])
      setCustomInput('')
    }
  }

  // Category labels with nicer display names
  const categoryLabels = {
    fruity: '🍊 Fruity',
    sweet: '🍫 Sweet',
    nutty: '🥜 Nutty',
    floral: '🌸 Floral',
    earthy: '🌿 Earthy',
    roast: '🔥 Roast',
    off: '⚠️ Off-Notes',
  }

  return (
    <div className="space-y-3">
      {/* Selected flavors shown at top */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-brew-100">
          {selected.map(flavor => (
            <button
              key={flavor}
              onClick={() => toggleFlavor(flavor)}
              className="px-3 py-1 bg-brew-500 text-white text-xs rounded-full
                         font-medium hover:bg-brew-600 transition-colors"
            >
              {flavor} ✕
            </button>
          ))}
        </div>
      )}

      {/* Category buttons — click to expand */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(categoryLabels).map(([category, label]) => (
          <button
            key={category}
            onClick={() => setExpandedCategory(
              expandedCategory === category ? null : category
            )}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${expandedCategory === category
                ? 'border-brew-400 bg-brew-50 text-brew-700'
                : 'border-brew-100 text-brew-500 hover:border-brew-200'
              }
              ${category === 'off' ? 'border-red-200 text-red-500' : ''}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expanded category — show individual flavors */}
      {expandedCategory && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-brew-50/50 rounded-xl">
          {FLAVOR_DESCRIPTORS[expandedCategory]?.map(flavor => (
            <button
              key={flavor}
              onClick={() => toggleFlavor(flavor)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${selected.includes(flavor)
                  ? 'border-brew-500 bg-brew-500 text-white'
                  : 'border-brew-200 bg-white text-brew-600 hover:border-brew-300'
                }
                ${expandedCategory === 'off' && selected.includes(flavor)
                  ? 'border-red-400 bg-red-400 text-white'
                  : ''
                }
              `}
            >
              {flavor}
            </button>
          ))}
        </div>
      )}

      {/* Custom flavor input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Add custom flavor..."
          className="flex-1 px-3 py-2 rounded-lg border border-brew-200 text-sm
                     text-brew-800 placeholder:text-brew-300
                     focus:outline-none focus:ring-2 focus:ring-brew-400"
        />
        <button
          onClick={addCustom}
          className="px-4 py-2 bg-brew-100 text-brew-600 rounded-lg text-sm
                     font-medium hover:bg-brew-200 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
