import { useState } from 'react'
import { deleteBrew } from '../data/storage'
import { RATING_SCALE } from '../data/defaults'

// ============================================================
// BREW HISTORY — View and compare past brews
// ============================================================
// Shows a timeline of your brews with key details.
// Click a brew to expand and see full details.
// The "diff" between consecutive brews is shown automatically —
// this is the "what changed" feature from your concept.

export default function BrewHistory({ brews, onBrewsChange }) {
  const [expandedId, setExpandedId] = useState(null)

  if (brews.length === 0) {
    return (
      <div className="mt-12 text-center text-brew-400">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-lg font-medium">No brews logged yet</p>
        <p className="text-sm mt-1">Go brew some coffee and come back!</p>
      </div>
    )
  }

  // Format an ISO date string to something readable
  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Format seconds to m:ss
  const formatTime = (seconds) => {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Compute differences between a brew and the one before it
  const getDiff = (brew, index) => {
    const prev = brews[index + 1] // Previous brew (older, next in array)
    if (!prev) return null

    const diffs = []
    if (brew.grindSetting !== prev.grindSetting) {
      const dir = brew.grindSetting > prev.grindSetting ? '↑' : '↓'
      diffs.push(`Grind ${dir} ${prev.grindSetting} → ${brew.grindSetting}`)
    }
    if (brew.coffeeGrams !== prev.coffeeGrams) {
      diffs.push(`Dose: ${prev.coffeeGrams}g → ${brew.coffeeGrams}g`)
    }
    if (brew.waterGrams !== prev.waterGrams) {
      diffs.push(`Water: ${prev.waterGrams}g → ${brew.waterGrams}g`)
    }
    if (brew.waterTemp !== prev.waterTemp) {
      diffs.push(`Temp: ${prev.waterTemp}° → ${brew.waterTemp}°`)
    }
    if (brew.bloomTime !== prev.bloomTime) {
      diffs.push(`Bloom: ${prev.bloomTime}s → ${brew.bloomTime}s`)
    }
    if (brew.beanName !== prev.beanName) {
      diffs.push(`New beans: ${brew.beanName}`)
    }

    return diffs.length > 0 ? diffs : null
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this brew?')) {
      const updated = deleteBrew(id)
      onBrewsChange(updated)
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-brew-800">
          Brew History
        </h2>
        <span className="text-xs text-brew-400">{brews.length} brews logged</span>
      </div>

      {brews.map((brew, index) => {
        const isExpanded = expandedId === brew.id
        const diff = getDiff(brew, index)
        const ratingInfo = RATING_SCALE.find(r => r.value === brew.rating)

        return (
          <div
            key={brew.id}
            className="bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden"
          >
            {/* Summary row — always visible */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : brew.id)}
              className="w-full px-5 py-4 flex items-center gap-4 text-left
                         hover:bg-brew-50/50 transition-colors"
            >
              {/* Rating emoji */}
              <div className="text-2xl flex-shrink-0">
                {ratingInfo?.emoji || '☕'}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-brew-800 truncate">
                    {brew.beanName || 'Unknown beans'}
                  </span>
                  {brew.roaster && (
                    <span className="text-xs text-brew-400">{brew.roaster}</span>
                  )}
                </div>
                <div className="text-xs text-brew-400 mt-0.5">
                  {formatDate(brew.brewedAt)}
                </div>
              </div>

              {/* Key params */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-mono text-brew-600">
                  {brew.coffeeGrams}g / {brew.waterGrams}g
                </div>
                <div className="text-xs font-mono text-brew-400">
                  grind {brew.grindSetting} • {formatTime(brew.totalTime)}
                </div>
              </div>
            </button>

            {/* Changes from previous brew */}
            {diff && !isExpanded && (
              <div className="px-5 pb-3 -mt-1">
                <div className="flex flex-wrap gap-1.5">
                  {diff.map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-5 pb-5 border-t border-brew-50">
                {/* Flavors */}
                {brew.flavors?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-brew-500">Flavors: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {brew.flavors.map(f => (
                        <span key={f} className="px-2 py-0.5 bg-brew-100 text-brew-600 rounded-full text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body */}
                {brew.body && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-brew-500">Body: </span>
                    <span className="text-xs text-brew-700">{brew.body}</span>
                  </div>
                )}

                {/* Issues */}
                {brew.issues?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-brew-500">Issues: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {brew.issues.map(i => (
                        <span key={i} className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs">
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full diff */}
                {diff && (
                  <div className="mt-3 p-3 bg-amber-50/50 rounded-xl">
                    <span className="text-xs font-medium text-amber-700">Changes from previous:</span>
                    <div className="mt-1 space-y-0.5">
                      {diff.map((d, i) => (
                        <div key={i} className="text-xs text-amber-600">→ {d}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {brew.notes && (
                  <div className="mt-3 p-3 bg-brew-50 rounded-xl">
                    <span className="text-xs font-medium text-brew-500">Notes:</span>
                    <p className="text-sm text-brew-700 mt-1 whitespace-pre-wrap">{brew.notes}</p>
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(brew.id)}
                  className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Delete this brew
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
