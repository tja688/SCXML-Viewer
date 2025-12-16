import { XMLParser } from 'fast-xml-parser'
import type { DiagramModel, DiagramNode, DiagramTransition, NodeKind } from './model'

const ARRAY_TAGS = new Set(['state', 'parallel', 'final', 'history', 'transition', 'initial'])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  trimValues: true,
  parseTagValue: false,
  removeNSPrefix: true,
  isArray: (name: string) => ARRAY_TAGS.has(name),
})

const toArray = <T,>(input?: T | T[]): T[] => {
  if (!input) return []
  return Array.isArray(input) ? input : [input]
}

const attr = (node: RawNode | undefined, name: string): string | undefined => {
  if (!node) return undefined
  const value = node[`@_${name}`]
  if (value === undefined || value === null) {
    return undefined
  }
  return typeof value === 'string' ? value : String(value)
}

const splitTargets = (value?: string) =>
  value
    ?.split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean) ?? []

export interface ParseSuccess {
  ok: true
  model: DiagramModel
  warnings: string[]
}

export interface ParseFailure {
  ok: false
  error: string
  warnings: string[]
}

export type ParseResult = ParseSuccess | ParseFailure

interface RawNode {
  [key: string]: unknown
}

let autoNodeCounter = 0
let autoInitialCounter = 0
let transitionCounter = 0

const createNodeId = (kind: NodeKind) => `${kind}-${++autoNodeCounter}`
const createInitialId = (parentId: string) => `${parentId}-initial-${++autoInitialCounter}`

export const parseScxml = (xml: string): ParseResult => {
  autoNodeCounter = 0
  autoInitialCounter = 0
  transitionCounter = 0
  const warnings: string[] = []

  let tree: unknown
  try {
    tree = parser.parse(xml)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to parse SCXML',
      warnings,
    }
  }

  if (!tree || typeof tree !== 'object' || !('scxml' in tree)) {
    return { ok: false, error: 'Missing <scxml> root element', warnings }
  }

  const scxml = (tree as Record<string, unknown>).scxml as RawNode | RawNode[] | undefined
  if (!scxml) {
    return { ok: false, error: 'Missing <scxml> root element', warnings }
  }

  const scxmlNode = Array.isArray(scxml) ? scxml[0] : scxml
  const nodesById: Record<string, DiagramNode> = {}

  const registerNode = (node: DiagramNode) => {
    nodesById[node.id] = node
    return node
  }

  const buildTransitionLabel = (event?: string | null, cond?: string | null) => {
    const parts: string[] = []
    if (event) parts.push(event)
    if (cond) parts.push(`if ${cond}`)
    return parts.join(' / ')
  }

  const buildTransitions = (rawTransitions: RawNode | RawNode[] | undefined, sourceId: string) => {
    const transitions: DiagramTransition[] = []
    toArray(rawTransitions as RawNode[] | undefined).forEach((raw) => {
      const targets = splitTargets(attr(raw, 'target'))
      if (!targets.length) {
        return
      }
      const event = attr(raw, 'event')
      const cond = attr(raw, 'cond')
      const label = buildTransitionLabel(event, cond)
      targets.forEach((targetId) => {
        transitions.push({
          id: `t-${++transitionCounter}`,
          source: sourceId,
          target: targetId,
          event: event || undefined,
          cond: cond || undefined,
          label: label || undefined,
        })
      })
    })
    return transitions
  }

  const buildInitialNodeFromTargets = (parentId: string, depth: number, targets: string[], label = 'Initial') => {
    if (!targets.length) {
      return null
    }
    const node: DiagramNode = {
      id: createInitialId(parentId),
      label,
      kind: 'initial',
      parentId,
      children: [],
      transitions: [],
      depth,
    }
    node.transitions = targets.map((target) => ({
      id: `t-${++transitionCounter}`,
      source: node.id,
      target,
      label: undefined,
    }))
    return registerNode(node)
  }

  const parseHistoryNode = (raw: RawNode, parentId: string, depth: number) => {
    const proposedId = attr(raw, 'id')
    const id = proposedId || createNodeId('history')
    if (!proposedId) {
      warnings.push('History node missing id; generated placeholder')
    }
    const node: DiagramNode = {
      id,
      label: proposedId || 'History',
      kind: 'history',
      parentId,
      children: [],
      transitions: [],
      historyType: attr(raw, 'type') === 'deep' ? 'deep' : 'shallow',
      depth,
    }
    node.transitions = buildTransitions(raw.transition as RawNode[] | undefined, id)
    return registerNode(node)
  }

  const parseFinalNode = (raw: RawNode, parentId: string, depth: number) => {
    const proposedId = attr(raw, 'id')
    const id = proposedId || createNodeId('final')
    if (!proposedId) {
      warnings.push('Final node missing id; generated placeholder')
    }
    const node: DiagramNode = {
      id,
      label: proposedId || 'Final',
      kind: 'final',
      parentId,
      children: [],
      transitions: [],
      depth,
    }
    node.transitions = buildTransitions(raw.transition as RawNode[] | undefined, id)
    return registerNode(node)
  }

  const parseContainer = (raw: RawNode, kind: NodeKind, parentId: string, depth: number): DiagramNode => {
    const proposedId = attr(raw, 'id') || attr(raw, 'name')
    const id = proposedId || createNodeId(kind)
    if (!proposedId) {
      warnings.push(`Node <${kind}> missing id; generated ${id}`)
    }

    const node: DiagramNode = {
      id,
      label: proposedId || (kind === 'parallel' ? 'Parallel' : 'State'),
      kind,
      parentId,
      children: [],
      transitions: [],
      depth,
    }
    registerNode(node)
    node.transitions = buildTransitions(raw.transition as RawNode[] | undefined, id)
    const childDepth = depth + 1
    const children: DiagramNode[] = []

    const attrInitialTargets = splitTargets(attr(raw, 'initial'))
    const attrInitialNode = buildInitialNodeFromTargets(id, childDepth, attrInitialTargets)
    if (attrInitialNode) {
      children.push(attrInitialNode)
    }

    toArray(raw.initial as RawNode[] | undefined).forEach((initialRaw) => {
      const inlineId = attr(initialRaw, 'id') || createInitialId(id)
      const initialNode: DiagramNode = {
        id: inlineId,
        label: attr(initialRaw, 'id') || 'Initial',
        kind: 'initial',
        parentId: id,
        children: [],
        transitions: [],
        depth: childDepth,
      }
      registerNode(initialNode)
      const initialTransitions = buildTransitions(initialRaw.transition as RawNode[] | undefined, inlineId)
      if (initialTransitions.length) {
        initialNode.transitions = initialTransitions
      } else {
        const fallbackTargets = splitTargets(attr(initialRaw, 'target'))
        if (fallbackTargets.length) {
          initialNode.transitions = fallbackTargets.map((target) => ({
            id: `t-${++transitionCounter}`,
            source: inlineId,
            target,
          }))
        } else {
          warnings.push(`Initial node ${inlineId} missing transition target`)
        }
      }
      children.push(initialNode)
    })

    toArray(raw.state as RawNode[] | undefined).forEach((child) => {
      children.push(parseContainer(child, 'state', id, childDepth))
    })
    toArray(raw.parallel as RawNode[] | undefined).forEach((child) => {
      children.push(parseContainer(child, 'parallel', id, childDepth))
    })
    toArray(raw.final as RawNode[] | undefined).forEach((child) => {
      children.push(parseFinalNode(child, id, childDepth))
    })
    toArray(raw.history as RawNode[] | undefined).forEach((child) => {
      children.push(parseHistoryNode(child, id, childDepth))
    })

    node.children = children
    return node
  }

  const rootId = attr(scxmlNode, 'id') || 'root'
  const rootLabel = attr(scxmlNode, 'name') || rootId
  const root: DiagramNode = {
    id: rootId,
    label: rootLabel,
    kind: 'root',
    parentId: null,
    children: [],
    transitions: [],
    depth: 0,
  }
  registerNode(root)

  const rootChildren: DiagramNode[] = []
  const rootInitialTargets = splitTargets(attr(scxmlNode, 'initial'))
  const initialNode = buildInitialNodeFromTargets(rootId, 1, rootInitialTargets)
  if (initialNode) {
    rootChildren.push(initialNode)
  }

  toArray(scxmlNode.initial as RawNode[] | undefined).forEach((child) => {
    const inlineId = attr(child, 'id') || createInitialId(rootId)
    const inlineInitial: DiagramNode = {
      id: inlineId,
      label: attr(child, 'id') || 'Initial',
      kind: 'initial',
      parentId: rootId,
      children: [],
      transitions: [],
      depth: 1,
    }
    registerNode(inlineInitial)
    const transitions = buildTransitions(child.transition as RawNode[] | undefined, inlineId)
    if (transitions.length) {
      inlineInitial.transitions = transitions
    } else {
      const fallbackTargets = splitTargets(attr(child, 'target'))
      inlineInitial.transitions = fallbackTargets.map((target) => ({
        id: `t-${++transitionCounter}`,
        source: inlineId,
        target,
      }))
    }
    rootChildren.push(inlineInitial)
  })

  toArray(scxmlNode.state as RawNode[] | undefined).forEach((stateRaw) => {
    rootChildren.push(parseContainer(stateRaw, 'state', rootId, 1))
  })
  toArray(scxmlNode.parallel as RawNode[] | undefined).forEach((parallelRaw) => {
    rootChildren.push(parseContainer(parallelRaw, 'parallel', rootId, 1))
  })
  toArray(scxmlNode.final as RawNode[] | undefined).forEach((finalRaw) => {
    rootChildren.push(parseFinalNode(finalRaw, rootId, 1))
  })
  toArray(scxmlNode.history as RawNode[] | undefined).forEach((historyRaw) => {
    rootChildren.push(parseHistoryNode(historyRaw, rootId, 1))
  })

  root.children = rootChildren
  root.transitions = buildTransitions(scxmlNode.transition as RawNode[] | undefined, rootId)

  return {
    ok: true,
    model: {
      root,
      nodesById,
    },
    warnings,
  }
}