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

const STORAGE_KEYS = {
  BREWS: 'brewlog_brews',
  EQUIPMENT: 'brewlog_equipment',
  BEANS: 'brewlog_beans',
  UI_PREFS: 'brewlog_ui_prefs',
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

// --- UTILITY ---

export function getLastBrew() {
  // Returns the most recent brew — used to pre-populate the form
  // This is the "pulls up what you last used" feature from your Feb 9 transcript
  const brews = getBrews()
  return brews.length > 0 ? brews[0] : null
}

export function exportData() {
  // Export everything as a single JSON object
  // Useful for backup or for feeding into BrewWeave later
  return {
    brews: getBrews(),
    equipment: getEquipment(),
    beans: getBeans(),
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
    const newBeans = data.beans.filter(b => !existingIds.has(b.id))
    if (newBeans.length > 0) {
      localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify([...existing, ...newBeans]))
    }
  }

  // Equipment: only use imported if local is null
  if (data.equipment && !getEquipment()) {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
  }
}
