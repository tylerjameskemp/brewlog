export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-brew-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4
                 animate-fade-in motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        className="bg-parchment-50 rounded-2xl shadow-2xl shadow-brew-900/10 max-w-lg w-full max-h-[90vh] overflow-y-auto
                   border border-ceramic-200/40 animate-scale-in motion-reduce:animate-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-xl font-semibold text-brew-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                         text-ceramic-400 hover:text-brew-700 text-xl rounded-lg hover:bg-parchment-200/60"
            >
              &#x2715;
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
