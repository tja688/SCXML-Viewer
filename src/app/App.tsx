import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { SAMPLE_SCXML } from './sampleScxml'
import { useTheme } from './theme'
import { EditorPane } from '../components/EditorPane'
import { LibraryPane } from '../components/LibraryPane'
import { DiagramPane } from '../components/DiagramPane'
import { ErrorPanel } from '../components/ErrorPanel'
import { CollapsedPane } from '../components/CollapsedPane'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { parseScxml } from '../diagram/scxmlParser'
import { createTextMeasurer, measureDiagramNodes, type TextMeasurer } from '../diagram/measure'
import { buildElkGraph } from '../diagram/elkGraph'
import { buildRenderGraph, type RenderGraph } from '../diagram/render'
import type { LayoutDirection } from '../diagram/model'
import { useLayoutWorker } from '../hooks/useLayoutWorker'

const readPersistedBool = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    if (value === '1') return true
    if (value === '0') return false
  } catch {
    return fallback
  }
  return fallback
}

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

const App = () => {
  const [scxml, setScxml] = useState(SAMPLE_SCXML)
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('RIGHT')
  const [activeFile, setActiveFile] = useState<string | undefined>()
  const [focusedNodeId, setFocusedNodeId] = useState<string | undefined>()
  const [renderGraph, setRenderGraph] = useState<RenderGraph | null>(null)
  const [libraryCollapsed, setLibraryCollapsed] = useState(() => readPersistedBool('scxml-viewer:collapsed:library', false))
  const [editorCollapsed, setEditorCollapsed] = useState(() => readPersistedBool('scxml-viewer:collapsed:editor', false))
  const debouncedSource = useDebouncedValue(scxml, 400)
  const measureText = useMemo<TextMeasurer | null>(() => {
    if (typeof document === 'undefined') return null
    return createTextMeasurer()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('scxml-viewer:collapsed:library', libraryCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [libraryCollapsed])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('scxml-viewer:collapsed:editor', editorCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [editorCollapsed])

  const parseResult = useMemo(() => parseScxml(debouncedSource), [debouncedSource])
  const nodeSizes = useMemo(() => {
    if (!parseResult.ok || !measureText) {
      return null
    }
    return measureDiagramNodes(parseResult.model, measureText)
  }, [measureText, parseResult])

  const elkGraph = useMemo(() => {
    if (!parseResult.ok || !nodeSizes || !measureText) {
      return null
    }
    return buildElkGraph(parseResult.model, nodeSizes, layoutDirection, measureText).graph
  }, [layoutDirection, measureText, nodeSizes, parseResult])

  const { layout, isComputing, error: layoutError } = useLayoutWorker(elkGraph)

  useEffect(() => {
    if (!layout || !parseResult.ok || !nodeSizes) {
      return
    }
    const nextGraph = buildRenderGraph(layout, parseResult.model, nodeSizes)
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => setRenderGraph(nextGraph))
    } else {
      Promise.resolve().then(() => setRenderGraph(nextGraph))
    }
  }, [layout, nodeSizes, parseResult])

  const errorMessages: string[] = []
  if (!parseResult.ok) {
    errorMessages.push(parseResult.error)
  }
  if (layoutError) {
    errorMessages.push(layoutError)
  }

  const handleFileLoad = (content: string, name: string) => {
    setScxml(content)
    setActiveFile(name)
  }

  const handleNodeSelect = (nodeId: string) => {
    setFocusedNodeId(nodeId)
  }

  const layoutCols = `${libraryCollapsed ? '52px' : '260px'} ${editorCollapsed ? '52px' : 'minmax(0,1fr)'} minmax(0,1.3fr)`
  const gridStyle = useMemo(() => ({ '--layout-cols': layoutCols } as CSSProperties), [layoutCols])

  return (
    <div className="min-h-screen bg-surface-light px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">SCXML -&gt; UML Viewer</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Paste SCXML, browse files, and visualize hierarchical state machines instantly.
            </p>
          </div>
          <ThemeToggle />
        </header>
        {errorMessages.length > 0 && <ErrorPanel messages={errorMessages} />}
        <div className="grid gap-4 lg:[grid-template-columns:var(--layout-cols)]" style={gridStyle}>
          <div className="h-[78vh]">
            {libraryCollapsed ? (
              <CollapsedPane title="Library" onExpand={() => setLibraryCollapsed(false)} />
            ) : (
              <LibraryPane onLoad={handleFileLoad} activeFile={activeFile} onCollapse={() => setLibraryCollapsed(true)} />
            )}
          </div>
          <div className="h-[78vh]">
            {editorCollapsed ? (
              <CollapsedPane title="SCXML" onExpand={() => setEditorCollapsed(false)} />
            ) : (
              <EditorPane
                value={scxml}
                onChange={setScxml}
                warnings={parseResult.ok ? parseResult.warnings : []}
                error={parseResult.ok ? undefined : parseResult.error}
                focusNodeId={focusedNodeId}
                onCollapse={() => setEditorCollapsed(true)}
              />
            )}
          </div>
          <div className="h-[80vh]">
            <DiagramPane
              graph={renderGraph}
              isComputing={isComputing}
              direction={layoutDirection}
              onDirectionChange={(dir) => setLayoutDirection(dir)}
              focusedNodeId={focusedNodeId}
              onSelectNode={handleNodeSelect}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
