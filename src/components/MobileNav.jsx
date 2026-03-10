// ============================================================
// MOBILE NAV — Fixed bottom navigation bar for mobile
// ============================================================
// Shown below md: breakpoint. Replaces the top tab bar on phones
// for easier thumb-zone access. Uses safe area insets for notched iPhones.

export default function MobileNav({ activeView, onChangeView }) {
  const tabs = [
    { id: 'brew', label: 'Brew' },
    { id: 'beans', label: 'Inventory' },
    { id: 'history', label: 'History' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-ceramic-200/50 z-10 pb-safe">
      <div className="flex h-14">
        {tabs.map(tab => {
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              className={`flex-1 flex items-center justify-center min-h-[44px] transition-colors
                font-condensed text-xs font-bold uppercase tracking-[2.5px]
                ${isActive ? 'text-felt-200' : 'text-felt-700'}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
