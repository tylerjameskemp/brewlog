import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveBean, updateBean, deleteBean, renameBrewBean } from '../data/storage'
import { BEAN_ORIGINS, BEAN_PROCESSES, RATING_SCALE } from '../data/defaults'

// ============================================================
// BEAN LIBRARY — Browse, add, edit, and delete your beans
// ============================================================
// Shows all saved beans as cards with brew counts.
// Click a card to expand and see all brews made with that bean.
// Add/edit beans via a modal form. Delete with inline confirmation.

export default function BeanLibrary({ beans, setBeans, brews, onBrewsChange }) {
  const [expandedBeanId, setExpandedBeanId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingBean, setEditingBean] = useState(null)
  const [deletingBeanId, setDeletingBeanId] = useState(null)

  // Pre-compute brew counts per bean name (normalized for case/whitespace)
  const brewCounts = useMemo(() => {
    const counts = new Map()
    brews.forEach(b => {
      const key = b.beanName?.trim().toLowerCase() || ''
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [brews])

  // Memoize brews for the currently expanded bean
  const expandedBeanBrews = useMemo(() => {
    if (!expandedBeanId) return []
    const expandedBean = beans.find(b => b.id === expandedBeanId)
    if (!expandedBean) return []
    const key = expandedBean.name.trim().toLowerCase()
    return brews.filter(b => b.beanName?.trim().toLowerCase() === key)
  }, [brews, beans, expandedBeanId])

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatBrewDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatTime = (seconds) => {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleOpenAdd = () => {
    setEditingBean(null)
    setShowForm(true)
  }

  const handleOpenEdit = (bean) => {
    setEditingBean(bean)
    setShowForm(true)
  }

  const handleSaveBean = (formData) => {
    if (editingBean) {
      // If bean name changed, cascade the rename to all matching brews
      if (editingBean.name !== formData.name) {
        const updatedBrews = renameBrewBean(editingBean.name, formData.name)
        onBrewsChange(updatedBrews)
      }
      const updated = updateBean(editingBean.id, formData)
      setBeans(updated)
    } else {
      const newBean = {
        id: uuidv4(),
        ...formData,
        addedAt: new Date().toISOString(),
      }
      const updated = saveBean(newBean)
      setBeans(updated)
    }
    setShowForm(false)
    setEditingBean(null)
  }

  const handleDelete = (id) => {
    const updated = deleteBean(id)
    setBeans(updated)
    setDeletingBeanId(null)
    setExpandedBeanId(null)
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-brew-800">
          Your Beans
          {beans.length > 0 && (
            <span className="text-xs text-brew-400 font-normal ml-2">{beans.length} bean{beans.length !== 1 ? 's' : ''}</span>
          )}
        </h2>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-brew-600 text-white rounded-xl text-sm font-medium
                     hover:bg-brew-700 active:scale-[0.98] transition-all"
        >
          + Add Bean
        </button>
      </div>

      {beans.length === 0 ? (
        <div className="mt-12 text-center text-brew-400 animate-fade-in-up motion-reduce:animate-none">
          <div className="text-4xl mb-3">🫘</div>
          <p className="text-lg font-medium text-brew-700">Your Bean Library</p>
          <p className="text-sm mt-2 max-w-xs mx-auto">
            Keep track of every bean you brew. See tasting notes across sessions and
            build your personal catalog. Beans are added automatically when you log a brew,
            or tap "+ Add Bean" to add one manually.
          </p>
        </div>
      ) : (
      <div className="space-y-3">
        {beans.map(bean => {
          const isExpanded = expandedBeanId === bean.id
          const key = bean.name.trim().toLowerCase()
          const count = brewCounts.get(key) || 0
          const beanBrews = isExpanded ? expandedBeanBrews : []
          const meta = [bean.roaster, bean.origin, bean.process].filter(Boolean).join(' · ')

          return (
            <div
              key={bean.id}
              className="bg-white rounded-2xl border border-brew-100 shadow-sm overflow-hidden"
            >
              {/* Card header — clickable to expand */}
              <button
                onClick={() => { setExpandedBeanId(isExpanded ? null : bean.id); setDeletingBeanId(null) }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left
                           hover:bg-brew-50/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-brew-800 truncate">
                      {bean.name}
                    </span>
                  </div>
                  {meta && (
                    <div className="text-xs text-brew-400 mt-0.5 truncate">{meta}</div>
                  )}
                  {bean.roastDate && (
                    <div className="text-xs text-brew-400 mt-0.5">
                      Roasted {formatDate(bean.roastDate)}
                    </div>
                  )}
                </div>

                {/* Brew count + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-brew-500">
                    {count} brew{count !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-brew-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                  isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-5 pb-5 border-t border-brew-50">
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3 mb-4 flex-wrap">
                    <button
                      onClick={() => handleOpenEdit(bean)}
                      className="text-sm px-3 py-2 min-h-[44px] rounded-lg text-brew-500
                                 hover:text-brew-700 hover:bg-brew-50 transition-colors"
                    >
                      Edit bean
                    </button>
                    {deletingBeanId === bean.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-red-500 py-2">Delete this bean? Brews won't be affected.</span>
                        <button
                          onClick={() => handleDelete(bean.id)}
                          className="text-sm px-4 py-2.5 min-h-[44px] font-medium text-red-600
                                     hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingBeanId(null)}
                          className="text-sm px-4 py-2.5 min-h-[44px] text-brew-400
                                     hover:text-brew-600 hover:bg-brew-50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingBeanId(bean.id)}
                        className="text-sm px-3 py-2 min-h-[44px] rounded-lg text-red-400
                                   hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete bean
                      </button>
                    )}
                  </div>

                  {/* Brew list */}
                  {beanBrews.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-brew-500">Brews with this bean:</span>
                      {beanBrews.map(brew => {
                        const ratingInfo = RATING_SCALE.find(r => r.value === brew.rating)
                        return (
                          <div
                            key={brew.id}
                            className="p-3 bg-brew-50/50 rounded-xl flex items-center gap-3"
                          >
                            <div className="text-xl flex-shrink-0">
                              {ratingInfo?.emoji || '☕'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-brew-400">
                                {formatBrewDate(brew.brewedAt)}
                              </div>
                              {brew.flavors?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {brew.flavors.slice(0, 4).map(f => (
                                    <span key={f} className="px-1.5 py-0.5 bg-brew-100 text-brew-600 rounded text-[10px]">
                                      {f}
                                    </span>
                                  ))}
                                  {brew.flavors.length > 4 && (
                                    <span className="text-[10px] text-brew-400">+{brew.flavors.length - 4}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs font-mono text-brew-600">
                                {brew.coffeeGrams}g / {brew.waterGrams}g
                              </div>
                              <div className="text-xs font-mono text-brew-400">
                                grind {brew.grindSetting} • {formatTime(brew.totalTime)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-brew-400 py-4">
                      <p className="text-sm">No brews yet with this bean</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <BeanFormModal
          bean={editingBean}
          beans={beans}
          onSave={handleSaveBean}
          onClose={() => { setShowForm(false); setEditingBean(null) }}
        />
      )}
    </div>
  )
}

// --- TAG SELECT WITH "OTHER" FREETEXT ---
function TagSelectWithOther({ label, options, value, onChange }) {
  const isOther = value && !options.includes(value)
  const [showOtherInput, setShowOtherInput] = useState(isOther)

  const handleTagClick = (option) => {
    if (value === option) {
      onChange('')
    } else {
      onChange(option)
      setShowOtherInput(false)
    }
  }

  const handleOtherClick = () => {
    if (showOtherInput && isOther) {
      onChange('')
      setShowOtherInput(false)
    } else {
      setShowOtherInput(true)
      if (!isOther) onChange('')
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-brew-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => handleTagClick(option)}
            className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all
              ${value === option
                ? 'border-brew-500 bg-brew-500 text-white'
                : 'border-brew-200 text-brew-500 hover:border-brew-300'
              }`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={handleOtherClick}
          className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all
            ${showOtherInput
              ? 'border-brew-500 bg-brew-500 text-white'
              : 'border-brew-200 text-brew-500 hover:border-brew-300'
            }`}
        >
          Other
        </button>
      </div>
      {showOtherInput && (
        <input
          type="text"
          value={isOther ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Custom ${label.toLowerCase()}...`}
          className="mt-2 w-full p-3 rounded-xl border border-brew-200 text-base
                     focus:outline-none focus:ring-2 focus:ring-brew-400"
        />
      )}
    </div>
  )
}

// --- ADD / EDIT BEAN MODAL ---
function BeanFormModal({ bean, beans, onSave, onClose }) {
  const [form, setForm] = useState({
    name: bean?.name || '',
    roaster: bean?.roaster || '',
    origin: bean?.origin || '',
    process: bean?.process || '',
    roastDate: bean?.roastDate || '',
  })
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'name') setDuplicateWarning(false)
  }

  const handleSave = () => {
    const trimmedName = form.name.trim()
    if (!trimmedName) return

    // Check for duplicate names (excluding current bean if editing)
    const isDuplicate = beans.some(b =>
      b.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
      (!bean || b.id !== bean.id)
    )

    if (isDuplicate && !duplicateWarning) {
      setDuplicateWarning(true)
      return
    }

    onSave({
      name: trimmedName,
      roaster: form.roaster.trim(),
      origin: form.origin.trim(),
      process: form.process.trim(),
      roastDate: form.roastDate,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in motion-reduce:animate-none" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in motion-reduce:animate-none" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brew-800">
              {bean ? 'Edit Bean' : 'Add Bean'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                         text-brew-400 hover:text-brew-600 text-xl rounded-lg hover:bg-brew-50"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            {/* Bean Name */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Bean Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g., Heart Columbia Javier Omar"
                className="w-full p-3 rounded-xl border border-brew-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
              {duplicateWarning && (
                <p className="text-xs text-amber-600 mt-1">
                  A bean with this name already exists. Save again to confirm.
                </p>
              )}
            </div>

            {/* Roaster */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">Roaster</label>
              <input
                type="text"
                value={form.roaster}
                onChange={(e) => update('roaster', e.target.value)}
                placeholder="e.g., Heart, Tandem, Onyx"
                className="w-full p-3 rounded-xl border border-brew-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            </div>

            {/* Origin — tag select + other */}
            <TagSelectWithOther
              label="Origin"
              options={BEAN_ORIGINS}
              value={form.origin}
              onChange={(val) => update('origin', val)}
            />

            {/* Process — tag select + other */}
            <TagSelectWithOther
              label="Process"
              options={BEAN_PROCESSES}
              value={form.process}
              onChange={(val) => update('process', val)}
            />

            {/* Roast Date */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">Roast Date</label>
              <input
                type="date"
                value={form.roastDate}
                onChange={(e) => update('roastDate', e.target.value)}
                className="w-full p-3 rounded-xl border border-brew-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className={`mt-6 w-full py-3 rounded-xl font-medium transition-all
              ${form.name.trim()
                ? 'bg-brew-600 text-white hover:bg-brew-700 active:scale-[0.98]'
                : 'bg-brew-200 text-brew-400 cursor-not-allowed'
              }`}
          >
            {bean ? 'Update Bean' : 'Save Bean'}
          </button>
        </div>
      </div>
    </div>
  )
}
