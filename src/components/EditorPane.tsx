import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEffect, useMemo, useRef } from 'react'
import { useTheme } from '../app/theme'

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  warnings: string[]
  error?: string
  focusNodeId?: string
  onReady?: (instance: editor.IStandaloneCodeEditor) => void
  onCollapse?: () => void
}

export const EditorPane = ({ value, onChange, warnings, error, focusNodeId, onReady, onCollapse }: EditorPaneProps) => {
  const { theme } = useTheme()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      minimap: { enabled: false },
      fontSize: 14,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
    }),
    [],
  )

  useEffect(() => {
    if (!focusNodeId || !editorRef.current) {
      return
    }
    const instance = editorRef.current
    const model = instance.getModel()
    if (!model) {
      return
    }
    const matches = model.findMatches(`id="${focusNodeId}"`, false, false, false, null, true)
    if (matches.length > 0) {
      const range = matches[0].range
      instance.setSelection(range)
      instance.revealRangeInCenter(range)
    }
  }, [focusNodeId])

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-2">
          SCXML
          {error && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-normal text-red-700 dark:bg-red-400/20 dark:text-red-300">Parse error</span>}
        </div>
        <div className="flex items-center gap-2">
          {warnings.length > 0 && (
            <div className="text-xs font-medium text-amber-600 dark:text-amber-300">
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </div>
          )}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
              aria-label="Collapse editor"
              title="Collapse editor"
            >
              ◂
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Editor
          language="xml"
          theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          value={value}
          onChange={(next) => onChange(next ?? '')}
          options={options}
          onMount={(instance) => {
            editorRef.current = instance
            onReady?.(instance)
          }}
        />
      </div>
      {warnings.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-300">
          {warnings.map((warning, index) => (
            <div key={`${warning}-${index}`}>{warning}</div>
          ))}
        </div>
      )}
    </section>
  )
}
