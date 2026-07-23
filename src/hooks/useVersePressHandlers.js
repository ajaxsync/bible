import { useRef } from 'react'

const LONG_PRESS_MS = 480
const MOVE_THRESHOLD_PX = 12

/**
 * App：长按进入选中；已有选中时短按可切换其他经文。
 * Web：保持单击选中。
 */
export function useVersePressHandlers({
  verseNum,
  isNativeApp,
  hasSelection,
  onVerseClick,
  onVerseLongPress,
}) {
  const timerRef = useRef(null)
  const startRef = useRef(null)
  const longPressFiredRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  if (!isNativeApp) {
    return {
      onClick: (event) => onVerseClick(verseNum, event),
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onVerseClick(verseNum, event)
        }
      },
    }
  }

  return {
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      longPressFiredRef.current = false
      startRef.current = { x: event.clientX, y: event.clientY }
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        longPressFiredRef.current = true
        onVerseLongPress(verseNum, event)
      }, LONG_PRESS_MS)
    },
    onPointerMove: (event) => {
      if (!startRef.current || timerRef.current == null) return
      const dx = Math.abs(event.clientX - startRef.current.x)
      const dy = Math.abs(event.clientY - startRef.current.y)
      if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
        clearTimer()
        startRef.current = null
      }
    },
    onPointerUp: (event) => {
      const firedLongPress = longPressFiredRef.current
      clearTimer()
      startRef.current = null

      if (firedLongPress) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      // 工具条已打开：短按可增删其他经文
      if (hasSelection) {
        event.preventDefault()
        event.stopPropagation()
        onVerseClick(verseNum, event)
      }
    },
    onPointerCancel: () => {
      clearTimer()
      startRef.current = null
    },
    onContextMenu: (event) => {
      event.preventDefault()
    },
    onClick: (event) => {
      // 长按后系统仍可能派发 click：拦截，避免关选中 / 二次 toggle
      event.preventDefault()
      event.stopPropagation()
      longPressFiredRef.current = false
    },
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (hasSelection) onVerseClick(verseNum, event)
        else onVerseLongPress(verseNum, event)
      }
    },
  }
}
