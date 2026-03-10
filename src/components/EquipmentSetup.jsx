import { useState, useEffect } from 'react'
import { saveEquipment } from '../data/storage'
import { BREW_METHODS, GRINDERS, DRIPPER_MATERIALS, FILTER_TYPES } from '../data/defaults'

// ============================================================
// EQUIPMENT SETUP — One-time gear profile (wizard or edit mode)
// ============================================================
// New users get a friendly 3-step wizard.
// Returning users editing gear get a single-page form.

const TOTAL_STEPS = 3

export default function EquipmentSetup({ existing, onSave, onClose }) {
  const isEditing = !!existing
  const [step, setStep] = useState(isEditing ? 'all' : 1)
  const [dismissed, setDismissed] = useState(false)

  const [form, setForm] = useState(existing || {
    brewMethod: 'v60',
    dripper: 'ceramic',
    grinder: 'fellow-ode',
    kettle: 'gooseneck-electric',
    scale: '',
    filterType: 'paper-tabbed',
    notes: '',
  })

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Guard: onSave can only fire once from the confirmation screen
  const dismiss = () => {
    if (dismissed) return
    setDismissed(true)
    onSave(form)
  }

  const handleSave = () => {
    saveEquipment(form)
    if (isEditing) {
      onSave(form)
    } else {
      setStep('done')
    }
  }

  // Auto-dismiss confirmation after 2 seconds
  useEffect(() => {
    if (step !== 'done') return
    const timer = setTimeout(dismiss, 2000)
    return () => clearTimeout(timer)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in motion-reduce:animate-none" onClick={onClose}>
      <div className="bg-parchment-50 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in motion-reduce:animate-none" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              {step === 'done' ? (
                <h2 className="text-xl font-semibold text-brew-800">You're all set!</h2>
              ) : isEditing ? (
                <h2 className="text-xl font-semibold text-brew-800">Edit Gear</h2>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-brew-800">
                    {step === 1 && 'What do you brew with?'}
                    {step === 2 && 'Your grinding setup'}
                    {step === 3 && 'The finishing touches'}
                  </h2>
                  <p className="text-xs text-brew-400 mt-1">Step {step} of {TOTAL_STEPS}</p>
                </div>
              )}
            </div>
            {step !== 'done' && (
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                           text-brew-400 hover:text-brew-700 text-xl rounded-lg hover:bg-brew-50"
              >
                ✕
              </button>
            )}
          </div>

          {/* Step indicator dots (wizard mode only) */}
          {!isEditing && step !== 'done' && (
            <div className="flex gap-2 mb-6 justify-center">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? 'w-6 bg-brew-600' : s < step ? 'w-1.5 bg-brew-400' : 'w-1.5 bg-brew-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Confirmation screen */}
          {step === 'done' && (
            <div className="text-center py-8 animate-scale-in motion-reduce:animate-none">
              <div className="text-5xl mb-4">✓</div>
              <p className="text-brew-700 mb-6">Your gear is saved. Let's brew!</p>
              <button
                onClick={dismiss}
                className="px-8 py-3 bg-crema-500 text-white rounded-xl font-medium
                           hover:bg-crema-600 active:scale-[0.98] transition-all"
              >
                Start Brewing
              </button>
            </div>
          )}

          {/* Wizard Step 1: Brew Method + Dripper */}
          {(step === 1 || step === 'all') && step !== 'done' && (
            <div className={step === 1 ? 'animate-fade-in motion-reduce:animate-none' : ''}>
              <div className="space-y-5">
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

                {form.brewMethod === 'v60' && (
                  <div>
                    <label className="block text-sm font-medium text-brew-700 mb-2">
                      V60 Material
                    </label>
                    <div className="flex gap-2">
                      {DRIPPER_MATERIALS.map(mat => (
                        <button
                          key={mat}
                          onClick={() => update('dripper', mat)}
                          className={`px-4 py-2.5 rounded-lg border text-sm capitalize
                            min-h-[44px] flex items-center justify-center
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
              </div>
            </div>
          )}

          {/* Wizard Step 2: Grinder + Filter */}
          {(step === 2 || step === 'all') && step !== 'done' && (
            <div className={step === 2 ? 'animate-fade-in motion-reduce:animate-none' : ''}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brew-700 mb-2">
                    Grinder
                  </label>
                  <select
                    value={form.grinder}
                    onChange={(e) => update('grinder', e.target.value)}
                    className="w-full p-3 rounded-xl border border-brew-200 bg-parchment-50
                               text-base text-brew-800 focus:outline-none focus:ring-2 focus:ring-brew-400"
                  >
                    {GRINDERS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brew-700 mb-2">
                    Filter Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FILTER_TYPES.map(filter => (
                      <button
                        key={filter}
                        onClick={() => update('filterType', filter)}
                        className={`px-4 py-2.5 rounded-lg border text-sm capitalize
                          min-h-[44px] flex items-center justify-center
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
              </div>
            </div>
          )}

          {/* Wizard Step 3: Kettle + Scale + Notes */}
          {(step === 3 || step === 'all') && step !== 'done' && (
            <div className={step === 3 ? 'animate-fade-in motion-reduce:animate-none' : ''}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brew-700 mb-2">
                    Kettle
                  </label>
                  <select
                    value={form.kettle}
                    onChange={(e) => update('kettle', e.target.value)}
                    className="w-full p-3 rounded-xl border border-brew-200 bg-parchment-50
                               text-base text-brew-800 focus:outline-none focus:ring-2 focus:ring-brew-400"
                  >
                    <option value="gooseneck-electric">Gooseneck Electric</option>
                    <option value="gooseneck-stovetop">Gooseneck Stovetop</option>
                    <option value="standard-electric">Standard Electric</option>
                    <option value="stovetop">Stovetop</option>
                  </select>
                </div>

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
                               text-base text-brew-800 placeholder:text-ceramic-400
                               focus:outline-none focus:ring-2 focus:ring-brew-400"
                  />
                </div>

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
                               text-base text-brew-800 placeholder:text-ceramic-400
                               focus:outline-none focus:ring-2 focus:ring-brew-400 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {step !== 'done' && (
            <div className="mt-6 flex gap-3">
              {/* Back button (wizard mode, step > 1) */}
              {!isEditing && step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-6 py-3 border border-brew-200 text-brew-500 rounded-xl font-medium
                             hover:bg-brew-50 active:scale-[0.98] transition-all"
                >
                  Back
                </button>
              )}

              {/* Next / Save button */}
              {!isEditing && step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-3 bg-crema-500 text-white rounded-xl font-medium
                             hover:bg-crema-600 active:scale-[0.98] transition-all"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-crema-500 text-white rounded-xl font-medium
                             hover:bg-crema-600 active:scale-[0.98] transition-all"
                >
                  {isEditing ? 'Update Gear' : 'Save & Start Brewing'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
