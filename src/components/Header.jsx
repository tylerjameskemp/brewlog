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
    <header className="bg-parchment-100/80 backdrop-blur-md border-b border-ceramic-200/60 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-12 md:h-14">
          {/* Logo / App name */}
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">☕</span>
            <span className="font-display text-base font-semibold text-brew-800 tracking-tight hidden sm:inline">
              BrewLog
            </span>
          </div>

          {/* Nav tabs */}
          <nav className="hidden md:flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${view === tab.id
                    ? 'bg-brew-800 text-parchment-100 shadow-sm'
                    : 'text-brew-500 hover:text-brew-700 hover:bg-parchment-200/60'
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
              className="p-3 text-ceramic-400 hover:text-brew-700 rounded-lg
                         hover:bg-parchment-200/60 transition-colors"
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" />
              </svg>
            </button>
            {settingsMenu}
          </div>
        </div>
      </div>
    </header>
  )
}
