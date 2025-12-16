import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import type { DiagramModel, DiagramNode, LayoutDirection } from './model'
import type { NodeSizeMetadata, TextMeasurer } from './measure'

export interface ElkGraphResult {
  graph: ElkNode
}

const BASE_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.spacing.nodeNode': '70',
  'elk.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.edgeEdge': '32',
  'elk.spacing.edgeNode': '55',
  'elk.layered.mergeEdges': 'false',
}

const toPaddingString = (padding: NodeSizeMetadata['padding']) =>
  `[${padding.top}, ${padding.right}, ${padding.bottom}, ${padding.left}]`

export const buildElkGraph = (
  model: DiagramModel,
  sizes: Record<string, NodeSizeMetadata>,
  direction: LayoutDirection,
  measureText: TextMeasurer,
): ElkGraphResult => {
  const edges: ElkExtendedEdge[] = []

  const collectTransitions = (node: DiagramNode) => {
    node.transitions.forEach((transition) => {
      const labelText = transition.label || ''
      edges.push({
        id: transition.id,
        sources: [transition.source],
        targets: [transition.target],
        labels:
          labelText && labelText.trim().length
            ? [
                {
                  id: `${transition.id}-label`,
                  text: labelText,
                  width: Math.max(40, measureText(labelText, 12, 500) + 16),
                  height: 20,
                },
              ]
            : undefined,
      })
    })
    node.children.forEach(collectTransitions)
  }

  collectTransitions(model.root)

  const convertNode = (node: DiagramNode): ElkNode => {
    const size = sizes[node.id]
    const base: ElkNode = {
      id: node.id,
      width: size?.width,
      height: size?.height,
    }

    if (size?.isContainer && node.children.length) {
      base.children = node.children.map(convertNode)
      base.layoutOptions = {
        ...(base.layoutOptions || {}),
        'elk.padding': toPaddingString(size.padding),
      }
    } else if (node.children.length) {
      base.children = node.children.map(convertNode)
    }

    return base
  }

  const graph: ElkNode = {
    id: model.root.id,
    layoutOptions: {
      ...BASE_LAYOUT_OPTIONS,
      'elk.direction': direction,
    },
    children: model.root.children.map(convertNode),
    edges,
  }

  const rootSize = sizes[model.root.id]
  if (rootSize) {
    graph.width = rootSize.width
    graph.height = rootSize.height
    graph.layoutOptions = {
      ...graph.layoutOptions,
      'elk.padding': toPaddingString(rootSize.padding),
    }
  }

  return { graph }
}
