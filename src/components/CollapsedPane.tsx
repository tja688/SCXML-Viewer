interface CollapsedPaneProps {
  title: string
  onExpand: () => void
}

export const CollapsedPane = ({ title, onExpand }: CollapsedPaneProps) => {
  return (
    <section className="flex h-full flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onExpand}
        className="mt-3 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        aria-label={`Expand ${title}`}
        title={`Expand ${title}`}
      >
        ▸
      </button>
      <div
        className="mb-4 select-none text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {title}
      </div>
    </section>
  )
}

