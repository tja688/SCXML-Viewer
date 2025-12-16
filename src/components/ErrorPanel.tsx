interface ErrorPanelProps {
  messages: string[]
}

export const ErrorPanel = ({ messages }: ErrorPanelProps) => {
  if (!messages.length) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
      <p className="font-semibold">Something went wrong</p>
      <ul className="mt-2 list-disc pl-5">
        {messages.map((message, index) => (
          <li key={`${message}-${index}`}>{message}</li>
        ))}
      </ul>
    </div>
  )
}