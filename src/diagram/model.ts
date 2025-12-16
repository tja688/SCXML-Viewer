export type NodeKind = 'root' | 'state' | 'parallel' | 'final' | 'history' | 'initial'

export interface DiagramTransition {
  id: string
  source: string
  target: string
  event?: string
  cond?: string
  label?: string
}

export interface DiagramNode {
  id: string
  label: string
  kind: NodeKind
  parentId: string | null
  children: DiagramNode[]
  transitions: DiagramTransition[]
  historyType?: 'shallow' | 'deep'
  depth: number
}

export interface DiagramModel {
  root: DiagramNode
  nodesById: Record<string, DiagramNode>
}

export type LayoutDirection = 'RIGHT' | 'DOWN'
