export default function EmptyState({ emoji, title, description, action }) {
  return (
    <div className="mt-12 text-center text-brew-400 animate-fade-in-up motion-reduce:animate-none">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-lg font-medium text-brew-700">{title}</p>
      <p className="text-sm mt-2 max-w-xs mx-auto">{description}</p>
      {action}
    </div>
  )
}
