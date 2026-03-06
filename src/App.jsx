import { useState, useEffect, useRef, useCallback } from 'react'
import { getBrews, getEquipment, getBeans, getRecipes, deduplicateBeans, migrateGrindSettings, migrateBloomToSteps, migrateToSchemaV2, migrateExtractRecipes, migrateDropRecipeSteps, seedDefaultPourTemplates, updateRecipe, forkRecipe } from './data/storage'
import EquipmentSetup from './components/EquipmentSetup'
import SettingsMenu from './components/SettingsMenu'
import BrewForm from './components/BrewForm'
import BrewScreen from './components/BrewScreen'
import BrewHistory from './components/BrewHistory'
import BeanLibrary from './components/BeanLibrary'
import BrewTrends from './components/BrewTrends'
import Header from './components/Header'
import MobileNav from './components/MobileNav'

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

  const [view, setViewRaw] = useState('brew')           // Which screen to show
  const [brews, setBrews] = useState(() => { migrateGrindSettings(); seedDefaultPourTemplates(); migrateBloomToSteps(); migrateToSchemaV2(); migrateExtractRecipes(); migrateDropRecipeSteps(); return getBrews() })
  const [equipment, setEquipment] = useState(() => getEquipment())    // User's gear profile
  const [beans, setBeans] = useState(() => deduplicateBeans())              // Bean library
  const [recipes, setRecipes] = useState(() => getRecipes())          // Recipe library
  const [showSetup, setShowSetup] = useState(false)   // Equipment setup modal
  const [showSettings, setShowSettings] = useState(false) // Settings dropdown
  const [editingBrew, setEditingBrew] = useState(null)    // Brew being edited (null = new brew mode)
  const [brewingBean, setBrewingBean] = useState(null)    // Bean selected for BrewScreen
  const [isBrewActive, setIsBrewActive] = useState(false) // Active brew timer running
  const [brewFlowActive, setBrewFlowActive] = useState(false) // BrewScreen is in a flow phase (hides MobileNav)

  const viewRef = useRef(null)
  const prevViewRef = useRef(view)

  // Navigation guard — confirm before leaving during active brew
  const setView = useCallback((newView) => {
    if (isBrewActive && newView !== 'brew') {
      if (!window.confirm('Brew in progress. Leave and lose timer data?')) return
      setIsBrewActive(false)
    }
    setViewRaw(newView)
  }, [isBrewActive])

  // Replay fade-in animation on view change (without destroying component state)
  useEffect(() => {
    if (view !== prevViewRef.current && viewRef.current) {
      viewRef.current.classList.remove('animate-fade-in')
      void viewRef.current.offsetWidth // force reflow to restart animation
      viewRef.current.classList.add('animate-fade-in')
      prevViewRef.current = view
    }
  }, [view])

  // Clear edit/brew state when navigating away from brew view
  useEffect(() => {
    if (view !== 'brew') {
      setEditingBrew(null)
      setBrewingBean(null)
      setBrewFlowActive(false)

    }
  }, [view])

  // If no equipment is set up yet, show the setup screen first
  // This is the "one-time onboarding" flow
  const needsSetup = !equipment

  return (
    <div className="min-h-screen bg-brew-50">
      <Header
        view={view}
        setView={setView}
        onSettingsClick={() => setShowSettings(prev => !prev)}
        settingsMenu={showSettings && (
          <SettingsMenu
            onEquipmentClick={() => setShowSetup(true)}
            onImportComplete={() => {
              migrateToSchemaV2()
              migrateExtractRecipes()
              migrateDropRecipeSteps()
              setBrews(getBrews())
              setEquipment(getEquipment())
              setBeans(deduplicateBeans())
              setRecipes(getRecipes())
            }}
            onClose={() => setShowSettings(false)}
          />
        )}
      />

      <main className={`max-w-2xl mx-auto px-4 ${brewFlowActive ? 'pb-24' : 'pb-32'} md:pb-24`}>
        {/* First-time setup prompt */}
        {needsSetup && (
          <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-brew-100 animate-fade-in-up motion-reduce:animate-none">
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
                         hover:bg-brew-700 active:scale-[0.98] transition-all"
            >
              Set Up My Gear
            </button>
          </div>
        )}

        {/* Main views — controlled by the nav tabs */}
        <div ref={viewRef} className="animate-fade-in motion-reduce:animate-none">
          {view === 'brew' && !needsSetup && !editingBrew && (
            <BrewScreen
              equipment={equipment}
              beans={beans}
              setBeans={setBeans}
              recipes={recipes}
              setRecipes={setRecipes}
              initialBean={brewingBean}
              onBrewSaved={(updatedBrews) => {
                setBrews(updatedBrews)
                setBrewingBean(null)
              }}
              onBrewActiveChange={setIsBrewActive}
              onNavigate={setView}
              onFlowChange={setBrewFlowActive}
            />
          )}
          {view === 'brew' && !needsSetup && editingBrew && (
            <BrewForm
              equipment={equipment}
              setBeans={setBeans}
              editBrew={editingBrew}
              onBrewSaved={(updatedBrews) => setBrews(updatedBrews)}
              onEditComplete={() => {
                setEditingBrew(null)
                setView('history')
              }}
              recipes={recipes}
              onUpdateRecipe={(recipeId, fields) => {
                updateRecipe(recipeId, fields)
                setRecipes(getRecipes())
              }}
              onSaveAsNewRecipe={(recipeId, fields) => {
                forkRecipe(recipeId, fields)
                setRecipes(getRecipes())
              }}
            />
          )}

          {view === 'beans' && (
            <BeanLibrary
              beans={beans}
              setBeans={setBeans}
              brews={brews}
              recipes={recipes}
              setRecipes={setRecipes}
              onBrewsChange={setBrews}
              onBrewBean={(bean) => {
                setBrewingBean(bean)
                setViewRaw('brew')
              }}
            />
          )}

          {view === 'history' && (
            <BrewHistory
              brews={brews}
              recipes={recipes}
              onBrewsChange={setBrews}
              onNavigate={setView}
              onEditBrew={(brew) => {
                setEditingBrew(brew)
                setView('brew')
              }}
            />
          )}

          {view === 'trends' && (
            <BrewTrends brews={brews} beans={beans} />
          )}
        </div>
      </main>

      {!brewFlowActive && <MobileNav activeView={view} onChangeView={setView} />}

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
