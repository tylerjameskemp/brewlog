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
  BACKUP_V1: 'brewlog_brews_backup_v1',
}

// --- SAFE STORAGE WRITE ---

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    console.warn(`Storage write failed for ${key}:`, e)
    return false
  }
}

// --- NAME NORMALIZATION ---

export function normalizeName(name) {
  return (name || '').trim().toLowerCase()
}

// --- BREW LOGS ---

let _brewsCache = null
let _brewsCacheRaw = null

function _invalidateBrewsCache() {
  _brewsCache = null
  _brewsCacheRaw = null
}

function _setBrewsCache(brews, raw) {
  _brewsCache = brews
  _brewsCacheRaw = raw
}

export function getBrews() {
  // Read from localStorage, parse the JSON string back into an array
  const data = localStorage.getItem(STORAGE_KEYS.BREWS)
  if (!data) return []
  if (data === _brewsCacheRaw && _brewsCache) return [..._brewsCache]
  let brews
  try {
    brews = JSON.parse(data)
  } catch {
    return []
  }
  brews = brews.filter(b => b != null)
  brews.sort((a, b) => (b?.brewedAt || '').localeCompare(a?.brewedAt || ''))
  _brewsCache = brews
  _brewsCacheRaw = data
  return [...brews]
}

export function saveBrew(brew) {
  _invalidateBrewsCache()
  const brews = getBrews()
  brews.push(brew)
  brews.sort((a, b) => (b?.brewedAt || '').localeCompare(a?.brewedAt || ''))
  const raw = JSON.stringify(brews)
  if (!safeSetItem(STORAGE_KEYS.BREWS, raw)) {
    _invalidateBrewsCache()
    return getBrews()
  }
  _setBrewsCache(brews, raw)
  return [...brews]
}

export function updateBrew(id, updates) {
  _invalidateBrewsCache()
  const brews = getBrews()
  const index = brews.findIndex(b => b.id === id)
  if (index !== -1) {
    brews[index] = { ...brews[index], ...updates }
    const raw = JSON.stringify(brews)
    if (!safeSetItem(STORAGE_KEYS.BREWS, raw)) {
      _invalidateBrewsCache()
      return getBrews()
    }
    _setBrewsCache(brews, raw)
    return [...brews]
  }
  return [...brews]
}

export function deleteBrew(id) {
  _invalidateBrewsCache()
  const brews = getBrews().filter(b => b.id !== id)
  const raw = JSON.stringify(brews)
  if (!safeSetItem(STORAGE_KEYS.BREWS, raw)) {
    _invalidateBrewsCache()
    return getBrews()
  }
  _setBrewsCache(brews, raw)
  return [...brews]
}

// --- EQUIPMENT PROFILE ---

export function getEquipment() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function saveEquipment(equipment) {
  safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment))
  return equipment
}

// --- BEAN LIBRARY ---

export function getBeans() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BEANS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveBean(bean) {
  const beans = getBeans()
  const normalized = normalizeName(bean.name)
  if (normalized && beans.some(b => normalizeName(b.name) === normalized)) {
    return beans // Already exists, skip
  }
  beans.unshift(bean)
  safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function updateBean(id, updates) {
  const beans = getBeans()
  const index = beans.findIndex(b => b.id === id)
  if (index === -1) return beans

  beans[index] = { ...beans[index], ...updates }

  // If name changed, remove any other bean with the same normalized name (merge)
  const newName = normalizeName(updates.name)
  if (newName) {
    const deduped = beans.filter(b =>
      b.id === id || normalizeName(b.name) !== newName
    )
    safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
    return deduped
  }

  safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function deleteBean(id) {
  const beans = getBeans().filter(b => b.id !== id)
  safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function deduplicateBeans() {
  const beans = getBeans()
  const seen = new Map()
  const deduped = beans.filter(b => {
    const key = normalizeName(b.name)
    if (!key || seen.has(key)) return false
    seen.set(key, true)
    return true
  })
  if (deduped.length !== beans.length) {
    safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify(deduped))
  }
  return deduped
}

export function renameBrewBean(oldName, newName) {
  _invalidateBrewsCache()
  const brews = getBrews()
  let changed = false
  const oldNorm = normalizeName(oldName)
  brews.forEach(b => {
    if (normalizeName(b.beanName) === oldNorm) {
      b.beanName = newName.trim()
      changed = true
    }
  })
  if (changed) {
    const raw = JSON.stringify(brews)
    if (!safeSetItem(STORAGE_KEYS.BREWS, raw)) {
      _invalidateBrewsCache()
      return getBrews()
    }
    _setBrewsCache(brews, raw)
  }
  return [...brews]
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
    safeSetItem(STORAGE_KEYS.UI_PREFS, JSON.stringify(prefs))
  } catch {
    safeSetItem(STORAGE_KEYS.UI_PREFS, JSON.stringify({ [key]: value }))
  }
}

// --- MIGRATIONS ---

export function migrateBloomToSteps() {
  _invalidateBrewsCache()
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
    safeSetItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  _invalidateBrewsCache()
  return getBrews()
}

export function migrateGrindSettings() {
  _invalidateBrewsCache()
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
    safeSetItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  _invalidateBrewsCache()
  return getBrews()
}

export function migrateToSchemaV2() {
  _invalidateBrewsCache()
  // Unify all brews to schema version 2.
  // Idempotent — skips brews where schemaVersion >= 2.
  const raw = localStorage.getItem(STORAGE_KEYS.BREWS)
  if (!raw) return getBrews()

  let brews
  try {
    brews = JSON.parse(raw)
  } catch {
    // Corrupted JSON — try restoring from backup
    const backup = localStorage.getItem(STORAGE_KEYS.BACKUP_V1)
    if (backup) {
      try {
        JSON.parse(backup) // validate backup is valid JSON
        localStorage.setItem(STORAGE_KEYS.BREWS, backup)
        localStorage.removeItem(STORAGE_KEYS.BACKUP_V1) // prevent re-entry
        return migrateToSchemaV2()
      } catch {
        // Backup also corrupt — fall through
      }
    }
    return getBrews()
  }

  // Pre-migration backup (only once — don't overwrite an existing backup)
  if (!localStorage.getItem(STORAGE_KEYS.BACKUP_V1)) {
    safeSetItem(STORAGE_KEYS.BACKUP_V1, raw)
  }

  let changed = false
  brews.forEach(b => {
    if (!b || b.schemaVersion >= 2) return // null guard + already migrated

    if (b.brewScreenVersion === 1) {
      // BrewScreen brews — steps already in new format
      b.schemaVersion = 2
      delete b.brewScreenVersion
    } else {
      // Legacy BrewForm brews — convert steps to new format
      b.recipeSteps = normalizeSteps(b.recipeSteps)
      b.steps = normalizeSteps(b.steps)
      b.schemaVersion = 2
    }
    changed = true
  })

  if (changed) {
    if (!safeSetItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))) {
      // Quota exceeded — restore original data
      safeSetItem(STORAGE_KEYS.BREWS, raw)
    }
  }
  _invalidateBrewsCache()
  return getBrews()
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
  safeSetItem(STORAGE_KEYS.POUR_TEMPLATES, JSON.stringify(DEFAULT_POUR_TEMPLATES))
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
  safeSetItem(STORAGE_KEYS.ACTIVE_BREW, JSON.stringify(state))
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

export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatRoastDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRatio(coffeeGrams, waterGrams) {
  if (!coffeeGrams || coffeeGrams <= 0) return '—'
  return `1:${(waterGrams / coffeeGrams).toFixed(1)}`
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

export function getLastBrewOfBean(beanName) {
  // Returns the most recent brew for a specific bean — used for "dial-in" pre-fill
  if (!beanName) return null
  const normalized = normalizeName(beanName)
  if (!normalized) return null
  const brews = getBrews() // already sorted by brewedAt descending
  return brews.find(b => normalizeName(b.beanName) === normalized) || null
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
  _invalidateBrewsCache()
  // Full replace: only touch keys present in the import payload
  if ('brews' in data) {
    safeSetItem(STORAGE_KEYS.BREWS, JSON.stringify(data.brews || []))
  }
  if ('equipment' in data) {
    if (data.equipment) {
      safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
    } else {
      localStorage.removeItem(STORAGE_KEYS.EQUIPMENT)
    }
  }
  if ('beans' in data) {
    safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify(data.beans || []))
  }
  if ('pourTemplates' in data) {
    safeSetItem(STORAGE_KEYS.POUR_TEMPLATES, JSON.stringify(data.pourTemplates || []))
  }
  // Run migration chain on imported data
  _invalidateBrewsCache()
  migrateToSchemaV2()
}

export function mergeData(data) {
  _invalidateBrewsCache()
  // Merge imported data with existing: local wins on ID conflicts, new records are added
  if (data.brews && Array.isArray(data.brews)) {
    const existing = getBrews()
    const existingIds = new Set(existing.map(b => b.id))
    const newBrews = data.brews.filter(b => !existingIds.has(b.id))
    if (newBrews.length > 0) {
      safeSetItem(STORAGE_KEYS.BREWS, JSON.stringify([...existing, ...newBrews]))
    }
  }

  if (data.beans && Array.isArray(data.beans)) {
    const existing = getBeans()
    const existingIds = new Set(existing.map(b => b.id))
    const existingNames = new Set(existing.map(b => normalizeName(b.name)))
    const newBeans = data.beans.filter(b =>
      !existingIds.has(b.id) && !existingNames.has(normalizeName(b.name))
    )
    if (newBeans.length > 0) {
      safeSetItem(STORAGE_KEYS.BEANS, JSON.stringify([...existing, ...newBeans]))
    }
  }

  // Equipment: only use imported if local is null
  if (data.equipment && !getEquipment()) {
    safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
  }

  // Pour templates: merge by ID
  if (data.pourTemplates && Array.isArray(data.pourTemplates)) {
    const existing = getPourTemplates()
    const existingIds = new Set(existing.map(t => t.id))
    const newTemplates = data.pourTemplates.filter(t => !existingIds.has(t.id))
    if (newTemplates.length > 0) {
      safeSetItem(STORAGE_KEYS.POUR_TEMPLATES, JSON.stringify([...existing, ...newTemplates]))
    }
  }

  // Run migration chain on merged data
  _invalidateBrewsCache()
  migrateToSchemaV2()
}
