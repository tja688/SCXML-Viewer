import { useCallback, useRef, useState } from 'react'

export interface Size {
  width: number
  height: number
}

export const useResizeObserver = <T extends HTMLElement>() => {
  const observerRef = useRef<ResizeObserver | null>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const targetRef = useRef<T | null>(null)

  const cleanup = () => {
    observerRef.current?.disconnect()
    observerRef.current = null
  }

  const setRef = useCallback((node: T | null) => {
    if (targetRef.current === node) {
      return
    }
    cleanup()
    targetRef.current = node
    if (!node) {
      return
    }
    observerRef.current = new ResizeObserver(([entry]) => {
      const box = entry.contentBoxSize?.[0]
      if (box) {
        setSize({ width: box.inlineSize, height: box.blockSize })
        return
      }
      const rect = entry.contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observerRef.current.observe(node)
  }, [])

  return { ref: setRef as (node: T | null) => void, size }
}
