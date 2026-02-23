// ============================================================
// SETTINGS MENU — Dropdown for settings, export, and import
// ============================================================
// Gear icon dropdown with three options: Equipment Setup,
// Export Data, and Import Data. Export downloads all data as
// timestamped JSON. Import validates, previews, and offers
// merge (add new records) or replace (full overwrite) modes.

import { useState, useEffect, useRef } from 'react'
import { exportData, importData, mergeData, getBrews, getBeans, getEquipment } from '../data/storage'

export default function SettingsMenu({ onEquipmentClick, onImportComplete, onClose }) {
  const [importState, setImportState] = useState(null) // null | parsed data object
  const [feedback, setFeedback] = useState(null) // null | { type: 'success'|'error', message }
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const importStateRef = useRef(importState)
  importStateRef.current = importState

  // Dismiss on click outside or Escape
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') {
        if (importStateRef.current) {
          setImportState(null)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Auto-dismiss feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // --- EXPORT ---
  function handleExport() {
    const data = { ...exportData(), version: 1 }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const filename = `brewlog-export-${date}.json`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setFeedback({ type: 'success', message: `Exported as ${filename}` })
  }

  // --- IMPORT ---
  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)

        // Validate top-level structure
        if (data.brews && !Array.isArray(data.brews)) {
          setFeedback({ type: 'error', message: 'Invalid file: "brews" must be an array' })
          return
        }
        if (data.beans && !Array.isArray(data.beans)) {
          setFeedback({ type: 'error', message: 'Invalid file: "beans" must be an array' })
          return
        }
        if (data.equipment && (typeof data.equipment !== 'object' || Array.isArray(data.equipment))) {
          setFeedback({ type: 'error', message: 'Invalid file: "equipment" must be an object' })
          return
        }

        setImportState(data)
      } catch {
        setFeedback({ type: 'error', message: 'Invalid JSON file. Please select a valid BrewLog export.' })
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleImportConfirm(mode) {
    try {
      if (mode === 'replace') {
        importData(importState)
      } else {
        mergeData(importState)
      }
      onImportComplete()
      setImportState(null)
      setFeedback({ type: 'success', message: mode === 'replace' ? 'Data replaced successfully' : 'Data merged successfully' })
    } catch (err) {
      console.error('Import failed:', err)
      setFeedback({ type: 'error', message: 'Import failed. The file may be corrupted or too large.' })
      setImportState(null)
    }
  }

  // --- IMPORT CONFIRMATION MODAL ---
  if (importState) {
    const localBrews = getBrews()
    const localBeans = getBeans()
    const localEquipment = getEquipment()

    const importBrews = importState.brews?.length ?? 0
    const importBeans = importState.beans?.length ?? 0
    const hasImportEquipment = !!importState.equipment
    const exportedAt = importState.exportedAt
      ? new Date(importState.exportedAt).toLocaleDateString()
      : 'unknown date'

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-brew-800">Import Data</h2>
              <button
                onClick={() => setImportState(null)}
                className="text-brew-400 hover:text-brew-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-brew-50 rounded-xl">
                <p className="text-sm font-medium text-brew-700 mb-1">File contents</p>
                <p className="text-sm text-brew-600">
                  Exported on {exportedAt} — {importBrews} brew{importBrews !== 1 ? 's' : ''}, {importBeans} bean{importBeans !== 1 ? 's' : ''}, {hasImportEquipment ? 'has' : 'no'} equipment
                </p>
              </div>

              <div className="p-4 bg-brew-50 rounded-xl">
                <p className="text-sm font-medium text-brew-700 mb-1">Your current data</p>
                <p className="text-sm text-brew-600">
                  {localBrews.length} brew{localBrews.length !== 1 ? 's' : ''}, {localBeans.length} bean{localBeans.length !== 1 ? 's' : ''}, {localEquipment ? 'has' : 'no'} equipment
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleImportConfirm('merge')}
                className="w-full py-3 bg-brew-600 text-white rounded-xl font-medium
                           hover:bg-brew-700 active:scale-[0.98] transition-all"
              >
                Merge — Add new records only
              </button>
              <button
                onClick={() => handleImportConfirm('replace')}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium
                           hover:bg-amber-600 active:scale-[0.98] transition-all"
              >
                Replace — Overwrite all existing data
              </button>
              <button
                onClick={() => setImportState(null)}
                className="w-full py-3 text-brew-500 rounded-xl font-medium
                           hover:bg-brew-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- DROPDOWN MENU ---
  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-brew-100 shadow-lg z-50 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {feedback && (
        <div className={`px-4 py-2 text-sm ${
          feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {feedback.message}
        </div>
      )}

      <button
        onClick={() => { onEquipmentClick(); onClose() }}
        className="w-full px-4 py-3 text-left text-sm text-brew-700 hover:bg-brew-50 transition-colors flex items-center gap-3"
      >
        <span className="text-base">🔧</span>
        Equipment Setup
      </button>
      <button
        onClick={handleExport}
        className="w-full px-4 py-3 text-left text-sm text-brew-700 hover:bg-brew-50 transition-colors flex items-center gap-3 border-t border-brew-50"
      >
        <span className="text-base">📤</span>
        Export Data
      </button>
      <button
        onClick={handleImportClick}
        className="w-full px-4 py-3 text-left text-sm text-brew-700 hover:bg-brew-50 transition-colors flex items-center gap-3 border-t border-brew-50"
      >
        <span className="text-base">📥</span>
        Import Data
      </button>
    </div>
  )
}
