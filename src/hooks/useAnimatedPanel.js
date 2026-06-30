import { useEffect, useState } from 'react'

export const PANEL_TRANSITION_MS = 220

export function useAnimatedPanel(isOpen) {
  const [render, setRender] = useState(isOpen)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRender(true)
      setClosing(false)
      return undefined
    }

    if (!render) return undefined

    setClosing(true)
    const id = window.setTimeout(() => {
      setRender(false)
      setClosing(false)
    }, PANEL_TRANSITION_MS)

    return () => window.clearTimeout(id)
  }, [isOpen, render])

  return {
    render,
    motionClass: closing ? 'is-closing' : 'is-open',
  }
}
