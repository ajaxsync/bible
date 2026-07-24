import { useEffect, useRef } from 'react'
import { useReadingStamina } from '../context/ReadingStaminaContext.jsx'

/** 连续无交互超过此时长则暂停计时（方案 A：贴近微信读书） */
const ACTIVITY_IDLE_MS = 90_000
const TICK_MS = 1000

/**
 * 阅读页前台有效停留计时：
 * - 每秒若页面可见且近 90 秒内有交互，则 +1 秒
 * - 切后台 / 长时间无操作则停表；满 60 秒打卡，打卡后继续累计、无日上限
 */
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

    const onVisibility = () => {
      if (document.visibilityState === 'visible') markActive()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActivityRef.current > ACTIVITY_IDLE_MS) return
      tickReading(TICK_MS / 1000)
    }, TICK_MS)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      events.forEach((eventName) => {
        window.removeEventListener(eventName, markActive)
      })
    }
  }, [book, chapter, enabled, tickReading, recordChapter])
}
