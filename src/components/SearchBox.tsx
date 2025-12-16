import { useMemo, useState } from 'react'

interface SearchBoxProps {
  nodes: { id: string; label: string }[]
  onSelect: (nodeId: string) => void
}

export const SearchBox = ({ nodes, onSelect }: SearchBoxProps) => {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) {
      return []
    }
    return nodes
      .filter((node) => node.id.toLowerCase().includes(value) || node.label.toLowerCase().includes(value))
      .slice(0, 5)
  }, [nodes, query])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (results.length) {
      onSelect(results[0].id)
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search states"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </form>
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => {
                onSelect(node.id)
                setQuery(node.id)
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span>{node.label}</span>
              <span className="text-xs text-slate-400">{node.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}