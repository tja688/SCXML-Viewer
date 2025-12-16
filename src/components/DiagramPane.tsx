import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LayoutDirection } from '../diagram/model'
import type { RenderGraph, RenderNode } from '../diagram/render'
import { useResizeObserver } from '../hooks/useResizeObserver'
import { SearchBox } from './SearchBox'

interface DiagramPaneProps {
  graph: RenderGraph | null
  isComputing: boolean
  direction: LayoutDirection
  onDirectionChange: (direction: LayoutDirection) => void
  focusedNodeId?: string
  onSelectNode?: (nodeId: string) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const toSafeSvgId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_')

export const DiagramPane = ({ graph, isComputing, direction, onDirectionChange, focusedNodeId, onSelectNode }: DiagramPaneProps) => {
  const { ref: containerRef, size } = useResizeObserver<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.9 })
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const pointerRef = useRef({ active: false, x: 0, y: 0, pointerId: -1 })

  const nodesForSearch = useMemo(() => (graph ? graph.nodes.filter((node) => node.kind !== 'root').map((node) => ({ id: node.id, label: node.label })) : []), [graph])

  const focusNode = useCallback(
    (node: RenderNode) => {
      if (!size.width || !size.height) return
      setTransform((prev) => {
        const scale = prev.scale
        const centerX = node.x + node.width / 2
        const centerY = node.y + node.height / 2
        return {
          x: size.width / 2 - centerX * scale,
          y: size.height / 2 - centerY * scale,
          scale,
        }
      })
    },
    [size.height, size.width],
  )

  const fitToScreen = useCallback(() => {
    if (!graph || !size.width || !size.height) {
      return
    }
    const padding = 60
    const availableWidth = Math.max(size.width - padding * 2, 100)
    const availableHeight = Math.max(size.height - padding * 2, 100)
    const width = graph.bounds.width || 100
    const height = graph.bounds.height || 100
    const scale = clamp(Math.min(availableWidth / width, availableHeight / height), 0.2, 2.5)
    setTransform({
      scale,
      x: (size.width - width * scale) / 2,
      y: (size.height - height * scale) / 2,
    })
  }, [graph, size.height, size.width])

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => fitToScreen())
    return () => window.cancelAnimationFrame(raf)
  }, [fitToScreen])

  const handleWheel = (event: React.WheelEvent) => {
    if (!svgRef.current) return
    if (event.cancelable) {
      event.preventDefault()
    }
    const rect = svgRef.current.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    setTransform((prev) => {
      const delta = -event.deltaY
      const zoomFactor = delta > 0 ? 1.1 : 0.9
      const nextScale = clamp(prev.scale * zoomFactor, 0.2, 3)
      const scaleRatio = nextScale / prev.scale
      const x = point.x - (point.x - prev.x) * scaleRatio
      const y = point.y - (point.y - prev.y) * scaleRatio
      return { scale: nextScale, x, y }
    })
  }

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    pointerRef.current = { active: true, x: event.clientX, y: event.clientY, pointerId: event.pointerId }
    setIsPanning(true)
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointerRef.current.active) return
    const dx = event.clientX - pointerRef.current.x
    const dy = event.clientY - pointerRef.current.y
    pointerRef.current = { ...pointerRef.current, x: event.clientX, y: event.clientY }
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }

  const endPan = (event: React.PointerEvent) => {
    if (!pointerRef.current.active) return
    const shouldRelease = pointerRef.current.pointerId === event.pointerId
    pointerRef.current = { active: false, x: 0, y: 0, pointerId: -1 }
    setIsPanning(false)
    if (shouldRelease) {
      const target = event.currentTarget as HTMLElement
      target.releasePointerCapture(event.pointerId)
    }
  }

  const zoomBy = (factor: number) => {
    setTransform((prev) => ({ ...prev, scale: clamp(prev.scale * factor, 0.2, 3) }))
  }

  const handleSearchSelect = (nodeId: string) => {
    if (!graph) return
    const node = graph.nodeMap[nodeId]
    if (node) {
      focusNode(node)
      onSelectNode?.(nodeId)
    }
  }

  const handleNodeClick = (node: RenderNode) => {
    onSelectNode?.(node.id)
    focusNode(node)
  }

  const directionOptions: LayoutDirection[] = ['RIGHT', 'DOWN']

  const containerNodes = useMemo(() => {
    if (!graph) return []
    return graph.nodes
      .filter((node) => node.kind !== 'root' && node.isContainer)
      .sort((a, b) => a.depth - b.depth)
  }, [graph])

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-100">
        <div>Diagram</div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {directionOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onDirectionChange(option)}
                className={clsx(
                  'rounded-full px-3 py-1 font-medium transition',
                  option === direction
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                )}
              >
                {option === 'RIGHT' ? 'Left -&gt; Right' : 'Top -&gt; Down'}
              </button>
            ))}
          </div>
          <div className="w-full md:w-64">
            <SearchBox nodes={nodesForSearch} onSelect={handleSearchSelect} />
          </div>
        </div>
      </header>
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-b-2xl bg-diagram-grid bg-[length:32px_32px] dark:bg-diagram-grid-dark"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onPointerCancel={endPan}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          className="h-full w-full"
          viewBox={`0 0 ${size.width || 1024} ${size.height || 768}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="edge-arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-500 dark:fill-slate-200" />
            </marker>
            <marker id="edge-arrow-active" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-brand-500" />
            </marker>
          </defs>
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {graph ? (
              <>
                {containerNodes.map((node) => (
                  <g key={`${node.id}-bg`} transform={`translate(${node.x}, ${node.y})`} pointerEvents="none">
                    <rect
                      width={node.width}
                      height={node.height}
                      rx={14}
                      className="fill-slate-50/70 dark:fill-slate-950/25"
                    />
                  </g>
                ))}
                {(graph.edges ?? []).map((edge) => {
                  const isActive =
                    hoveredNodeId === edge.source ||
                    hoveredNodeId === edge.target ||
                    focusedNodeId === edge.source ||
                    focusedNodeId === edge.target
                  return (
                    <g key={edge.id}>
                      <path
                        d={edge.path}
                        className={clsx('fill-none stroke-2', isActive ? 'stroke-brand-500' : 'stroke-slate-400 dark:stroke-slate-500')}
                        markerEnd={isActive ? 'url(#edge-arrow-active)' : 'url(#edge-arrow)'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      {edge.label && (
                        <g transform={`translate(${edge.label.x}, ${edge.label.y})`}>
                          <rect
                            x={-edge.label.width / 2}
                            y={-edge.label.height / 2}
                            width={edge.label.width}
                            height={edge.label.height}
                            rx={6}
                            className="fill-white/90 stroke-none dark:fill-slate-900/90"
                          />
                          <text
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            className="text-xs font-medium fill-slate-600 dark:fill-slate-200"
                          >
                            {edge.label.text}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
                {graph.nodes
                  .filter((node) => node.kind !== 'root')
                  .sort((a, b) => a.depth - b.depth)
                  .map((node) => {
                    const isFocused = node.id === focusedNodeId
                    const rectClass = clsx(
                      'stroke-2',
                      isFocused ? 'stroke-brand-500' : 'stroke-slate-300 dark:stroke-slate-600',
                      node.isContainer ? 'fill-transparent' : 'fill-white dark:fill-slate-900',
                    )
                    const safeId = toSafeSvgId(node.id)
                    const clipId = `node-label-clip-${safeId}`
                    const labelClipRight = node.kind === 'parallel' ? 58 : 20
                    const labelClipWidth = Math.max(0, node.width - 16 - labelClipRight)
                    const labelY = node.headerHeight ? node.headerHeight / 2 : 22
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() => handleNodeClick(node)}
                        className="cursor-pointer"
                      >
                        {node.kind === 'final' ? (
                          <>
                            <circle
                              r={node.width / 2}
                              cx={node.width / 2}
                              cy={node.height / 2}
                              className="fill-white stroke-slate-500 dark:fill-slate-900 dark:stroke-slate-300"
                              strokeWidth={2}
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle r={(node.width / 2) - 6} cx={node.width / 2} cy={node.height / 2} className="fill-brand-500" />
                          </>
                        ) : node.kind === 'initial' ? (
                          <circle r={node.width / 2} cx={node.width / 2} cy={node.height / 2} className="fill-brand-500" />
                        ) : node.kind === 'history' ? (
                          <>
                            <circle
                              r={node.width / 2}
                              cx={node.width / 2}
                              cy={node.height / 2}
                              className="fill-white stroke-slate-500 dark:fill-slate-900 dark:stroke-slate-300"
                              strokeWidth={2}
                              vectorEffect="non-scaling-stroke"
                            />
                            <text
                              x={node.width / 2}
                              y={node.height / 2}
                              textAnchor="middle"
                              alignmentBaseline="central"
                              className="text-sm font-semibold fill-slate-600 dark:fill-slate-100"
                            >
                              {node.historyType === 'deep' ? 'H*' : 'H'}
                            </text>
                          </>
                        ) : (
                          <>
                            <defs>
                              <clipPath id={clipId}>
                                <rect x={16} y={0} width={labelClipWidth} height={Math.max(32, node.headerHeight || 32)} rx={8} />
                              </clipPath>
                            </defs>
                            <rect width={node.width} height={node.height} rx={12} className={rectClass} vectorEffect="non-scaling-stroke" />
                            {node.headerHeight > 0 && (
                              <rect
                                width={node.width}
                                height={node.headerHeight}
                                rx={12}
                                className={clsx(
                                  'fill-slate-100/80 dark:fill-slate-800/80',
                                  isFocused && 'stroke-2 stroke-brand-500',
                                )}
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                            <text
                              x={16}
                              y={labelY}
                              clipPath={`url(#${clipId})`}
                              dominantBaseline="middle"
                              className="text-sm font-semibold fill-slate-700 dark:fill-slate-100"
                            >
                              {node.label}
                            </text>
                            {node.kind === 'parallel' && (
                              <text
                                x={node.width - 24}
                                y={labelY}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="text-base font-semibold tracking-widest text-slate-400 dark:text-slate-500"
                              >
                                ||
                              </text>
                            )}
                          </>
                        )}
                        <title>{node.id}</title>
                      </g>
                    )
                  })}
              </>
            ) : null}
          </g>
        </svg>
        {!graph && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Paste SCXML to see the diagram.
          </div>
        )}
        {isComputing && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow dark:bg-slate-900/90 dark:text-slate-200">
            Layout running...
          </div>
        )}
        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-sm text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
          <button type="button" onClick={() => zoomBy(0.9)} className="rounded-full px-3 py-1 hover:text-brand-500">-</button>
          <button type="button" onClick={() => zoomBy(1.1)} className="rounded-full px-3 py-1 hover:text-brand-500">+</button>
          <button type="button" onClick={fitToScreen} className="rounded-full px-3 py-1 hover:text-brand-500">
            Fit
          </button>
        </div>
      </div>
    </section>
  )
}
