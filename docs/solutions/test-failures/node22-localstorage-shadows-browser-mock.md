---
title: "Node.js 22+ built-in localStorage shadows browser environment mocks"
category: test-failures
module: test infrastructure
tags: [vitest, localStorage, node22, happy-dom, jsdom, test-setup, globalThis]
severity: P1
symptoms:
  - "localStorage.getItem is not a function"
  - "localStorage.clear is not a function"
  - Warning "localstorage-file was provided without a valid path"
  - Tests pass for non-localStorage code but fail for any storage operation
date_fixed: 2026-03-02
pr: null
related: []
---

# Node.js 22+ built-in localStorage shadows browser environment mocks

## Problem

After setting up Vitest with happy-dom (or jsdom) environment, all tests that call `localStorage.getItem()`, `localStorage.setItem()`, or `localStorage.clear()` fail with:

```
TypeError: localStorage.getItem is not a function
```

Tests that don't touch localStorage pass fine. The error occurs regardless of which browser environment is configured (happy-dom or jsdom).

## Investigation

1. Configured Vitest with `environment: 'jsdom'` — got `localStorage.clear is not a function`
2. Changed `localStorage.clear()` to a manual while-loop — still got `localStorage.getItem is not a function`
3. Switched from jsdom to `environment: 'happy-dom'` — same error
4. Noticed Node warning: `--localstorage-file was provided without a valid path` — this confirmed Node's own localStorage was active

## Root Cause

Node.js 22 added experimental Web Storage API support (`--experimental-webstorage`). The built-in `globalThis.localStorage` is a `Storage` instance, but its API is **incompatible** with the browser Web Storage API. The Node built-in does not expose `getItem()`, `setItem()`, `removeItem()`, or `clear()` as methods — it uses property-based access instead.

When Vitest loads with happy-dom or jsdom, the Node built-in `localStorage` takes precedence over the browser environment's mock. The browser environment expects to provide its own `localStorage`, but Node's global wins.

## Solution

Override `globalThis.localStorage` in the Vitest setup file with a spec-compliant in-memory implementation:

```javascript
// src/test/setup.js
function createStorage() {
  let store = {}
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key, value) { store[key] = String(value) },
    removeItem(key) { delete store[key] },
    clear() { store = {} },
    get length() { return Object.keys(store).length },
    key(i) { return Object.keys(store)[i] ?? null },
  }
}

globalThis.localStorage = createStorage()

beforeEach(() => {
  localStorage.clear()
})
```

Key details:
- `String(value)` coercion matches real browser behavior (localStorage always stores strings)
- `hasOwnProperty.call` prevents prototype pollution if a stored key is named `"hasOwnProperty"`
- `length` and `key(i)` complete the Web Storage interface even though current code doesn't use them
- `beforeEach` clear prevents test pollution
- The `setupFiles` config in Vitest ensures this runs before each test file

## Prevention

- When upgrading Node.js beyond v22, check if the built-in localStorage API has been aligned with the Web Storage spec
- If adding new test environments, verify localStorage works by running a simple `getItem`/`setItem` round-trip test first
- Document the Node.js version requirement in the project README or CLAUDE.md

## Affected Files

- `src/test/setup.js` — localStorage mock override
- `vite.config.js` — `setupFiles` config pointing to setup.js
