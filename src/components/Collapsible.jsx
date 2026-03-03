export default function Collapsible({ open, children }) {
  return (
    <div
      aria-hidden={!open}
      className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
        open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}
