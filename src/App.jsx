import { useState, useEffect } from 'react'
import { getBrews, getEquipment, getBeans } from './data/storage'
import EquipmentSetup from './components/EquipmentSetup'
import BrewForm from './components/BrewForm'
import BrewHistory from './components/BrewHistory'
import Header from './components/Header'

// ============================================================
// APP — The main component that holds everything together
// ============================================================
// React apps are built from "components" — reusable pieces of UI.
// This App component is the top-level container. It manages which
// "view" you're looking at (new brew, history, etc.) and passes
// data down to child components.
//
// KEY CONCEPT: "State" is data that can change and trigger re-renders.
// When you call setState, React re-draws the affected parts of the UI.
// ============================================================

function App() {
  // --- STATE ---
  // useState returns [currentValue, setterFunction]
  // Think of these as variables that React watches for changes.

  const [view, setView] = useState('brew')           // Which screen to show
  const [brews, setBrews] = useState([])              // All logged brews
  const [equipment, setEquipment] = useState(null)    // User's gear profile
  const [beans, setBeans] = useState([])              // Bean library
  const [showSetup, setShowSetup] = useState(false)   // Equipment setup modal

  // --- LOAD DATA ON STARTUP ---
  // useEffect runs code when the component first appears ("mounts").
  // Here we're loading saved data from localStorage.
  useEffect(() => {
    setBrews(getBrews())
    setEquipment(getEquipment())
    setBeans(getBeans())
  }, []) // Empty array = run once on mount

  // If no equipment is set up yet, show the setup screen first
  // This is the "one-time onboarding" flow
  const needsSetup = !equipment

  return (
    <div className="min-h-screen bg-brew-50">
      <Header
        view={view}
        setView={setView}
        onSettingsClick={() => setShowSetup(true)}
      />

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* First-time setup prompt */}
        {needsSetup && (
          <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-brew-100">
            <h2 className="text-xl font-semibold text-brew-800 mb-2">
              Welcome to BrewLog
            </h2>
            <p className="text-brew-600 mb-4">
              Let's start by setting up your brewing gear. This only takes a minute
              and helps pre-fill your brew sessions.
            </p>
            <button
              onClick={() => setShowSetup(true)}
              className="px-6 py-3 bg-brew-600 text-white rounded-xl font-medium
                         hover:bg-brew-700 active:scale-95"
            >
              Set Up My Gear
            </button>
          </div>
        )}

        {/* Main views — controlled by the nav tabs */}
        {view === 'brew' && !needsSetup && (
          <BrewForm
            equipment={equipment}
            beans={beans}
            setBeans={setBeans}
            onBrewSaved={(updatedBrews) => setBrews(updatedBrews)}
          />
        )}

        {view === 'history' && (
          <BrewHistory
            brews={brews}
            onBrewsChange={setBrews}
          />
        )}
      </main>

      {/* Equipment setup modal/overlay */}
      {showSetup && (
        <EquipmentSetup
          existing={equipment}
          onSave={(eq) => {
            setEquipment(eq)
            setShowSetup(false)
          }}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  )
}

export default App
