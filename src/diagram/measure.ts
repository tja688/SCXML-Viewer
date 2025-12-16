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

const BASE_WIDTH = 160
const BASE_HEIGHT = 64
const HEADER_HEIGHT = 36
const LABEL_LEFT = 16
const LABEL_RIGHT = 20
const BODY_PADDING_X = 22
const BODY_PADDING_Y = 16

const circleNode = (size: number): NodeSizeMetadata => ({
  width: size,
  height: size,
  headerHeight: 0,
  padding: { top: 8, right: 8, bottom: 8, left: 8 },
  isContainer: false,
})

const computeNodeSize = (node: DiagramNode, measureText: TextMeasurer): NodeSizeMetadata => {
  if (node.kind === 'initial') {
    return circleNode(28)
  }
  if (node.kind === 'final') {
    return circleNode(40)
  }
  if (node.kind === 'history') {
    return circleNode(32)
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

  return {
    width,
    height: Math.max(BASE_HEIGHT + HEADER_HEIGHT, HEADER_HEIGHT + 140),
    headerHeight: HEADER_HEIGHT,
    padding: { top: HEADER_HEIGHT + 18, right: 26, bottom: 26, left: 26 },
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
