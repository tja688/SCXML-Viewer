import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import type { DiagramModel, DiagramNode, LayoutDirection } from './model'
import type { NodeSizeMetadata, TextMeasurer } from './measure'

export interface ElkGraphResult {
  graph: ElkNode
}

// 优化后的布局配置 - 解决遮挡问题
const BASE_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',

  // === 关键修复1: 大幅增加间距以避免遮挡 ===
  'elk.spacing.nodeNode': '120',                    // 节点间距: 80 -> 120
  'elk.spacing.nodeNodeBetweenLayers': '200',       // 层间距: 150 -> 200
  'elk.spacing.edgeEdge': '60',                     // 边缘间距: 40 -> 60
  'elk.spacing.edgeNode': '80',                     // 边缘到节点: 50 -> 80
  'elk.spacing.edgeLabel': '30',                    // 新增：边缘标签间距
  'elk.spacing.labelLabel': '20',                   // 新增：标签之间的间距
  'elk.spacing.componentComponent': '100',          // 新增：组件间距

  // === 关键修复2: 启用重叠检测和处理 ===
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',  // 使用更高级的节点放置算法
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'elk.layered.spacing.nodeNodeBetweenLayers': '200',       // 层间额外间距

  // === 关键修复3: 边缘和标签优化 ===
  'elk.layered.mergeEdges': 'false',
  'elk.edgeLabels.inline': 'false',                 // 标签不内联，避免与边缘重叠
  'elk.edgeLabels.placement': 'CENTER',             // 标签居中放置

  // === 关键修复4: 交叉最小化，减少视觉混乱 ===
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.semiInteractive': 'true',

  // === 关键修复5: 紧凑性控制 ===
  'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
  'elk.layered.compaction.connectedComponents': 'true',

  // === 关键修复6: 高优先级间距 ===
  'elk.spacing.individual': 'true',                 // 启用单独间距控制
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
                // === 修复: 增加标签宽度padding，避免与连线和其他元素重叠 ===
                width: Math.max(60, measureText(labelText, 12, 500) + 40),  // padding: 16 -> 40
                height: 24,  // height: 20 -> 24，给予更多垂直空间
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
    const hasChildren = node.children.length > 0

    const base: ElkNode = {
      id: node.id,
      // === 修复点开始 ===
      // 不要传 undefined，必须传数值。
      // 即使是有子节点的容器，我们也传一个初始值。
      // ELK 的 layered 算法会自动忽略这个值并根据子节点重新计算大小，
      // 但前提是这个属性必须存在，否则 worker 可能会报错。
      width: size?.width || 100,
      height: size?.height || 50,
      // === 修复点结束 ===
    }

    if (hasChildren) {
      base.children = node.children.map(convertNode)
      base.layoutOptions = {
        ...(base.layoutOptions || {}),
        'elk.padding': size ? toPaddingString(size.padding) : '[20,20,20,20]',
      }
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
    graph.layoutOptions = {
      ...graph.layoutOptions,
      'elk.padding': toPaddingString(rootSize.padding),
    }
  }

  return { graph }
}