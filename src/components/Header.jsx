// ============================================================
// HEADER — Top navigation bar
// ============================================================
// Simple nav with tabs for switching views.
// "props" are values passed from the parent component (App).

export default function Header({ view, setView, onSettingsClick, settingsMenu }) {
  const tabs = [
    { id: 'brew', label: 'New Brew' },
    { id: 'beans', label: 'Beans' },
    { id: 'history', label: 'History' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <header className="bg-white border-b border-brew-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / App name */}
          <h1 className="text-lg font-bold text-brew-800 tracking-tight">
            ☕ BrewLog
          </h1>

          {/* Nav tabs */}
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${view === tab.id
                    ? 'bg-brew-100 text-brew-800'
                    : 'text-brew-500 hover:text-brew-700 hover:bg-brew-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Settings gear */}
          <div className="relative">
            <button
              onClick={onSettingsClick}
              className="p-2 text-brew-400 hover:text-brew-600 rounded-lg
                         hover:bg-brew-50 transition-colors"
              title="Settings"
            >
              ⚙️
            </button>
            {settingsMenu}
          </div>
        </div>
      </div>
    </header>
  )
}
