import { useEffect, useRef } from 'react'
import { useReadingStamina } from '../context/ReadingStaminaContext.jsx'

const ACTIVITY_IDLE_MS = 30_000
const TICK_MS = 1000

export function useReadingDwellTimer({ book, chapter, enabled = true }) {
  const { tickReading, recordChapter } = useReadingStamina()
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (!enabled) return undefined

    recordChapter(book, chapter)

    const markActive = () => {
      lastActivityRef.current = Date.now()
    }

    markActive()

    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart']
    events.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true })
    })

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActivityRef.current > ACTIVITY_IDLE_MS) return
      tickReading(TICK_MS / 1000)
    }, TICK_MS)

    return () => {
      window.clearInterval(intervalId)
      events.forEach((eventName) => {
        window.removeEventListener(eventName, markActive)
      })
    }
  }, [book, chapter, enabled, tickReading, recordChapter])
}
