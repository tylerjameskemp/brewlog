import { useState, useMemo } from 'react'
import { deleteBrew, getUIPref, setUIPref, normalizeSteps } from '../data/storage'
import { RATING_SCALE, BREW_METHODS, GRINDERS, grindToNumeric, getMethodName, getGrinderName } from '../data/defaults'

// ============================================================
// BREW HISTORY — View and compare past brews
// ============================================================
// Shows a timeline of your brews with key details.
// Click a brew to expand and see full details.
// The "diff" between consecutive brews is shown automatically —
// this is the "what changed" feature from your concept.
//
// COMPARE MODE: Toggle to select 2 brews and see a side-by-side
// comparison with differences highlighted in amber.

// --- Comparison helpers (pure functions) ---

function formatTime(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function stepsChanged(a, b) {
  const na = normalizeSteps(a), nb = normalizeSteps(b)
  if (na.length !== nb.length) return true
  for (let i = 0; i < na.length; i++) {
    if (na[i].name !== nb[i].name || na[i].waterTo !== nb[i].waterTo ||
        na[i].time !== nb[i].time || na[i].duration !== nb[i].duration) return true
  }
  return false
}

function compareBrews(brewA, brewB) {
  const fields = [
    { key: 'coffeeGrams', label: 'Dose', unit: 'g', section: 'recipe' },
    { key: 'waterGrams', label: 'Water', unit: 'g', section: 'recipe' },
    { key: 'grindSetting', label: 'Grind', unit: '', section: 'recipe' },
    { key: 'waterTemp', label: 'Temp', unit: '°F', section: 'recipe' },
    { key: 'targetTime', label: 'Target Time', format: formatTime, section: 'recipe' },
    { key: 'totalTime', label: 'Total Time', format: formatTime, section: 'brew' },
  ]

  const diffs = []
  const params = []

  for (const field of fields) {
    const a = brewA[field.key]
    const b = brewB[field.key]
    const changed = a !== b
    const fmt = field.format || (v => v != null ? `${v}${field.unit}` : '—')
    params.push({ ...field, a, b, changed, aFormatted: fmt(a), bFormatted: fmt(b) })
    if (changed) diffs.push(field.label)
  }

  // Ratio (derived)
  const ratioA = brewA.coffeeGrams ? brewA.waterGrams / brewA.coffeeGrams : 0
  const ratioB = brewB.coffeeGrams ? brewB.waterGrams / brewB.coffeeGrams : 0
  const ratioChanged = ratioA.toFixed(1) !== ratioB.toFixed(1)
  params.push({
    key: 'ratio', label: 'Ratio', section: 'recipe',
    a: ratioA, b: ratioB, changed: ratioChanged,
    aFormatted: ratioA ? `1:${ratioA.toFixed(1)}` : '—',
    bFormatted: ratioB ? `1:${ratioB.toFixed(1)}` : '—',
  })
  if (ratioChanged) diffs.push('Ratio')
  if (stepsChanged(brewA.recipeSteps, brewB.recipeSteps) || stepsChanged(brewA.steps, brewB.steps)) {
    diffs.push('Pour steps')
  }

  // Array fields — flavors
  const flavorsA = brewA.flavors || []
  const flavorsB = brewB.flavors || []
  const sharedFlavors = flavorsA.filter(f => flavorsB.includes(f))
  const uniqueA = flavorsA.filter(f => !flavorsB.includes(f))
  const uniqueB = flavorsB.filter(f => !flavorsA.includes(f))
  const flavorsChanged = uniqueA.length > 0 || uniqueB.length > 0

  // Array fields — issues
  const issuesA = brewA.issues || []
  const issuesB = brewB.issues || []
  const sharedIssues = issuesA.filter(i => issuesB.includes(i))
  const uniqueIssuesA = issuesA.filter(i => !issuesB.includes(i))
  const uniqueIssuesB = issuesB.filter(i => !issuesA.includes(i))

  // Simple fields
  const simpleChanges = []
  if (brewA.beanName !== brewB.beanName) simpleChanges.push('Bean')
  if (brewA.roaster !== brewB.roaster) simpleChanges.push('Roaster')
  if (brewA.body !== brewB.body) simpleChanges.push('Body')
  if (brewA.rating !== brewB.rating) simpleChanges.push('Rating')
  if ((brewA.method || '') !== (brewB.method || '')) simpleChanges.push('Method')
  if ((brewA.grinder || '') !== (brewB.grinder || '')) simpleChanges.push('Grinder')
  if ((brewA.dripper || '') !== (brewB.dripper || '')) simpleChanges.push('Dripper')
  if ((brewA.filterType || '') !== (brewB.filterType || '')) simpleChanges.push('Filter')

  // Body
  const bodyChanged = (brewA.body || '') !== (brewB.body || '')

  // Rating
  const ratingA = RATING_SCALE.find(r => r.value === brewA.rating)
  const ratingB = RATING_SCALE.find(r => r.value === brewB.rating)
  const ratingChanged = brewA.rating !== brewB.rating

  return {
    params,
    diffs: [...diffs, ...simpleChanges],
    flavors: { shared: sharedFlavors, uniqueA, uniqueB },
    flavorsChanged,
    issues: { shared: sharedIssues, uniqueA: uniqueIssuesA, uniqueB: uniqueIssuesB },
    issuesChanged: uniqueIssuesA.length > 0 || uniqueIssuesB.length > 0,
    body: {
      a: brewA.body || '—', b: brewB.body || '—', changed: bodyChanged,
    },
    rating: {
      a: ratingA ? `${ratingA.emoji} ${ratingA.label}` : '—',
      b: ratingB ? `${ratingB.emoji} ${ratingB.label}` : '—',
      changed: ratingChanged,
    },
  }
}

function ComparisonRow({ label, valueA, valueB, changed }) {
  return (
    <div className={`flex items-center py-2 px-3 ${changed ? 'bg-amber-50/50' : ''}`}>
      <div className="w-[35%] text-xs font-medium text-brew-500">{label}</div>
      <div className={`w-[32.5%] text-xs font-mono ${changed ? 'text-amber-700 font-semibold' : 'text-brew-700'}`}>
        {valueA}
      </div>
      <div className={`w-[32.5%] text-xs font-mono ${changed ? 'text-amber-700 font-semibold' : 'text-brew-700'}`}>
        {valueB}
      </div>
    </div>
  )
}

function TagComparison({ label, shared, uniqueA, uniqueB, changed, sharedClass, uniqueClass }) {
  if (shared.length === 0 && uniqueA.length === 0 && uniqueB.length === 0) return null
  return (
    <div className={`px-3 py-2 ${changed ? 'bg-amber-50/50' : ''}`}>
      <div className="text-xs font-medium text-brew-500 mb-1.5">{label}</div>
      <div className="flex gap-4">
        {[uniqueA, uniqueB].map((unique, col) => (
          <div key={col} className="flex-1">
            <div className="flex flex-wrap gap-1">
              {shared.map(t => (
                <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] ${sharedClass}`}>{t}</span>
              ))}
              {unique.map(t => (
                <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${uniqueClass}`}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Main component ---

export default function BrewHistory({ brews, onBrewsChange, onNavigate, onEditBrew }) {
  const [expandedId, setExpandedId] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [showDiffHint, setShowDiffHint] = useState(() => !getUIPref('seenDiffExplanation'))

  if (brews.length === 0) {
    return (
      <div className="mt-12 text-center text-brew-400 animate-fade-in-up motion-reduce:animate-none">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-lg font-medium text-brew-700">No brews logged yet</p>
        <p className="text-sm mt-2 text-brew-400 max-w-xs mx-auto">
          Your brew history will show up here with details on what you changed between sessions.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('brew')}
            className="mt-5 px-6 py-3 bg-brew-600 text-white rounded-xl font-medium
                       hover:bg-brew-700 active:scale-[0.98] transition-all"
          >
            Log Your First Brew
          </button>
        )}
      </div>
    )
  }

  // Compute differences between same-bean brews (memoized)
  const diffsMap = useMemo(() => {
    // Build same-bean previous-brew lookup (brews sorted newest-first)
    const lastSeenByBean = {}
    const prevByBean = {}
    for (const brew of brews) {
      if (lastSeenByBean[brew.beanName]) {
        prevByBean[brew.id] = lastSeenByBean[brew.beanName]
      }
      lastSeenByBean[brew.beanName] = brew
    }

    const map = {}
    for (const brew of brews) {
      const prev = prevByBean[brew.id]
      if (!prev) continue

      const diffs = []
      const currGrind = grindToNumeric(brew.grindSetting)
      const prevGrind = grindToNumeric(prev.grindSetting)
      if (currGrind != null && prevGrind != null && currGrind !== prevGrind) {
        const dir = currGrind > prevGrind ? '↑' : '↓'
        diffs.push(`Grind ${dir} ${prev.grindSetting} → ${brew.grindSetting}`)
      } else if (String(brew.grindSetting) !== String(prev.grindSetting)) {
        diffs.push(`Grind: ${prev.grindSetting} → ${brew.grindSetting}`)
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
      if (stepsChanged(brew.recipeSteps, prev.recipeSteps) || stepsChanged(brew.steps, prev.steps)) {
        diffs.push('Pour plan changed')
      }
      if (brew.targetTime !== prev.targetTime && (brew.targetTime || prev.targetTime)) {
        diffs.push(`Target: ${formatTime(prev.targetTime) || '—'} → ${formatTime(brew.targetTime) || '—'}`)
      }
      if ((brew.method || '') !== (prev.method || '')) {
        diffs.push(`Method: ${getMethodName(brew.method)}`)
      }
      if ((brew.grinder || '') !== (prev.grinder || '')) {
        diffs.push(`Grinder: ${getGrinderName(brew.grinder)}`)
      }
      if ((brew.dripper || '') !== (prev.dripper || '')) {
        diffs.push(`Dripper: ${brew.dripper}`)
      }

      if (diffs.length > 0) map[brew.id] = diffs
    }
    return map
  }, [brews])

  const handleDelete = (id) => {
    if (window.confirm('Delete this brew?')) {
      const updated = deleteBrew(id)
      onBrewsChange(updated)
      setSelectedIds(prev => prev.filter(sid => sid !== id))
    }
  }

  const handleCardClick = (brew) => {
    if (!compareMode) {
      setExpandedId(expandedId === brew.id ? null : brew.id)
      return
    }

    // Compare mode selection logic (updater function prevents stale closure on fast taps)
    setSelectedIds(prev => {
      if (prev.includes(brew.id)) {
        return prev.filter(id => id !== brew.id)
      }
      if (prev.length >= 2) return prev
      return [...prev, brew.id]
    })
  }

  // Get the two selected brews sorted older-on-left
  const getComparisonBrews = () => {
    if (selectedIds.length !== 2) return null
    const selected = selectedIds.map(id => brews.find(b => b.id === id)).filter(Boolean)
    if (selected.length !== 2) return null
    // Sort by brewedAt — older first (left column)
    return selected.sort((a, b) => new Date(a.brewedAt) - new Date(b.brewedAt))
  }

  const comparisonBrews = getComparisonBrews()
  const comparison = comparisonBrews ? compareBrews(comparisonBrews[0], comparisonBrews[1]) : null

  return (
    <div className="mt-6 space-y-3">
      {/* Header with compare toggle */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-brew-800">Brew History</h2>
          <p className="text-xs text-brew-400 mt-0.5">{brews.length} brews logged</p>
        </div>
        {brews.length >= 2 && (
          <button
            onClick={() => {
              setCompareMode(!compareMode)
              setSelectedIds([])
              setExpandedId(null)
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              compareMode
                ? 'bg-amber-100 text-amber-700'
                : 'bg-brew-100 text-brew-600 hover:bg-brew-200'
            }`}
          >
            {compareMode ? 'Done' : 'Compare'}
          </button>
        )}
      </div>

      {/* Selection hint */}
      {compareMode && selectedIds.length < 2 && (
        <div className="px-4 py-3 bg-amber-50 rounded-xl text-sm text-amber-700 text-center">
          {selectedIds.length === 0
            ? 'Tap two brews to compare them'
            : 'Tap one more brew to compare'}
        </div>
      )}

      {/* Comparison panel */}
      {comparison && comparisonBrews && (
        <div className="bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden">
          {/* What Changed summary */}
          <div className="px-5 py-4 border-b border-brew-50">
            <h3 className="text-xs font-semibold text-brew-800 uppercase tracking-wide mb-2">What Changed</h3>
            {comparison.diffs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {comparison.diffs.map(d => (
                  <span key={d} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium">
                    {d}
                  </span>
                ))}
                {comparison.flavorsChanged && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium">
                    Flavors
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-brew-400">No differences in brew parameters</p>
            )}
          </div>

          {/* Brew headers */}
          <div className="flex border-b border-brew-50">
            {comparisonBrews.map((brew, i) => {
              const ratingInfo = RATING_SCALE.find(r => r.value === brew.rating)
              return (
                <div key={brew.id} className={`flex-1 px-4 py-3 ${i === 0 ? 'border-r border-brew-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ratingInfo?.emoji || '☕'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-brew-800 truncate">
                        {brew.beanName || 'Unknown beans'}
                      </div>
                      {brew.roaster && (
                        <div className="text-[10px] text-brew-400">{brew.roaster}</div>
                      )}
                      <div className="text-[10px] text-brew-400">{formatDate(brew.brewedAt)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recipe section */}
          <div className="border-b border-brew-50">
            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-brew-400 uppercase tracking-wide">Recipe</span>
            </div>
            {comparison.params.filter(p => p.section === 'recipe').map(p => (
              <ComparisonRow
                key={p.key}
                label={p.label}
                valueA={p.aFormatted}
                valueB={p.bFormatted}
                changed={p.changed}
              />
            ))}
          </div>

          {/* Brew section */}
          <div className="border-b border-brew-50">
            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-brew-400 uppercase tracking-wide">Brew</span>
            </div>
            {comparison.params.filter(p => p.section === 'brew').map(p => (
              <ComparisonRow
                key={p.key}
                label={p.label}
                valueA={p.aFormatted}
                valueB={p.bFormatted}
                changed={p.changed}
              />
            ))}

            {/* Issues */}
            {(comparison.issues.shared.length > 0 || comparison.issues.uniqueA.length > 0 || comparison.issues.uniqueB.length > 0) && (
              <TagComparison
                label="Issues"
                shared={comparison.issues.shared}
                uniqueA={comparison.issues.uniqueA}
                uniqueB={comparison.issues.uniqueB}
                changed={comparison.issuesChanged}
                sharedClass="bg-red-50 text-red-500"
                uniqueClass="bg-amber-100 text-amber-700"
              />
            )}

            {/* Notes */}
            {(comparisonBrews[0].notes || comparisonBrews[1].notes) && (
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-brew-500 mb-1.5">Notes</div>
                <div className="flex gap-3">
                  <div className="flex-1 p-2 bg-brew-50 rounded-xl">
                    <p className="text-xs text-brew-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {comparisonBrews[0].notes || '—'}
                    </p>
                  </div>
                  <div className="flex-1 p-2 bg-brew-50 rounded-xl">
                    <p className="text-xs text-brew-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {comparisonBrews[1].notes || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tasting section */}
          <div className="border-b border-brew-50">
            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] font-semibold text-brew-400 uppercase tracking-wide">Tasting</span>
            </div>

            {/* Flavors */}
            <TagComparison
              label="Flavors"
              shared={comparison.flavors.shared}
              uniqueA={comparison.flavors.uniqueA}
              uniqueB={comparison.flavors.uniqueB}
              changed={comparison.flavorsChanged}
              sharedClass="bg-brew-100 text-brew-600"
              uniqueClass="bg-amber-100 text-amber-700"
            />

            {/* Body */}
            <ComparisonRow
              label="Body"
              valueA={comparison.body.a}
              valueB={comparison.body.b}
              changed={comparison.body.changed}
            />

            {/* Rating */}
            <ComparisonRow
              label="Rating"
              valueA={comparison.rating.a}
              valueB={comparison.rating.b}
              changed={comparison.rating.changed}
            />
          </div>
        </div>
      )}

      {/* Diff badge explanation (one-time) */}
      {showDiffHint && !compareMode && brews.length >= 2 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-fade-in-up motion-reduce:animate-none">
          <p className="text-xs text-amber-700 flex-1">
            The badges below show what you changed from your previous brew — like grind size, dose, or temperature.
          </p>
          <button
            onClick={() => {
              setUIPref('seenDiffExplanation', true)
              setShowDiffHint(false)
            }}
            className="text-amber-400 hover:text-amber-600 text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Brew list */}
      {brews.map((brew, index) => {
        const isExpanded = !compareMode && expandedId === brew.id
        const isSelected = selectedIds.includes(brew.id)
        const selectionNumber = isSelected ? selectedIds.indexOf(brew.id) + 1 : null
        const diff = diffsMap[brew.id] || null
        const ratingInfo = RATING_SCALE.find(r => r.value === brew.rating)
        const actualSteps = isExpanded ? normalizeSteps(brew.steps) : []
        const recipeSteps = isExpanded ? normalizeSteps(brew.recipeSteps) : []

        return (
          <div
            key={brew.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
              isSelected
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-brew-100'
            }`}
          >
            {/* Summary row — always visible */}
            <button
              onClick={() => handleCardClick(brew)}
              className="w-full px-5 py-4 flex items-center gap-4 text-left
                         hover:bg-brew-50/50 transition-colors"
            >
              {/* Selection indicator (compare mode only) */}
              {compareMode && (
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-brew-200'
                }`}>
                  {isSelected && <span className="text-xs font-bold">{selectionNumber}</span>}
                </div>
              )}

              {/* Rating emoji */}
              <div className="text-2xl flex-shrink-0">
                {ratingInfo?.emoji || '☕'}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-semibold text-brew-800 truncate">
                    {brew.beanName || 'Unknown beans'}
                  </span>
                  {brew.roaster && (
                    <span className="text-xs text-brew-400 truncate">{brew.roaster}</span>
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

            {/* Changes from previous brew (hidden in compare mode) */}
            {!compareMode && diff && !isExpanded && (
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
            <div
              aria-hidden={!isExpanded}
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {isExpanded && <div className="px-5 pb-5 border-t border-brew-50">
                {/* --- RECIPE --- */}
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-brew-400 uppercase tracking-wide">Recipe</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="text-xs">
                      <span className="text-brew-500">Dose:</span>{' '}
                      <span className="font-mono text-brew-700">{brew.coffeeGrams}g</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-brew-500">Water:</span>{' '}
                      <span className="font-mono text-brew-700">{brew.waterGrams}g</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-brew-500">Grind:</span>{' '}
                      <span className="font-mono text-brew-700">{brew.grindSetting}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-brew-500">Temp:</span>{' '}
                      <span className="font-mono text-brew-700">{brew.waterTemp}{'\u00B0'}F</span>
                    </div>
                    {brew.targetTime && (
                      <div className="text-xs">
                        <span className="text-brew-500">Target Time:</span>{' '}
                        <span className="font-mono text-brew-700">{formatTime(brew.targetTime)}</span>
                      </div>
                    )}
                  </div>
                  {/* Equipment */}
                  {(brew.method || brew.grinder || brew.dripper) && (
                    <div className="mt-1.5 text-xs col-span-2">
                      <span className="text-brew-500">Equipment:</span>{' '}
                      <span className="text-brew-700">
                        {[
                          getMethodName(brew.method),
                          getGrinderName(brew.grinder),
                          brew.dripper,
                          brew.filterType?.replace('-', ' '),
                        ].filter(Boolean).join(' \u00b7 ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* --- BREW --- */}
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-brew-400 uppercase tracking-wide">Brew</span>
                  {brew.totalTime && (
                    <div className="mt-1.5 text-xs">
                      <span className="text-brew-500">Total Time:</span>{' '}
                      <span className="font-mono text-brew-700">{formatTime(brew.totalTime)}</span>
                    </div>
                  )}
                  {/* Time deviation — only shown if actual differs from target */}
                  {brew.targetTime && brew.totalTime && brew.totalTime !== brew.targetTime && (
                    <div className="mt-1 text-xs">
                      <span className="text-amber-600">Target {formatTime(brew.targetTime)}, actual {formatTime(brew.totalTime)}</span>
                    </div>
                  )}
                  {actualSteps.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-xs text-brew-500">Actual Pour Steps:</span>
                      <div className="mt-1 space-y-1">
                        {actualSteps.map((step, idx) => {
                          const result = brew.stepResults?.[step.id]
                          return (
                            <div key={`${brew.id}-actual-${idx}`} className="text-xs text-brew-700 font-mono">
                              {step.time != null ? formatTime(step.time) : '—'} · {step.name || `Step ${idx + 1}`}
                              {step.waterTo != null ? ` · ${step.waterTo}g` : ''}
                              {result?.tappedAt != null && (
                                <span className="text-brew-400"> (tapped {formatTime(result.tappedAt)})</span>
                              )}
                              {result?.skipped && (
                                <span className="text-amber-500"> skipped</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {recipeSteps.length > 0 && stepsChanged(brew.recipeSteps, brew.steps) && (
                    <div className="mt-1 text-xs">
                      <span className="text-amber-600">Actual pour steps differed from recipe plan</span>
                    </div>
                  )}
                  {brew.issues?.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-xs text-brew-500">Issues: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {brew.issues.map(i => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs">
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {brew.notes && (
                    <div className="mt-2 p-3 bg-brew-50 rounded-xl">
                      <span className="text-xs font-medium text-brew-500">Notes:</span>
                      <p className="text-sm text-brew-700 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">{brew.notes}</p>
                    </div>
                  )}
                </div>

                {/* --- TASTING --- */}
                {(brew.flavors?.length > 0 || brew.body || brew.rating) && (
                  <div className="mt-3">
                    <span className="text-[10px] font-semibold text-brew-400 uppercase tracking-wide">Tasting</span>
                    {brew.flavors?.length > 0 && (
                      <div className="mt-1.5">
                        <span className="text-xs text-brew-500">Flavors: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {brew.flavors.map(f => (
                            <span key={f} className="px-2 py-0.5 bg-brew-100 text-brew-600 rounded-full text-xs">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {brew.body && (
                      <div className="mt-1.5 text-xs">
                        <span className="text-brew-500">Body: </span>
                        <span className="text-brew-700">{brew.body}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Changes from previous brew */}
                {diff && (
                  <div className="mt-3 p-3 bg-amber-50/50 rounded-xl">
                    <span className="text-xs font-medium text-amber-700">Changes from previous:</span>
                    <div className="mt-1 space-y-0.5">
                      {diff.map((d, i) => (
                        <div key={i} className="text-xs text-amber-600">{'\u2192'} {d}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit & Delete */}
                <div className="mt-3 flex items-center gap-2">
                  {onEditBrew && (
                    <button
                      onClick={() => onEditBrew(brew)}
                      className="text-sm px-3 py-2 min-h-[44px] rounded-lg text-brew-500
                                 hover:text-brew-700 hover:bg-brew-50 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(brew.id)}
                    className="text-sm px-3 py-2 min-h-[44px] rounded-lg text-red-400
                               hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
