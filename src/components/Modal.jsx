export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4
                 animate-fade-in motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto
                   animate-scale-in motion-reduce:animate-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-brew-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center
                         text-brew-400 hover:text-brew-600 text-xl rounded-lg hover:bg-brew-50"
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
