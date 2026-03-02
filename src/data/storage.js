// ============================================================
// LOCAL STORAGE HELPER
// ============================================================
// This saves your brew data to the browser's localStorage.
// Think of localStorage like a tiny database built into your browser —
// it persists even when you close the tab.
//
// Later, this could be swapped for a real database (SQLite, Supabase, etc.)
// but for the MVP, localStorage is perfect. Zero setup, works offline.
// ============================================================

import { numericToGrindNotation, DEFAULT_POUR_TEMPLATES } from './defaults'

const STORAGE_KEYS = {
  BREWS: 'brewlog_brews',
  EQUIPMENT: 'brewlog_equipment',
  BEANS: 'brewlog_beans',
  UI_PREFS: 'brewlog_ui_prefs',
  POUR_TEMPLATES: 'brewlog_pour_templates',
  ACTIVE_BREW: 'brewlog_active_brew',
}

// --- BREW LOGS ---

export function getBrews() {
  // Read from localStorage, parse the JSON string back into an array
  const data = localStorage.getItem(STORAGE_KEYS.BREWS)
  if (!data) return []
  const brews = JSON.parse(data)
  return brews.sort((a, b) => {
    const dateA = a.brewedAt ? new Date(a.brewedAt).getTime() : 0
    const dateB = b.brewedAt ? new Date(b.brewedAt).getTime() : 0
    return dateB - dateA // newest first
  })
}

export function saveBrew(brew) {
  // Get existing brews, add the new one at the beginning, save back
  const brews = getBrews()
  brews.unshift(brew) // unshift = add to front (newest first)
  localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  return brews
}

export function updateBrew(id, updates) {
  // Find a brew by ID and update its properties
  const brews = getBrews()
  const index = brews.findIndex(b => b.id === id)
  if (index !== -1) {
    brews[index] = { ...brews[index], ...updates }
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}

export function deleteBrew(id) {
  const brews = getBrews().filter(b => b.id !== id)
  localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  return brews
}

// --- EQUIPMENT PROFILE ---

export function getEquipment() {
  const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT)
  return data ? JSON.parse(data) : null
}

export function saveEquipment(equipment) {
  localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment))
  return equipment
}

// --- BEAN LIBRARY ---

export function getBeans() {
  const data = localStorage.getItem(STORAGE_KEYS.BEANS)
  return data ? JSON.parse(data) : []
}

export function saveBean(bean) {
  const beans = getBeans()
  const normalized = bean.name?.trim().toLowerCase()
  if (normalized && beans.some(b => b.name?.trim().toLowerCase() === normalized)) {
    return beans // Already exists, skip
  }
  beans.unshift(bean)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function updateBean(id, updates) {
  const beans = getBeans()
  const index = beans.findIndex(b => b.id === id)
  if (index === -1) return beans

  beans[index] = { ...beans[index], ...updates }

  // If name changed, remove any other bean with the same normalized name (merge)
  const newName = updates.name?.trim().toLowerCase()
  if (newName) {
    const deduped = beans.filter(b =>
      b.id === id || b.name?.trim().toLowerCase() !== newName
    )
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
    return deduped
  }

  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function deleteBean(id) {
  const beans = getBeans().filter(b => b.id !== id)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function deduplicateBeans() {
  const beans = getBeans()
  const seen = new Map()
  const deduped = beans.filter(b => {
    const key = b.name?.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.set(key, true)
    return true
  })
  if (deduped.length !== beans.length) {
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
  }
  return deduped
}

export function renameBrewBean(oldName, newName) {
  const brews = getBrews()
  let changed = false
  const oldNorm = oldName.trim().toLowerCase()
  brews.forEach(b => {
    if (b.beanName?.trim().toLowerCase() === oldNorm) {
      b.beanName = newName.trim()
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}

// --- UI PREFERENCES ---

export function getUIPref(key) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UI_PREFS)
    const prefs = data ? JSON.parse(data) : {}
    return prefs[key] ?? null
  } catch {
    return null
  }
}

export function setUIPref(key, value) {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UI_PREFS)
    const prefs = data ? JSON.parse(data) : {}
    prefs[key] = value
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify(prefs))
  } catch {
    localStorage.setItem(STORAGE_KEYS.UI_PREFS, JSON.stringify({ [key]: value }))
  }
}

// --- MIGRATIONS ---

export function migrateBloomToSteps() {
  // Convert legacy bloom fields to step 0 in the steps array.
  // Idempotent — skips brews that already have recipeSteps.
  const brews = getBrews()
  let changed = false
  brews.forEach(b => {
    if (b.recipeSteps) return // already migrated

    // Only migrate if there's bloom data to convert
    const hasBloom = b.bloomTime || b.bloomWater
    if (!hasBloom) return

    const recipeBloomStep = {
      label: 'Bloom',
      startTime: 0,
      targetWater: b.bloomWater || null,
      note: '',
    }

    const actualBloomStep = {
      label: 'Bloom',
      startTime: 0,
      targetWater: b.actualBloomWater || b.bloomWater || null,
      note: '',
    }

    b.recipeSteps = [recipeBloomStep]
    b.steps = [actualBloomStep]
    changed = true
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}

export function migrateGrindSettings() {
  // Convert Fellow Ode numeric grind settings to X-1/X-2 notation.
  // Idempotent — skips brews that already have string grindSettings.
  const brews = getBrews()
  let changed = false
  brews.forEach(b => {
    if ((b.grinder === 'fellow-ode' || b.grinder === 'fellow-ode-2')
        && typeof b.grindSetting === 'number') {
      b.grindSetting = numericToGrindNotation(b.grindSetting)
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
}

// --- POUR TEMPLATES ---

export function getPourTemplates() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.POUR_TEMPLATES)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function seedDefaultPourTemplates() {
  // Idempotent — only seeds if no templates exist yet
  const existing = getPourTemplates()
  if (existing.length > 0) return existing
  localStorage.setItem(STORAGE_KEYS.POUR_TEMPLATES, JSON.stringify(DEFAULT_POUR_TEMPLATES))
  return DEFAULT_POUR_TEMPLATES
}

// --- ACTIVE BREW (in-progress state persistence) ---

export function getActiveBrew() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_BREW)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function saveActiveBrew(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BREW, JSON.stringify(state))
  } catch {
    // Silent fail — storage quota may be exceeded
  }
}

export function clearActiveBrew() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_BREW)
}

// --- BREW SCREEN HELPERS ---

export function getChangesForBean(beanName) {
  // Returns the nextBrewChanges string from the most recent brew of that bean
  if (!beanName) return null
  const brew = getLastBrewOfBean(beanName)
  return brew?.nextBrewChanges || null
}

export function normalizeSteps(steps) {
  // Converts legacy { label, startTime, targetWater, note } to
  // new { id, name, waterTo, time, duration, note } format.
  // Returns new-format steps unchanged.
  if (!Array.isArray(steps) || steps.length === 0) return []
  // Check if already in new format (has 'name' field)
  if (steps[0].name !== undefined) return steps
  return steps.map((step, i) => ({
    id: i + 1,
    name: step.label || `Step ${i + 1}`,
    waterTo: step.targetWater ?? null,
    time: step.startTime ?? 0,
    duration: (steps[i + 1]?.startTime ?? step.startTime + 60) - (step.startTime ?? 0),
    note: step.note || '',
  }))
}

// --- UTILITY ---

export function formatTime(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function parseTime(str) {
  if (!str || typeof str !== 'string') return null
  const match = str.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

export function parseTimeRange(str) {
  if (!str || typeof str !== 'string') return null
  const parts = str.split(/\s*[-–]\s*/)
  const min = parseTime(parts[0])
  if (min === null) return null
  const max = parts.length > 1 ? parseTime(parts[1]) : min
  if (max === null) return null
  return min <= max ? { min, max } : { min: max, max: min }
}

export function formatTimeRange(min, max) {
  if (min == null || max == null) return formatTime(min ?? max)
  if (min === max) return formatTime(min)
  return `${formatTime(min)} - ${formatTime(max)}`
}

const SINGLE_TARGET_TOLERANCE_SECS = 10

export function computeTimeStatus(elapsed, targetTimeMin, targetTimeMax, targetTime, fallbackDuration) {
  const tMin = targetTimeMin || targetTime || fallbackDuration
  const tMax = targetTimeMax || targetTime || fallbackDuration
  if (tMin == null) return null
  const tolerance = tMin === tMax ? SINGLE_TARGET_TOLERANCE_SECS : 0
  if (elapsed < tMin - tolerance) return { status: 'under', delta: tMin - elapsed }
  if (elapsed > tMax + tolerance) return { status: 'over', delta: elapsed - tMax }
  return { status: 'on-target', delta: 0 }
}

export function getLastBrew() {
  // Returns the most recent brew — used to pre-populate the form
  // This is the "pulls up what you last used" feature from your Feb 9 transcript
  const brews = getBrews()
  return brews.length > 0 ? brews[0] : null
}

export function getLastBrewOfBean(beanName) {
  // Returns the most recent brew for a specific bean — used for "dial-in" pre-fill
  if (!beanName) return null
  const normalized = beanName.trim().toLowerCase()
  if (!normalized) return null
  const brews = getBrews() // already sorted by brewedAt descending
  return brews.find(b => b.beanName?.trim().toLowerCase() === normalized) || null
}

export function exportData() {
  // Export everything as a single JSON object
  // Useful for backup or for feeding into BrewWeave later
  return {
    brews: getBrews(),
    equipment: getEquipment(),
    beans: getBeans(),
    pourTemplates: getPourTemplates(),
    exportedAt: new Date().toISOString(),
  }
}

export function importData(data) {
  // Full replace: only touch keys present in the import payload
  if ('brews' in data) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(data.brews || []))
  }
  if ('equipment' in data) {
    if (data.equipment) {
      localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
    } else {
      localStorage.removeItem(STORAGE_KEYS.EQUIPMENT)
    }
  }
  if ('beans' in data) {
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(data.beans || []))
  }
  if ('pourTemplates' in data) {
    localStorage.setItem(STORAGE_KEYS.POUR_TEMPLATES, JSON.stringify(data.pourTemplates || []))
  }
}

export function mergeData(data) {
  // Merge imported data with existing: local wins on ID conflicts, new records are added
  if (data.brews && Array.isArray(data.brews)) {
    const existing = getBrews()
    const existingIds = new Set(existing.map(b => b.id))
    const newBrews = data.brews.filter(b => !existingIds.has(b.id))
    if (newBrews.length > 0) {
      localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify([...existing, ...newBrews]))
    }
  }

  if (data.beans && Array.isArray(data.beans)) {
    const existing = getBeans()
    const existingIds = new Set(existing.map(b => b.id))
    const existingNames = new Set(existing.map(b => b.name?.trim().toLowerCase()))
    const newBeans = data.beans.filter(b =>
      !existingIds.has(b.id) && !existingNames.has(b.name?.trim().toLowerCase())
    )
    if (newBeans.length > 0) {
      localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify([...existing, ...newBeans]))
    }
  }

  // Equipment: only use imported if local is null
  if (data.equipment && !getEquipment()) {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
  }

  // Pour templates: merge by ID
  if (data.pourTemplates && Array.isArray(data.pourTemplates)) {
    const existing = getPourTemplates()
    const existingIds = new Set(existing.map(t => t.id))
    const newTemplates = data.pourTemplates.filter(t => !existingIds.has(t.id))
    if (newTemplates.length > 0) {
      localStorage.setItem(STORAGE_KEYS.POUR_TEMPLATES, JSON.stringify([...existing, ...newTemplates]))
    }
  }
}
