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
}

// --- BREW LOGS ---

export function getBrews() {
  // Read from localStorage, parse the JSON string back into an array
  const data = localStorage.getItem(STORAGE_KEYS.BREWS)
  return data ? JSON.parse(data) : []
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
  beans.unshift(bean)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function updateBean(id, updates) {
  const beans = getBeans()
  const index = beans.findIndex(b => b.id === id)
  if (index !== -1) {
    beans[index] = { ...beans[index], ...updates }
    localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  }
  return beans
}

export function deleteBean(id) {
  const beans = getBeans().filter(b => b.id !== id)
  localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(beans))
  return beans
}

export function renameBrewBean(oldName, newName) {
  const brews = getBrews()
  let changed = false
  brews.forEach(b => {
    if (b.beanName === oldName) {
      b.beanName = newName
      changed = true
    }
  })
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(brews))
  }
  return brews
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
  // Import a previously exported backup
  if (data.brews) localStorage.setItem(STORAGE_KEYS.BREWS, JSON.stringify(data.brews))
  if (data.equipment) localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
  if (data.beans) localStorage.setItem(STORAGE_KEYS.BEANS, JSON.stringify(data.beans))
}
