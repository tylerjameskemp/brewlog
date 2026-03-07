export default function EmptyState({ emoji, title, description, action }) {
  return (
    <div className="mt-12 text-center animate-fade-in-up motion-reduce:animate-none">
      <div className="text-4xl mb-4">{emoji}</div>
      <p className="font-display text-xl font-medium text-brew-800">{title}</p>
      <p className="text-sm mt-2 max-w-xs mx-auto text-ceramic-400 leading-relaxed">{description}</p>
      {action}
    </div>
  )
}
