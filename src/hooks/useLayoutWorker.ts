import { useEffect, useMemo, useRef, useState } from 'react'
import type { ElkNode } from 'elkjs'
import { elk } from '../diagram/elkClient'

export interface LayoutState {
  layout: ElkNode | null
  isComputing: boolean
  error?: string
}

export const useLayoutWorker = (graph: ElkNode | null) => {
  const latestRequestId = useRef(0)
  const [state, setState] = useState<LayoutState>({ layout: null, isComputing: false })

  useEffect(() => {
    const schedule = (fn: () => void) => {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(fn)
        return
      }
      Promise.resolve().then(fn)
    }

    if (!graph) {
      schedule(() => setState((prev) => ({ ...prev, isComputing: false })))
      return
    }
    const requestId = ++latestRequestId.current
    schedule(() => setState((prev) => ({ ...prev, isComputing: true, error: undefined })))
    let cancelled = false

    elk
      .layout(graph)
      .then((layout) => {
        if (cancelled || requestId !== latestRequestId.current) {
          return
        }
        setState({ layout, isComputing: false, error: undefined })
      })
      .catch((error) => {
        if (cancelled || requestId !== latestRequestId.current) {
          return
        }
        setState((prev) => ({
          ...prev,
          isComputing: false,
          error: error instanceof Error ? error.message : 'Layout failed',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [graph])

  return useMemo(() => ({ layout: state.layout, isComputing: state.isComputing, error: state.error }), [state])
}
