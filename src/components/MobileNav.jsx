// ============================================================
// MOBILE NAV — Fixed bottom navigation bar for mobile
// ============================================================
// Shown below md: breakpoint. Replaces the top tab bar on phones
// for easier thumb-zone access. Uses safe area insets for notched iPhones.

const NAV_ICONS = {
  brew: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" />
      <path d="M5 12l-1 8h16l-1-8" />
      <path d="M9 2v2M12 2v2M15 2v2" />
    </svg>
  ),
  beans: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 2 4 6 4 12s4 10 8 10c4 0 8-4 8-10S16 2 12 2Z" />
      <path d="M12 2c-2 2-3 6-3 10s1 8 3 10" />
    </svg>
  ),
  history: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  trends: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
}

export default function MobileNav({ activeView, onChangeView }) {
  const tabs = [
    { id: 'brew', label: 'Brew' },
    { id: 'beans', label: 'Inventory' },
    { id: 'history', label: 'History' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-parchment-100/80 backdrop-blur-md border-t border-ceramic-200/50 z-10 pb-safe">
      <div className="flex h-16">
        {tabs.map(tab => {
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] gap-0.5 transition-colors
                ${isActive ? 'text-felt-200' : 'text-felt-700'}`}
            >
              {NAV_ICONS[tab.id]}
              <span className="font-condensed text-[10px] font-bold uppercase tracking-[2px]">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
