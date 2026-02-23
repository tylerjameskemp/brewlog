// ============================================================
// MOBILE NAV — Fixed bottom navigation bar for mobile
// ============================================================
// Shown below md: breakpoint. Replaces the top tab bar on phones
// for easier thumb-zone access. Uses safe area insets for notched iPhones.

export default function MobileNav({ activeView, onChangeView }) {
  const tabs = [
    {
      id: 'brew',
      label: 'New Brew',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h11v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6z" />
          <path d="M14 8h1.5a2.5 2.5 0 0 1 0 5H14" />
          <path d="M7 1v3M10 1v3M5 1v3" />
        </svg>
      ),
    },
    {
      id: 'beans',
      label: 'Beans',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="10" cy="10" rx="5" ry="7" />
          <path d="M10 3c-1.5 2-1.5 5 0 7s1.5 5 0 7" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l3 2" />
        </svg>
      ),
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l4-6 4 3 6-8" />
          <path d="M14 6h3v3" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-brew-100 z-10 md:hidden pb-safe">
      <div className="flex h-16">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChangeView(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
              activeView === tab.id
                ? 'text-brew-600'
                : 'text-brew-400'
            }`}
          >
            {tab.icon}
            <span className={`text-[10px] ${activeView === tab.id ? 'font-semibold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
