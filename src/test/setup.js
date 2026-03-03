import '@testing-library/jest-dom'

// Node.js 22+ has a built-in localStorage that doesn't implement the
// standard Web Storage API (getItem/setItem/removeItem). Override it
// with a spec-compliant in-memory implementation for tests.
function createStorage() {
  let store = {}
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null },
    setItem(key, value) { store[key] = String(value) },
    removeItem(key) { delete store[key] },
    clear() { store = {} },
    get length() { return Object.keys(store).length },
    key(i) { return Object.keys(store)[i] ?? null },
  }
}

globalThis.localStorage = createStorage()

// Clear all localStorage keys between tests to prevent pollution
beforeEach(() => {
  localStorage.clear()
})
