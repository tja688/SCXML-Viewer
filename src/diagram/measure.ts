import type { DiagramModel, DiagramNode } from './model'

export interface NodeSizeMetadata {
  width: number
  height: number
  headerHeight: number
  padding: { top: number; right: number; bottom: number; left: number }
  isContainer: boolean
}

export type TextMeasurer = (text: string, fontSize?: number, fontWeight?: number) => number

export const createTextMeasurer = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this environment')
  }
  const fontFamily = '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  return (text: string, fontSize = 14, fontWeight = 600) => {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const metrics = ctx.measureText(text || '')
    return metrics.width
  }
}

// === 优化后的尺寸常量 - 解决遮挡问题 ===
const BASE_WIDTH = 200           // 基础宽度: 160 -> 200
const BASE_HEIGHT = 72           // 基础高度: 64 -> 72
const HEADER_HEIGHT = 40         // 标题高度: 36 -> 40
const LABEL_LEFT = 20            // 左边距: 16 -> 20
const LABEL_RIGHT = 24           // 右边距: 20 -> 24
const BODY_PADDING_X = 28        // 水平内边距: 22 -> 28
const BODY_PADDING_Y = 20        // 垂直内边距: 16 -> 20

const circleNode = (size: number): NodeSizeMetadata => ({
  width: size,
  height: size,
  headerHeight: 0,
  // === 增加圆形节点的padding，避免与其他元素靠太近 ===
  padding: { top: 12, right: 12, bottom: 12, left: 12 },  // 8 -> 12
  isContainer: false,
})

const computeNodeSize = (node: DiagramNode, measureText: TextMeasurer): NodeSizeMetadata => {
  // === 增加圆形节点尺寸，使其更清晰可见 ===
  if (node.kind === 'initial') {
    return circleNode(32)  // 28 -> 32
  }
  if (node.kind === 'final') {
    return circleNode(48)  // 40 -> 48
  }
  if (node.kind === 'history') {
    return circleNode(40)  // 32 -> 40
  }

  const labelText = node.label || node.id
  const labelWidth = measureText(labelText, 14, 600)
  const parallelBadgeWidth = node.kind === 'parallel' ? measureText('||', 16, 600) + 18 : 0
  const hasChildren = node.children.length > 0
  const minWidth = node.kind === 'root' ? 280 : BASE_WIDTH
  const width = Math.max(minWidth, LABEL_LEFT + labelWidth + LABEL_RIGHT + parallelBadgeWidth)

  if (!hasChildren) {
    return {
      width,
      height: Math.max(BASE_HEIGHT, 18 + BODY_PADDING_Y * 2),
      headerHeight: 0,
      padding: { top: BODY_PADDING_Y, right: BODY_PADDING_X, bottom: BODY_PADDING_Y, left: BODY_PADDING_X },
      isContainer: false,
    }
  }

  // === 修正点：容器节点优化 ===
  // 容器节点需要给子节点足够的空间，同时让ELK能够正确计算布局
  // 给一个合理的初始高度：标题高度 + 顶部padding + 底部最小空间
  const containerMinHeight = HEADER_HEIGHT + 60  // 给予更多初始空间

  return {
    width,
    height: containerMinHeight,  // 更合理的初始高度
    headerHeight: HEADER_HEIGHT,
    padding: {
      top: HEADER_HEIGHT + 32,   // 顶部padding增加：24 -> 32
      right: 32,                  // 右侧padding增加：24 -> 32
      bottom: 32,                 // 底部padding增加：24 -> 32
      left: 32                    // 左侧padding增加：24 -> 32
    },
    isContainer: true,
  }
}

export const measureDiagramNodes = (model: DiagramModel, measureText: TextMeasurer) => {
  const sizes: Record<string, NodeSizeMetadata> = {}

  const visit = (node: DiagramNode) => {
    sizes[node.id] = computeNodeSize(node, measureText)
    node.children.forEach(visit)
  }

  visit(model.root)
  return sizes
}