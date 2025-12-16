import { useCallback, useMemo, useRef, useState } from 'react'

type FileSystemHandleShim = {
  kind: 'file' | 'directory'
  name: string
}

type FileHandleShim = FileSystemHandleShim & {
  kind: 'file'
  getFile: () => Promise<File>
}

type DirectoryHandleShim = FileSystemHandleShim & {
  kind: 'directory'
  values: () => AsyncIterable<FileHandleShim | DirectoryHandleShim>
}

interface LibraryItem {
  id: string
  name: string
  path: string
  loader: () => Promise<string>
}

interface LibraryPaneProps {
  onLoad: (content: string, name: string) => void
  activeFile?: string
  onCollapse?: () => void
}

const isFolderApiAvailable = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

export const LibraryPane = ({ onLoad, activeFile, onCollapse }: LibraryPaneProps) => {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)
  const canPickFolder = isFolderApiAvailable()

  const handleFolderPick = useCallback(async () => {
    if (!isFolderApiAvailable()) {
      return
    }
    try {
      setIsBusy(true)
      const dir = await (window as typeof window & { showDirectoryPicker: () => Promise<DirectoryHandleShim> }).showDirectoryPicker()
      const collected: LibraryItem[] = []
      setSourceLabel(dir.name || 'Folder')
      const walk = async (handle: DirectoryHandleShim, prefix: string) => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            if (!entry.name.toLowerCase().endsWith('.scxml')) continue
            const path = `${prefix}${entry.name}`
            collected.push({
              id: path,
              name: entry.name,
              path,
              loader: async () => {
                const file = await (entry as FileHandleShim).getFile()
                return file.text()
              },
            })
          } else if (entry.kind === 'directory') {
            await walk(entry as DirectoryHandleShim, `${prefix}${entry.name}/`)
          }
        }
      }
      await walk(dir, '')
      collected.sort((a, b) => a.path.localeCompare(b.path))
      setItems(collected)
      if (collected.length > 0) {
        const content = await collected[0].loader()
        onLoad(content, collected[0].path)
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        return
      }
    } finally {
      setIsBusy(false)
    }
  }, [onLoad])

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !files.length) {
      return
    }
    const scxmlFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.scxml'))
    const nextItems: LibraryItem[] = scxmlFiles.map((file) => ({
      id: file.name,
      name: file.name,
      path: file.name,
      loader: () => file.text(),
    }))
    setItems(nextItems)
    setSourceLabel(`Files (${nextItems.length})`)
    if (nextItems.length > 0) {
      const content = await nextItems[0].loader()
      onLoad(content, nextItems[0].path)
    }
  }

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.path.localeCompare(b.path)), [items])

  const handleLoad = async (item: LibraryItem) => {
    try {
      setIsBusy(true)
      const content = await item.loader()
      onLoad(content, item.path)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-200">
        <span>Library</span>
        <div className="flex items-center gap-2">
          {sourceLabel && <span className="text-xs font-medium text-slate-400">{sourceLabel}</span>}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
              aria-label="Collapse library"
              title="Collapse library"
            >
              ◂
            </button>
          )}
        </div>
      </header>
      <div className="flex flex-col gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-3 py-2 font-medium transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:hover:border-brand-400 dark:hover:text-brand-300"
          onClick={handleFolderPick}
          disabled={isBusy}
        >
          Open Folder
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-3 py-2 font-medium transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:hover:border-brand-400 dark:hover:text-brand-300"
          onClick={() => hiddenInputRef.current?.click()}
          disabled={isBusy}
        >
          Import Files
        </button>
        {items.length > 0 && (
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
            onClick={() => {
              setItems([])
              setSourceLabel(null)
            }}
            disabled={isBusy}
          >
            Clear
          </button>
        )}
        {!canPickFolder && <p className="text-xs text-slate-400">Folder access requires Chromium-based browsers.</p>}
        <input
          type="file"
          accept=".scxml"
          multiple
          ref={hiddenInputRef}
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
      <div className="flex-1 overflow-auto border-t border-slate-100 p-4 dark:border-slate-800">
        {sortedItems.length === 0 ? (
          <p className="text-sm text-slate-400">Select a folder or import files to see them here.</p>
        ) : (
          <ul className="space-y-1">
            {sortedItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleLoad(item)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeFile === item.path ? 'bg-slate-100 font-semibold text-brand-600 dark:bg-slate-800 dark:text-brand-300' : 'text-slate-600 dark:text-slate-200'
                  }`}
                  disabled={isBusy && activeFile !== item.path}
                >
                  {item.path}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {isBusy && <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-800">Loading...</div>}
    </section>
  )
}
