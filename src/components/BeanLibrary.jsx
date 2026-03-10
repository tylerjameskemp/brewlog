import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveBean, updateBean, deleteBean, renameBrewBean, formatTime, normalizeName, getRecipes, updateRecipe, archiveRecipe } from '../data/storage'
import { BEAN_ORIGINS, BEAN_PROCESSES, RATING_SCALE, getMethodName } from '../data/defaults'
import Collapsible from './Collapsible'
import Modal from './Modal'
import FeltBoard from './FeltBoard'

// ============================================================
// BEAN LIBRARY — Browse, add, edit, and delete your beans
// ============================================================
// Shows all saved beans as felt-board rows with brew counts.
// Click a row to expand and see actions + brews for that bean.
// Add/edit beans via a modal form. Delete with inline confirmation.

export default function BeanLibrary({ beans, setBeans, brews, recipes, setRecipes, onBrewsChange, onBrewBean }) {
  const [expandedBeanId, setExpandedBeanId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingBean, setEditingBean] = useState(null)
  const [deletingBeanId, setDeletingBeanId] = useState(null)

  // Pre-compute brew counts per bean name (normalized for case/whitespace)
  const brewCounts = useMemo(() => {
    const counts = new Map()
    brews.forEach(b => {
      const key = normalizeName(b.beanName)
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [brews])

  // Memoize brews for the currently expanded bean
  const expandedBeanBrews = useMemo(() => {
    if (!expandedBeanId) return []
    const expandedBean = beans.find(b => b.id === expandedBeanId)
    if (!expandedBean) return []
    const key = normalizeName(expandedBean.name)
    return brews.filter(b => normalizeName(b.beanName) === key)
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
    <div className="-mx-4 bg-felt-900">
      <FeltBoard fullPage>
        <div className="px-6 py-8">
          <h1 className="font-condensed text-2xl font-bold text-felt-100 uppercase tracking-[3.5px] text-letterpress mb-6">Bean Inventory</h1>
          {beans.length === 0 ? (
            /* Dark empty state — inline instead of shared EmptyState */
            <div className="text-center py-12 animate-fade-in-up motion-reduce:animate-none">
              <div className="text-4xl mb-4">&#x1FAD8;</div>
              <p className="font-condensed text-lg font-bold text-felt-100 uppercase tracking-[3.5px] text-letterpress">
                Your Bean Library
              </p>
              <p className="text-sm mt-3 text-felt-500 max-w-xs mx-auto leading-relaxed">
                Keep track of every bean you brew. Beans are added automatically when you log a brew, or tap below to add one manually.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-6 font-condensed text-sm font-bold text-felt-200 uppercase tracking-[4px] text-letterpress
                           min-h-[44px] px-6 py-3 hover:opacity-80 transition-opacity"
              >
                + Add Bean
              </button>
            </div>
          ) : (
            <>
              {/* Bean list */}
              <div>
                {beans.map(bean => {
                  const isExpanded = expandedBeanId === bean.id
                  const isDimmed = expandedBeanId !== null && !isExpanded
                  const key = normalizeName(bean.name)
                  const count = brewCounts.get(key) || 0
                  const beanBrews = isExpanded ? expandedBeanBrews : []
                  const meta = [bean.roaster, bean.origin, bean.process].filter(Boolean).join('  ·  ')

                  return (
                    <div key={bean.id}>
                      {/* Bean row — clickable to expand */}
                      <button
                        onClick={() => { setExpandedBeanId(isExpanded ? null : bean.id); setDeletingBeanId(null) }}
                        className="w-full py-3 flex flex-col gap-1 text-left transition-opacity duration-[250ms]"
                        style={{ opacity: isDimmed ? 0.3 : 1 }}
                      >
                        {/* Name + brew count row */}
                        <div className="flex items-baseline justify-between w-full">
                          <span className="font-condensed text-base font-bold text-felt-100 uppercase tracking-[3.5px] text-letterpress truncate">
                            {bean.name}
                          </span>
                          <span className="font-condensed text-base font-bold text-felt-100 uppercase tracking-[3.5px] text-letterpress flex-shrink-0 ml-3">
                            {count > 0 ? `${count} BREW${count !== 1 ? 'S' : ''}` : ''}
                          </span>
                        </div>

                        {/* Metadata line */}
                        <div className="font-condensed text-[11px] font-semibold text-felt-500 uppercase tracking-[3px] text-letterpress-dim">
                          {count === 0 ? (
                            <span className="text-felt-200">NEW{meta ? `  ·  ${meta}` : ''}</span>
                          ) : (
                            meta || '\u00A0'
                          )}
                        </div>

                        {/* Roast date */}
                        {bean.roastDate && (
                          <div className="font-condensed text-[10px] font-semibold text-felt-400 uppercase tracking-[2px] text-letterpress-dim">
                            Roasted {formatDate(bean.roastDate)}
                          </div>
                        )}
                      </button>

                      {/* Expanded content */}
                      <Collapsible open={isExpanded}>
                        {isExpanded && (
                          <div className="pb-4 animate-board-slide motion-reduce:animate-none">
                            {/* Action buttons */}
                            <div className="flex items-center gap-4 py-2 flex-wrap">
                              {onBrewBean && (
                                <button
                                  onClick={() => onBrewBean(bean)}
                                  className="font-condensed text-sm font-bold text-felt-200 uppercase tracking-[4px] text-letterpress
                                             min-h-[44px] px-4 py-2 hover:opacity-80 active:scale-[0.98] transition-all"
                                >
                                  Brew ›
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(bean)}
                                className="font-condensed text-xs font-semibold text-felt-500 uppercase tracking-[2px] text-letterpress-dim
                                           min-h-[44px] px-3 py-2 hover:text-felt-100 transition-colors"
                              >
                                Edit
                              </button>
                              {deletingBeanId === bean.id ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-red-400 py-2">Delete this bean?</span>
                                  <button
                                    onClick={() => handleDelete(bean.id)}
                                    className="font-condensed text-xs font-semibold text-red-400 uppercase tracking-[2px]
                                               min-h-[44px] px-3 py-2 hover:text-red-300 transition-colors"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setDeletingBeanId(null)}
                                    className="font-condensed text-xs font-semibold text-felt-400 uppercase tracking-[2px]
                                               min-h-[44px] px-3 py-2 hover:text-felt-100 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingBeanId(bean.id)}
                                  className="font-condensed text-xs font-semibold text-felt-400 uppercase tracking-[2px] text-letterpress-dim
                                             min-h-[44px] px-3 py-2 hover:text-red-400 transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </div>

                            {/* Recipe section */}
                            {recipes && (() => {
                              const beanRecipes = recipes.filter(r => r.beanId === bean.id)
                              if (beanRecipes.length === 0) return null
                              return (
                                <RecipeSection
                                  recipes={beanRecipes}
                                  onRename={(id, name) => { updateRecipe(id, { name }); setRecipes(getRecipes()) }}
                                  onDelete={(id) => { archiveRecipe(id); setRecipes(getRecipes()) }}
                                  onNotesUpdate={(id, notes) => { updateRecipe(id, { notes }); setRecipes(getRecipes()) }}
                                  isLastRecipe={beanRecipes.length === 1}
                                />
                              )
                            })()}

                            {/* Brew list */}
                            {beanBrews.length > 0 ? (
                              <div className="mt-3 space-y-1.5">
                                <span className="font-condensed text-[10px] font-semibold text-felt-400 uppercase tracking-[2px] text-letterpress-dim">
                                  Brews
                                </span>
                                {beanBrews.map(brew => {
                                  const ratingInfo = RATING_SCALE.find(r => r.value === brew.rating)
                                  return (
                                    <div
                                      key={brew.id}
                                      className="p-3 bg-felt-900/50 rounded-lg flex items-center gap-3"
                                    >
                                      <div className="text-xl flex-shrink-0">
                                        {ratingInfo?.emoji || '\u2615'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-felt-500">
                                          {formatBrewDate(brew.brewedAt)}
                                        </div>
                                        {brew.flavors?.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {brew.flavors.slice(0, 4).map(f => (
                                              <span key={f} className="px-1.5 py-0.5 bg-felt-700/50 text-felt-100 rounded text-[10px]">
                                                {f}
                                              </span>
                                            ))}
                                            {brew.flavors.length > 4 && (
                                              <span className="text-[10px] text-felt-400">+{brew.flavors.length - 4}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-xs font-mono text-felt-100">
                                          {brew.coffeeGrams}g / {brew.waterGrams}g
                                        </div>
                                        <div className="text-xs font-mono text-felt-500">
                                          grind {brew.grindSetting} · {formatTime(brew.totalTime)}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="text-center text-felt-400 py-4">
                                <p className="text-sm">No brews yet with this bean</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Collapsible>
                    </div>
                  )
                })}
              </div>

              {/* Add bean button — bottom of list */}
              <div className="text-center mt-6 pt-4 border-t border-felt-700/50">
                <button
                  onClick={handleOpenAdd}
                  className="font-condensed text-xs font-semibold text-felt-300 uppercase tracking-[3px] text-letterpress-dim
                             min-h-[44px] px-4 py-2 hover:text-felt-100 transition-colors"
                >
                  + Add Bean
                </button>
              </div>
            </>
          )}

        </div>
      </FeltBoard>

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

// --- RECIPE SECTION — inline recipe list within expanded bean card ---
function RecipeSection({ recipes, onRename, onDelete, onNotesUpdate, isLastRecipe }) {
  const [editingNameId, setEditingNameId] = useState(null)
  const [nameBuffer, setNameBuffer] = useState('')
  const [editingNotesId, setEditingNotesId] = useState(null)
  const [notesBuffer, setNotesBuffer] = useState('')
  const [deletingRecipeId, setDeletingRecipeId] = useState(null)

  const handleStartRename = (recipe) => {
    setEditingNameId(recipe.id)
    setNameBuffer(recipe.name)
  }

  const handleFinishRename = (id) => {
    const trimmed = nameBuffer.trim()
    if (trimmed && trimmed !== recipes.find(r => r.id === id)?.name) {
      onRename(id, trimmed)
    }
    setEditingNameId(null)
  }

  const handleStartNotes = (recipe) => {
    setEditingNotesId(recipe.id)
    setNotesBuffer(recipe.notes || '')
  }

  const handleFinishNotes = (id) => {
    const trimmed = notesBuffer.trim()
    const original = recipes.find(r => r.id === id)?.notes || ''
    if (trimmed !== original) {
      onNotesUpdate(id, trimmed)
    }
    setEditingNotesId(null)
  }

  const handleDelete = (id) => {
    onDelete(id)
    setDeletingRecipeId(null)
  }

  return (
    <div className="mt-3 mb-3">
      <span className="font-condensed text-[10px] font-semibold text-felt-400 uppercase tracking-[2px] text-letterpress-dim">
        Recipes
      </span>
      <div className="mt-2 space-y-2">
        {recipes.map(recipe => (
          <div key={recipe.id} className="p-3 bg-felt-900/50 rounded-lg border border-felt-700/50">
            <div className="flex items-center gap-2">
              {editingNameId === recipe.id ? (
                <input
                  type="text"
                  value={nameBuffer}
                  onChange={(e) => setNameBuffer(e.target.value)}
                  onBlur={() => handleFinishRename(recipe.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFinishRename(recipe.id); if (e.key === 'Escape') setEditingNameId(null) }}
                  maxLength={100}
                  autoFocus
                  className="flex-1 text-base font-medium text-felt-100 bg-felt-800 border border-felt-500/30 rounded-lg px-2 py-1
                             focus:outline-none focus:ring-2 focus:ring-felt-200/30"
                />
              ) : (
                <button
                  onClick={() => handleStartRename(recipe)}
                  className="flex-1 text-left text-sm font-medium text-felt-100 hover:text-felt-50 transition-colors truncate"
                  title="Click to rename"
                >
                  {recipe.name}
                </button>
              )}
              {deletingRecipeId !== recipe.id && editingNameId !== recipe.id && (
                <button
                  onClick={() => setDeletingRecipeId(recipe.id)}
                  className="text-felt-400 hover:text-red-400 transition-colors flex-shrink-0 p-1
                             min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Delete recipe"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Settings summary */}
            <div className="text-xs text-felt-500 mt-1">
              {recipe.coffeeGrams && recipe.waterGrams && (
                <span className="font-mono">{recipe.coffeeGrams}g / {recipe.waterGrams}g</span>
              )}
              {recipe.grindSetting && <span className="font-mono"> · grind {recipe.grindSetting}</span>}
              {recipe.method && <span> · {getMethodName(recipe.method)}</span>}
            </div>

            {/* Notes */}
            {editingNotesId === recipe.id ? (
              <textarea
                value={notesBuffer}
                onChange={(e) => setNotesBuffer(e.target.value)}
                onBlur={() => handleFinishNotes(recipe.id)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder="Add a note about this recipe..."
                className="mt-2 w-full text-base text-felt-100 bg-felt-800 border border-felt-500/30 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-felt-200/30 resize-none"
              />
            ) : recipe.notes ? (
              <button
                onClick={() => handleStartNotes(recipe)}
                className="mt-1 text-xs text-felt-500 italic text-left line-clamp-2 hover:text-felt-100 transition-colors"
                title="Click to edit note"
              >
                {recipe.notes}
              </button>
            ) : (
              <button
                onClick={() => handleStartNotes(recipe)}
                className="mt-1 text-xs text-felt-300 hover:text-felt-100 transition-colors"
              >
                + Add note
              </button>
            )}

            {/* Delete confirmation */}
            {deletingRecipeId === recipe.id && (
              <div className="mt-2 p-2 bg-red-900/20 rounded-lg border border-red-800/30">
                <p className="text-xs text-red-400 mb-2">
                  {isLastRecipe
                    ? 'This is the only recipe for this bean. Your next brew will start with default settings.'
                    : 'Delete this recipe? Your brew history won\'t be affected.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="text-xs px-3 py-1.5 min-h-[44px] font-medium text-red-400 hover:text-red-300 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeletingRecipeId(null)}
                    className="text-xs px-3 py-1.5 min-h-[44px] text-felt-400 hover:text-felt-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
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
            className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all min-h-[44px]
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
          className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all min-h-[44px]
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
          maxLength={100}
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
      normalizeName(b.name) === normalizeName(trimmedName) &&
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
    <Modal title={bean ? 'Edit Bean' : 'Add Bean'} onClose={onClose}>
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
                maxLength={100}
                className="w-full p-3 rounded-xl border border-brew-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
              {duplicateWarning && (
                <p className="text-xs text-amber-600 mt-1">
                  A bean with this name already exists. Saving will merge them into one entry.
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
                maxLength={100}
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
    </Modal>
  )
}
