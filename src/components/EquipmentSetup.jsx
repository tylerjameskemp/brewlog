import { useState } from 'react'
import { saveEquipment } from '../data/storage'
import { BREW_METHODS, GRINDERS } from '../data/defaults'

// ============================================================
// EQUIPMENT SETUP — One-time gear profile
// ============================================================
// This is the onboarding flow. User tells the app what gear they have.
// The data gets saved and used to pre-fill brew sessions.
//
// FROM YOUR TRANSCRIPT: "you just captured your brew setups...
// select what you're doing easily... it just pulled up what you
// last used for your brews"

export default function EquipmentSetup({ existing, onSave, onClose }) {
  // Pre-fill with existing data if editing, otherwise start blank
  const [form, setForm] = useState(existing || {
    brewMethod: 'v60',
    dripper: 'ceramic',    // ceramic vs plastic vs metal
    grinder: 'fellow-ode',
    kettle: 'gooseneck-electric',
    scale: '',
    filterType: 'paper-tabbed',
    notes: '',
  })

  // Helper: update a single field in the form
  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    saveEquipment(form)
    onSave(form)
  }

  return (
    // Full-screen overlay
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brew-800">
              {existing ? 'Edit Gear' : 'Set Up Your Gear'}
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
            {/* Brew Method */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Primary Brew Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BREW_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => update('brewMethod', method.id)}
                    className={`p-3 rounded-xl border text-left transition-all
                      ${form.brewMethod === method.id
                        ? 'border-brew-500 bg-brew-50 ring-1 ring-brew-500'
                        : 'border-brew-100 hover:border-brew-200'
                      }`}
                  >
                    <span className="text-lg">{method.icon}</span>
                    <span className="ml-2 text-sm font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dripper Material (V60-specific) */}
            {form.brewMethod === 'v60' && (
              <div>
                <label className="block text-sm font-medium text-brew-700 mb-2">
                  V60 Material
                </label>
                <div className="flex gap-2">
                  {['ceramic', 'plastic', 'metal', 'glass'].map(mat => (
                    <button
                      key={mat}
                      onClick={() => update('dripper', mat)}
                      className={`px-4 py-2.5 rounded-lg border text-sm capitalize
                        ${form.dripper === mat
                          ? 'border-brew-500 bg-brew-50 text-brew-800'
                          : 'border-brew-100 text-brew-500 hover:border-brew-200'
                        }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grinder */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Grinder
              </label>
              <select
                value={form.grinder}
                onChange={(e) => update('grinder', e.target.value)}
                className="w-full p-3 rounded-xl border border-brew-200 bg-white
                           text-brew-800 focus:outline-none focus:ring-2 focus:ring-brew-400"
              >
                {GRINDERS.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Kettle */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Kettle
              </label>
              <select
                value={form.kettle}
                onChange={(e) => update('kettle', e.target.value)}
                className="w-full p-3 rounded-xl border border-brew-200 bg-white
                           text-brew-800 focus:outline-none focus:ring-2 focus:ring-brew-400"
              >
                <option value="gooseneck-electric">Gooseneck Electric</option>
                <option value="gooseneck-stovetop">Gooseneck Stovetop</option>
                <option value="standard-electric">Standard Electric</option>
                <option value="stovetop">Stovetop</option>
              </select>
            </div>

            {/* Scale */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Scale (optional)
              </label>
              <input
                type="text"
                value={form.scale}
                onChange={(e) => update('scale', e.target.value)}
                placeholder="e.g., Acaia Pearl, Timemore Black Mirror"
                className="w-full p-3 rounded-xl border border-brew-200
                           text-brew-800 placeholder:text-brew-300
                           focus:outline-none focus:ring-2 focus:ring-brew-400"
              />
            </div>

            {/* Filter Type */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Filter Type
              </label>
              <div className="flex flex-wrap gap-2">
                {['paper-tabbed', 'paper-natural', 'metal', 'cloth'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => update('filterType', filter)}
                    className={`px-4 py-2 rounded-lg border text-sm capitalize
                      ${form.filterType === filter
                        ? 'border-brew-500 bg-brew-50 text-brew-800'
                        : 'border-brew-100 text-brew-500 hover:border-brew-200'
                      }`}
                  >
                    {filter.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-brew-700 mb-2">
                Notes about your setup
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="e.g., Fellow Ode has fines issue, kettle holds 900ml..."
                rows={3}
                className="w-full p-3 rounded-xl border border-brew-200
                           text-brew-800 placeholder:text-brew-300
                           focus:outline-none focus:ring-2 focus:ring-brew-400 resize-none"
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="mt-6 w-full py-3 bg-brew-600 text-white rounded-xl font-medium
                       hover:bg-brew-700 active:scale-[0.98] transition-all"
          >
            {existing ? 'Update Gear' : 'Save & Start Brewing'}
          </button>
        </div>
      </div>
    </div>
  )
}
