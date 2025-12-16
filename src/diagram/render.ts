import type { ElkEdgeSection, ElkExtendedEdge, ElkLabel, ElkNode, ElkPoint } from 'elkjs'
import type { DiagramModel } from './model'
import type { NodeSizeMetadata } from './measure'

export interface RenderNode {
  id: string
  label: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  children: RenderNode[]
  parentId: string | null
  depth: number
  headerHeight: number
  isContainer: boolean
  historyType?: 'shallow' | 'deep'
}

export interface RenderEdge {
  id: string
  source: string
  target: string
  path: string
  label?: {
    text: string
    x: number
    y: number
    width: number
    height: number
  }
}

export interface RenderGraph {
  root: RenderNode
  nodes: RenderNode[]
  edges: RenderEdge[]
  bounds: { width: number; height: number }
  nodeMap: Record<string, RenderNode>
}

const buildPathFromSection = (section: ElkEdgeSection, offsetX: number, offsetY: number) => {
  const points: ElkPoint[] = []
  if (section.startPoint) {
    points.push({ x: section.startPoint.x + offsetX, y: section.startPoint.y + offsetY })
  }
  if (section.bendPoints) {
    section.bendPoints.forEach((pt) => points.push({ x: pt.x + offsetX, y: pt.y + offsetY }))
  }
  if (section.endPoint) {
    points.push({ x: section.endPoint.x + offsetX, y: section.endPoint.y + offsetY })
  }
  if (!points.length) {
    return ''
  }
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
}

const labelCenter = (label: ElkLabel | undefined, offsetX: number, offsetY: number) => {
  if (!label) return undefined
  const x = (label.x ?? 0) + (label.width ?? 0) / 2 + offsetX
  const y = (label.y ?? 0) + (label.height ?? 0) / 2 + offsetY
  return { x, y }
}

export const buildRenderGraph = (
  layout: ElkNode,
  model: DiagramModel,
  sizes: Record<string, NodeSizeMetadata>,
): RenderGraph => {
  const nodeMap: Record<string, RenderNode> = {}

  const convertNode = (node: ElkNode, parentId: string | null, offsetX: number, offsetY: number, depth: number): RenderNode => {
    const modelNode = model.nodesById[node.id]
    const metrics = sizes[node.id]
    const absoluteX = (node.x ?? 0) + offsetX
    const absoluteY = (node.y ?? 0) + offsetY
    const width = node.width ?? metrics?.width ?? 0
    const height = node.height ?? metrics?.height ?? 0

    const renderNode: RenderNode = {
      id: node.id,
      label: modelNode?.label ?? node.id,
      kind: modelNode?.kind ?? 'state',
      x: absoluteX,
      y: absoluteY,
      width,
      height,
      children: [],
      parentId,
      depth,
      headerHeight: metrics?.headerHeight ?? 0,
      isContainer: Boolean(metrics?.isContainer),
      historyType: modelNode?.historyType,
    }

    nodeMap[renderNode.id] = renderNode
    renderNode.children = (node.children ?? []).map((child) => convertNode(child, node.id, absoluteX, absoluteY, depth + 1))

    return renderNode
  }

  const root = convertNode(layout, null, 0, 0, 0)

  const edges: RenderEdge[] = []
  const extendedEdges = (layout.edges as ElkExtendedEdge[] | undefined) ?? []
  extendedEdges.forEach((edge) => {
    const containerId = edge.container ?? layout.id
    const containerNode = nodeMap[containerId]
    const offsetX = containerNode?.x ?? 0
    const offsetY = containerNode?.y ?? 0
    const sections = edge.sections ?? []
    sections.forEach((section, index) => {
      const path = buildPathFromSection(section, offsetX, offsetY)
      if (!path) return
      const label = edge.labels?.[index] ?? edge.labels?.[0]
      const center = labelCenter(label, offsetX, offsetY)
      edges.push({
        id: `${edge.id}-${index}`,
        source: edge.sources?.[0] ?? '',
        target: edge.targets?.[0] ?? '',
        path,
        label:
          label && center
            ? {
                text: label.text ?? '',
                x: center.x,
                y: center.y,
                width: label.width ?? 80,
                height: label.height ?? 20,
              }
            : undefined,
      })
    })
  })

  const flatNodes: RenderNode[] = []
  const flatten = (node: RenderNode) => {
    flatNodes.push(node)
    node.children.forEach(flatten)
  }
  flatten(root)

  return {
    root,
    nodes: flatNodes,
    edges,
    nodeMap,
    bounds: {
      width: layout.width ?? root.width,
      height: layout.height ?? root.height,
    },
  }
}

export const findNodeByQuery = (graph: RenderGraph, query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return undefined
  return graph.nodes.find((node) => node.id.toLowerCase().includes(normalized) || node.label.toLowerCase().includes(normalized))
}
